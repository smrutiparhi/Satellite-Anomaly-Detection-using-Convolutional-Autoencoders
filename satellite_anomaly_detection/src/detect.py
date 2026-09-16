"""One inference path for evaluation, API, and interactive use."""
from pathlib import Path

import cv2
import numpy as np
import torch
from PIL import Image, ImageOps

from .dataset import image_transform
from .model import ConvAutoencoder, CompactAutoencoder

MODEL_PATH = Path(__file__).resolve().parents[1] / "models" / "best_autoencoder.pth"
ARCHITECTURES = {"legacy": ConvAutoencoder, "compact": CompactAutoencoder}


def resolve_device(device="auto"):
    if device == "auto":
        device = "cuda" if torch.cuda.is_available() else "cpu"
    if str(device).startswith("cuda") and not torch.cuda.is_available():
        raise ValueError("CUDA requested but unavailable; use --device cpu")
    return torch.device(device)


class AnomalyDetector:
    def __init__(self, model_path=MODEL_PATH, device="auto"):
        self.device = resolve_device(device)
        if self.device.type == "cpu":
            torch.set_num_threads(min(4, torch.get_num_threads()))
        checkpoint = torch.load(model_path, map_location="cpu", weights_only=True)
        if not isinstance(checkpoint, dict) or checkpoint.get("format_version") != 1:
            raise ValueError("Uncalibrated legacy weights. Retrain to create a calibrated checkpoint.")
        self.threshold = float(checkpoint["threshold"])
        if not np.isfinite(self.threshold) or self.threshold <= 0:
            raise ValueError("Checkpoint threshold must be finite and positive")
        self.metadata = {k: v for k, v in checkpoint.items() if k != "model_state_dict"}
        self.model = ARCHITECTURES[checkpoint["architecture"]]().to(self.device)
        self.model.load_state_dict(checkpoint["model_state_dict"])
        self.model.eval()
        self.transform = image_transform()

    @torch.inference_mode()
    def score_batch(self, images):
        images = images.to(self.device)
        reconstructed, _ = self.model(images)
        scores = (images - reconstructed).square().mean(dim=(1, 2, 3))
        if not torch.isfinite(scores).all():
            raise ValueError("Model produced non-finite scores")
        return scores.cpu().numpy()

    @torch.inference_mode()
    def predict(self, image, threshold=None):
        boundary = self.threshold if threshold is None else float(threshold)
        if not np.isfinite(boundary) or boundary <= 0:
            raise ValueError("Threshold must be finite and positive")
        if isinstance(image, Image.Image):
            image = ImageOps.exif_transpose(image).convert("RGB")
        else:
            with Image.open(image) as opened:
                image = ImageOps.exif_transpose(opened).convert("RGB")
        tensor = self.transform(image).unsqueeze(0).to(self.device)
        reconstructed, _ = self.model(tensor)
        errors = (tensor - reconstructed).square().mean(dim=1)[0].cpu().numpy()
        score = float(errors.mean())
        if not np.isfinite(score):
            raise ValueError("Model produced a non-finite score")
        # Fixed calibration-relative scale: comparable between images, safe at zero.
        intensity = np.clip(errors / (3 * boundary), 0, 1)
        heatmap = cv2.applyColorMap((intensity * 255).astype(np.uint8), cv2.COLORMAP_JET)
        original = tensor[0].cpu().permute(1, 2, 0).numpy()
        reconstruction = reconstructed[0].cpu().permute(1, 2, 0).numpy()
        return score, "Anomaly" if score > boundary else "Normal", original, reconstruction, heatmap
