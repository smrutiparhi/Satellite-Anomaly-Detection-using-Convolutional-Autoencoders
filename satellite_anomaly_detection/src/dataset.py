"""Reproducible, disjoint train/validation/calibration/test partitions."""
import hashlib
from pathlib import Path

import torch
from torch.utils.data import DataLoader, Subset
from torchvision import datasets, transforms


def image_transform(augment=False, img_size=128):
    operations = [transforms.Resize((img_size, img_size), antialias=True)]
    if augment:
        operations += [transforms.RandomHorizontalFlip(), transforms.RandomVerticalFlip()]
    return transforms.Compose(operations + [transforms.ToTensor()])


def get_dataloaders(data_dir, batch_size=32, seed=42, normal_class="Normal",
                    anomaly_class="Anomaly", manifest=None):
    root = Path(data_dir).resolve()
    dataset = datasets.ImageFolder(root, transform=image_transform())
    for name in (normal_class, anomaly_class):
        if name not in dataset.class_to_idx:
            raise ValueError(f"Required class {name!r} missing; found {dataset.classes}")
    if normal_class == anomaly_class:
        raise ValueError("Normal and anomaly classes must differ")
    normal_id = dataset.class_to_idx[normal_class]
    anomaly_id = dataset.class_to_idx[anomaly_class]
    selected = [i for i, (_, label) in enumerate(dataset.samples)
                if label in (normal_id, anomaly_id)]
    # Group identical files so duplicates cannot cross split boundaries.
    groups = {normal_id: {}, anomaly_id: {}}
    seen_labels = {}
    fingerprints = {}
    for i in selected:
        path, label = dataset.samples[i]
        digest = hashlib.sha256(Path(path).read_bytes()).hexdigest()
        if digest in seen_labels and seen_labels[digest] != label:
            raise ValueError("Identical image appears in both normal and anomaly classes")
        seen_labels[digest] = label
        groups[label].setdefault(digest, []).append(i)
        fingerprints[Path(path).relative_to(root).as_posix()] = digest
    generator = torch.Generator().manual_seed(seed)
    if manifest is None:
        normal_groups = list(groups[normal_id].values())
        if len(normal_groups) < 10 or len(groups[anomaly_id]) < 1:
            raise ValueError("Need at least 10 distinct normal images and 1 anomaly image")
        order = torch.randperm(len(normal_groups), generator=generator).tolist()
        normal_groups = [normal_groups[i] for i in order]
        n = len(normal_groups)
        a, b, c = int(n * .6), int(n * .75), int(n * .9)
        flatten = lambda values: [i for group in values for i in group]
        splits = {"train": flatten(normal_groups[:a]),
                  "validation": flatten(normal_groups[a:b]),
                  "calibration": flatten(normal_groups[b:c]),
                  "test": flatten(normal_groups[c:]) + flatten(list(groups[anomaly_id].values()))}
        manifest = {"seed": seed, "normal_class": normal_class, "anomaly_class": anomaly_class,
                    "fingerprints": fingerprints,
                    "splits": {key: [Path(dataset.samples[i][0]).relative_to(root).as_posix()
                                      for i in values] for key, values in splits.items()}}
    else:
        if (manifest["normal_class"], manifest["anomaly_class"]) != (normal_class, anomaly_class):
            raise ValueError("Dataset class mapping differs from checkpoint")
        if manifest["fingerprints"] != fingerprints:
            raise ValueError("Dataset changed since training; use the original dataset or retrain")
        by_path = {Path(path).relative_to(root).as_posix(): i
                   for i, (path, _) in enumerate(dataset.samples)}
        splits = {key: [by_path[path] for path in paths]
                  for key, paths in manifest["splits"].items()}
    augmented = datasets.ImageFolder(root, transform=image_transform(augment=True))
    loaders = {key: DataLoader(Subset(augmented if key == "train" else dataset, values),
                              batch_size=batch_size, shuffle=key == "train",
                              num_workers=0, generator=generator)
               for key, values in splits.items()}
    return loaders, manifest, normal_id
