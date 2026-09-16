"""Run from the repository root: python -m satellite_anomaly_detection.src.train."""
import argparse
import json
import random
from pathlib import Path

import numpy as np
import torch

from .dataset import get_dataloaders
from .detect import ARCHITECTURES, MODEL_PATH, resolve_device


def train_model(data_dir, output=MODEL_PATH, epochs=30, batch_size=32, lr=1e-3,
                seed=42, normal_class="Normal", anomaly_class="Anomaly",
                architecture="compact", device="auto", patience=6, quantile=.95):
    if epochs < 1 or batch_size < 1 or lr <= 0 or patience < 1 or not 0 < quantile < 1:
        raise ValueError("Invalid training configuration")
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.set_num_threads(min(4, torch.get_num_threads()))
    torch.backends.cudnn.benchmark = False
    torch.backends.cudnn.deterministic = True
    device = resolve_device(device)
    loaders, manifest, _ = get_dataloaders(data_dir, batch_size, seed, normal_class, anomaly_class)
    model = ARCHITECTURES[architecture]().to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, patience=2, factor=.5)
    output = Path(output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    best, stale, history = float("inf"), 0, []
    best_state = None
    print(f"Device: {device}; parameters: {sum(p.numel() for p in model.parameters()):,}", flush=True)
    print({key: len(loader.dataset) for key, loader in loaders.items()}, flush=True)
    for epoch in range(1, epochs + 1):
        losses = {}
        for split in ("train", "validation"):
            model.train(split == "train")
            total = 0.
            with torch.set_grad_enabled(split == "train"):
                for images, _ in loaders[split]:
                    images = images.to(device)
                    reconstructed, _ = model(images)
                    loss = (images - reconstructed).square().mean()
                    if not torch.isfinite(loss):
                        raise ValueError("Non-finite loss; training aborted")
                    if split == "train":
                        optimizer.zero_grad(set_to_none=True)
                        loss.backward()
                        torch.nn.utils.clip_grad_norm_(model.parameters(), 5.)
                        optimizer.step()
                    total += loss.item() * len(images)
            losses[split] = total / len(loaders[split].dataset)
        history.append({"epoch": epoch, **losses})
        scheduler.step(losses["validation"])
        print(f"Epoch {epoch}/{epochs}: train={losses['train']:.6f}, val={losses['validation']:.6f}", flush=True)
        if losses["validation"] < best:
            best, stale, best_epoch = losses["validation"], 0, epoch
            best_state = {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}
        else:
            stale += 1
        if stale >= patience:
            break
    model.load_state_dict(best_state)
    model.eval()
    calibration_errors = []
    with torch.inference_mode():
        for images, _ in loaders["calibration"]:
            images = images.to(device)
            reconstruction, _ = model(images)
            calibration_errors.extend((images - reconstruction).square().mean((1, 2, 3)).cpu().tolist())
    threshold = max(float(np.quantile(calibration_errors, quantile, method="higher")), 1e-12)
    checkpoint = {"format_version": 1, "architecture": architecture,
                  "model_state_dict": best_state, "image_size": 128,
                  "threshold": threshold, "calibration_quantile": quantile,
                  "calibration_count": len(calibration_errors), "best_epoch": best_epoch,
                  "best_validation_loss": best, "manifest": manifest, "history": history,
                  "training": {"seed": seed, "lr": lr, "batch_size": batch_size,
                               "requested_epochs": epochs, "patience": patience}}
    temporary = output.with_suffix(".tmp")
    torch.save(checkpoint, temporary)
    temporary.replace(output)
    output.with_suffix(".history.json").write_text(json.dumps(history, indent=2), encoding="utf-8")
    print(f"Saved {output}; threshold={threshold:.6f}; best epoch={best_epoch}", flush=True)
    return output


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", required=True)
    parser.add_argument("--output", default=str(MODEL_PATH))
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--normal-class", default="Normal")
    parser.add_argument("--anomaly-class", default="Anomaly")
    parser.add_argument("--architecture", choices=list(ARCHITECTURES), default="compact")
    parser.add_argument("--device", default="auto")
    parser.add_argument("--patience", type=int, default=6)
    parser.add_argument("--quantile", type=float, default=.95)
    train_model(**vars(parser.parse_args()))
