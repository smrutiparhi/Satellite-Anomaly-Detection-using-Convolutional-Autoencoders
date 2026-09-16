import io
import os
from pathlib import Path
import shutil
import tempfile
import unittest
from unittest.mock import patch
from concurrent.futures import ThreadPoolExecutor

import numpy as np
import torch
from PIL import Image
from fastapi.testclient import TestClient

from satellite_anomaly_detection.api import app
from satellite_anomaly_detection.src.dataset import get_dataloaders
from satellite_anomaly_detection.src.detect import AnomalyDetector
from satellite_anomaly_detection.src.model import CompactAutoencoder
from satellite_anomaly_detection.src.train import train_model
from satellite_anomaly_detection.src.evaluate import evaluate_model


class PipelineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        torch.set_num_threads(2)
        cls.temporary = tempfile.TemporaryDirectory()
        cls.root = Path(cls.temporary.name)
        cls.data = cls.root / "data"
        rng = np.random.default_rng(10)
        for name, count in (("Normal", 20), ("Anomaly", 5)):
            folder = cls.data / name
            folder.mkdir(parents=True)
            for i in range(count):
                Image.fromarray(rng.integers(0, 256, (16, 16, 3), dtype=np.uint8)).save(folder / f"{i}.png")
        cls.checkpoint = cls.root / "fixture.pth"
        # Zero weights reconstruct exactly 0.5, allowing deterministic score assertions.
        model = CompactAutoencoder()
        for parameter in model.parameters():
            parameter.data.zero_()
        torch.save({"format_version": 1, "architecture": "compact", "threshold": .1,
                    "model_state_dict": model.state_dict()}, cls.checkpoint)

    @classmethod
    def tearDownClass(cls):
        cls.temporary.cleanup()

    def test_disjoint_reproducible_splits_and_duplicate_isolation(self):
        duplicate = self.data / "Normal" / "duplicate.png"
        shutil.copyfile(self.data / "Normal" / "0.png", duplicate)
        try:
            loaders, manifest, normal_id = get_dataloaders(self.data)
            _, repeated, _ = get_dataloaders(self.data)
            self.assertEqual(manifest, repeated)
            partitions = [set(values) for values in manifest["splits"].values()]
            for i, group in enumerate(partitions):
                for other in partitions[i + 1:]:
                    self.assertFalse(group & other)
            content_groups = [{manifest["fingerprints"][path] for path in paths} for paths in partitions]
            for i, group in enumerate(content_groups):
                for other in content_groups[i + 1:]:
                    self.assertFalse(group & other)
            for split in ("train", "validation", "calibration"):
                for _, labels in loaders[split]:
                    self.assertTrue((labels == normal_id).all())
        finally:
            duplicate.unlink()

    def test_missing_class_and_changed_dataset_rejected(self):
        with self.assertRaises(ValueError):
            get_dataloaders(self.data, normal_class="Missing")
        _, manifest, _ = get_dataloaders(self.data)
        manifest["fingerprints"]["Normal/0.png"] = "changed"
        with self.assertRaisesRegex(ValueError, "Dataset changed"):
            get_dataloaders(self.data, manifest=manifest)

    def test_missing_and_uncalibrated_weights_rejected(self):
        with self.assertRaises(FileNotFoundError):
            AnomalyDetector(self.root / "absent.pth")
        legacy = self.root / "legacy.pth"
        torch.save(CompactAutoencoder().state_dict(), legacy)
        with self.assertRaisesRegex(ValueError, "Uncalibrated"):
            AnomalyDetector(legacy)

    def test_score_override_and_zero_error_heatmap(self):
        detector = AnomalyDetector(self.checkpoint)
        black = Image.new("RGB", (128, 128))
        score, label, *_ = detector.predict(black)
        self.assertAlmostEqual(score, .25)
        self.assertEqual(label, "Anomaly")
        self.assertEqual(detector.predict(black, threshold=.3)[1], "Normal")
        self.assertEqual(detector.threshold, .1)
        for invalid in (0, -1, float("nan"), float("inf")):
            with self.assertRaises(ValueError):
                detector.predict(black, threshold=invalid)
        detector.transform = lambda image: torch.full((3, 128, 128), .5)
        score, _, _, _, heatmap = detector.predict(black)
        self.assertEqual(score, 0)
        self.assertTrue(np.isfinite(heatmap).all())

    def test_api_validation_and_concurrent_threshold_isolation(self):
        image = io.BytesIO()
        Image.new("RGB", (32, 32)).save(image, format="PNG")
        with patch.dict(os.environ, {"SATELLITE_MODEL_PATH": str(self.checkpoint)}):
            with TestClient(app) as client:
                self.assertEqual(client.get("/health").status_code, 200)
                self.assertEqual(client.post("/analyze", files={"file": ("bad.png", b"bad")}).status_code, 400)
                for value in ("0", "-1", "nan", "inf"):
                    self.assertEqual(client.post(f"/analyze?threshold={value}", files={"file": ("x.png", image.getvalue())}).status_code, 422)
                self.assertEqual(client.post("/analyze", files={"file": ("large.png", b"x" * (10 * 1024 * 1024 + 1))}).status_code, 413)
                def send(threshold):
                    return client.post(f"/analyze?threshold={threshold}",
                                       files={"file": ("x.png", image.getvalue())}).json()
                with ThreadPoolExecutor(max_workers=2) as pool:
                    results = list(pool.map(send, [.1, .3]))
                self.assertEqual([r["label"] for r in results], ["Anomaly", "Normal"])
                self.assertEqual(app.state.detector.threshold, .1)
                self.assertTrue(results[0]["images"]["heatmap"].startswith("data:image/png;base64,"))

    def test_unavailable_model_health_and_prediction(self):
        with patch.dict(os.environ, {"SATELLITE_MODEL_PATH": str(self.root / "absent.pth")}):
            with TestClient(app) as client:
                self.assertEqual(client.get("/health").status_code, 503)
                self.assertEqual(client.post("/analyze", files={"file": ("x.png", b"x")}).status_code, 503)

    def test_train_calibrate_reload_evaluate(self):
        path = self.root / "trained.pth"
        train_model(self.data, output=path, epochs=1, batch_size=4, device="cpu")
        detector = AnomalyDetector(path)
        self.assertGreater(detector.threshold, 0)
        metrics = evaluate_model(self.data, model_path=path, device="cpu")
        self.assertEqual(metrics["test_normal_count"], 2)
        self.assertEqual(metrics["test_anomaly_count"], 5)
        self.assertEqual(metrics["threshold"], detector.threshold)


if __name__ == "__main__":
    unittest.main()
