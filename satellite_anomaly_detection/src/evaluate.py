"""Evaluate exactly the untouched test partition recorded during training."""
import argparse
import json
from pathlib import Path

import numpy as np
import torch
from sklearn.metrics import (average_precision_score, confusion_matrix,
                             precision_recall_fscore_support, roc_auc_score)

from .dataset import get_dataloaders
from .detect import AnomalyDetector, MODEL_PATH


def evaluate_model(data_dir, model_path=MODEL_PATH, output=None, device="auto"):
    torch.set_num_threads(min(4, torch.get_num_threads()))
    detector = AnomalyDetector(model_path, device=device)
    manifest = detector.metadata["manifest"]
    loaders, _, normal_id = get_dataloaders(
        data_dir, normal_class=manifest["normal_class"], anomaly_class=manifest["anomaly_class"],
        manifest=manifest)
    labels, scores = [], []
    for images, targets in loaders["test"]:
        scores.extend(detector.score_batch(images).tolist())
        labels.extend((targets != normal_id).int().tolist())
    labels, scores = np.asarray(labels), np.asarray(scores)
    predictions = scores > detector.threshold
    precision, recall, f1, _ = precision_recall_fscore_support(
        labels, predictions, average="binary", zero_division=0)
    tn, fp, fn, tp = confusion_matrix(labels, predictions, labels=[0, 1]).ravel()
    metrics = {"normal_class": manifest["normal_class"], "anomaly_class": manifest["anomaly_class"],
               "architecture": detector.metadata["architecture"], "threshold": detector.threshold,
               "roc_auc": float(roc_auc_score(labels, scores)),
               "average_precision": float(average_precision_score(labels, scores)),
               "precision": float(precision), "recall": float(recall), "f1": float(f1),
               "normal_false_positive_rate": float(fp / (tn + fp)),
               "balanced_accuracy": float((tp / (tp + fn) + tn / (tn + fp)) / 2),
               "confusion_matrix": [[int(tn), int(fp)], [int(fn), int(tp)]],
               "test_normal_count": int((labels == 0).sum()),
               "test_anomaly_count": int((labels == 1).sum()),
               "split_counts": {k: len(v.dataset) for k, v in loaders.items()},
               "scope": "Land-cover novelty benchmark; not validated for specific hazards."}
    output = Path(output) if output else Path(model_path).with_suffix(".metrics.json")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    np.savez_compressed(output.with_suffix(".scores.npz"), labels=labels, scores=scores)
    print(json.dumps(metrics, indent=2), flush=True)
    return metrics


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", required=True)
    parser.add_argument("--model-path", default=str(MODEL_PATH))
    parser.add_argument("--output")
    parser.add_argument("--device", default="auto")
    evaluate_model(**vars(parser.parse_args()))
