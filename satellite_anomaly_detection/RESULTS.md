# Verified local benchmark

Run completed on 2026-09-16 with Python 3.13, PyTorch 2.10.0 CPU, torchvision 0.25.0, and scikit-learn 1.8.0.

## Dataset and model

- Local EuroSAT RGB: Forest is normal, Industrial is anomalous; other classes are excluded.
- 1,800 normal training images, 450 normal validation images, 450 normal calibration images.
- Untouched test set: 300 normal images and 2,500 anomaly images.
- Seed 42; compact convolutional autoencoder; 78,235 parameters; batch size 32; Adam learning rate 0.001.
- 20 training epochs; epoch 20 selected by lowest validation MSE (approximately 0.000162).
- Threshold: **0.00048279084148816764**, calibrated once using the 95th percentile of normal calibration errors.
- No test-set threshold tuning or architecture search was performed.

## Test results

| Metric | Result |
| --- | ---: |
| ROC-AUC | 1.0000 |
| Average precision | 1.0000 |
| Precision | 99.40% |
| Recall | 100.00% |
| F1 | 99.70% |
| Balanced accuracy | 97.50% |
| Normal false-positive rate | 5.00% |

| Actual / predicted | Normal | Anomaly |
| --- | ---: | ---: |
| Normal | 285 | 15 |
| Anomaly | 0 | 2,500 |

These results show strong separation on this specific land-cover benchmark. They do **not** establish perfect real-world detection. Forest and Industrial are visually distinct classes, the test set is anomaly-heavy, and the random image split is not a geographic holdout. Byte-identical duplicates cannot cross partitions, but geographic overlap and near-duplicate imagery have not been ruled out. Specific hazard detection requires relevant labeled test data and geographically independent evaluation.

## Operational verification

- Seven regression tests passed, including split isolation, data drift rejection, missing/uncalibrated weights, concurrent request thresholds, upload validation, zero-error heatmaps, and end-to-end training/evaluation.
- Live API health returned a loaded, calibrated model.
- Real held-out Forest and Industrial images were uploaded successfully and received Normal and Anomaly labels respectively.
- Streamlit initialized with the trained checkpoint without application errors.
- Python source parsing, dependency consistency (`pip check`), and Git whitespace checks passed.

## Local artifacts

- `models/best_autoencoder.pth`: weights, calibration, exact split manifest, and training metadata (included in Git).
- `models/best_autoencoder.history.json`: learning history.
- `models/best_autoencoder.metrics.json`: machine-readable metrics.
- `models/best_autoencoder.metrics.scores.npz`: held-out labels and scores (ignored by Git).
- `models/best_autoencoder.report.png`: learning curve, score distribution, ROC, and confusion matrix.

The changes are in `R:/PDNC_PBL-model`, branch `codex/model-reliability`, based on the new repository's main branch. The branch includes the calibrated benchmark checkpoint for immediate inference after dependency installation.
