"""Create a static evaluation figure from a checkpoint and saved test scores."""
import argparse
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import torch
from sklearn.metrics import ConfusionMatrixDisplay, RocCurveDisplay

from .detect import MODEL_PATH


def create_report(model_path=MODEL_PATH):
    path = Path(model_path)
    checkpoint = torch.load(path, map_location="cpu", weights_only=True)
    with np.load(path.with_suffix(".metrics.scores.npz")) as saved:
        labels, scores = saved["labels"], saved["scores"]
    history = checkpoint["history"]
    threshold = checkpoint["threshold"]
    fig, axes = plt.subplots(2, 2, figsize=(12, 9), layout="constrained")
    manifest = checkpoint["manifest"]
    fig.suptitle(f"Land-cover novelty benchmark\n{manifest['normal_class']} (normal) vs "
                 f"{manifest['anomaly_class']} (anomaly)", fontsize=16)
    for split in ("train", "validation"):
        axes[0, 0].plot([row["epoch"] for row in history], [row[split] for row in history], label=split)
    axes[0, 0].axvline(checkpoint["best_epoch"], color="gray", linestyle=":", label="selected epoch")
    axes[0, 0].set(xlabel="Epoch", ylabel="Mean squared error", yscale="log", title="Training uses only normal imagery")
    axes[0, 0].legend()
    for label, name in ((0, "Normal"), (1, "Anomaly")):
        axes[0, 1].hist(np.log10(np.maximum(scores[labels == label], 1e-12)), bins=35,
                        alpha=.6, density=True, label=name)
    axes[0, 1].axvline(np.log10(threshold), color="black", linestyle="--", label="calibrated threshold")
    axes[0, 1].set(xlabel="log10 reconstruction error", ylabel="Density", title="Untouched test image scores")
    axes[0, 1].legend()
    RocCurveDisplay.from_predictions(labels, scores, ax=axes[1, 0], name="Autoencoder")
    axes[1, 0].plot([0, 1], [0, 1], color="gray", linestyle=":")
    axes[1, 0].set_title("Test ROC curve")
    ConfusionMatrixDisplay.from_predictions(labels, scores > threshold, labels=[0, 1],
                                            display_labels=["Normal", "Anomaly"],
                                            ax=axes[1, 1], colorbar=False, cmap="Blues")
    axes[1, 1].set_title("Fixed calibration threshold")
    output = path.with_suffix(".report.png")
    fig.savefig(output, dpi=160)
    plt.close(fig)
    print(output)
    return output


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model-path", default=str(MODEL_PATH))
    create_report(**vars(parser.parse_args()))
