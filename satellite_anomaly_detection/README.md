# Satellite anomaly detection

A reproducible convolutional-autoencoder pipeline with calibrated inference. Run all commands below from the repository root. Python 3.10+ is required.

## Install

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r satellite_anomaly_detection/requirements.txt
```

Activate the environment or replace `python` in subsequent commands with its executable. The existing local environment used for verification is `R:/PDNC_PBL/.venv/Scripts/python.exe`.

## Train

For an ImageFolder dataset with `Normal/` and `Anomaly/` subdirectories:

```powershell
python -m satellite_anomaly_detection.src.train --data-dir path/to/data --epochs 30
```

For the local EuroSAT dataset:

```powershell
python -m satellite_anomaly_detection.src.train --data-dir R:/PDNC_PBL/EuroSAT_RGB/EuroSAT_RGB --normal-class Forest --anomaly-class Industrial --epochs 20
```

Only the two named classes are used. This is a **Forest versus Industrial land-cover novelty benchmark**. Industrial scenes are not evidence of illegal activity, and this experiment does not validate oil-spill or deforestation detection. Evaluate with representative, independently labeled imagery before making those claims. Reconstruction heatmaps show reconstruction error, not validated segmentation masks.

The default compact model has 78,235 parameters and a 512-value convolutional bottleneck. `--architecture legacy` selects the original dense autoencoder for a separate comparison. Better reconstruction alone does not guarantee better anomaly discrimination.

Normal images are split deterministically into 60% training, 15% validation, 15% calibration, and 10% testing. Anomalies enter only the test set. Byte-identical duplicates are grouped, and cross-class duplicates are rejected. This prevents exact-file leakage; near-duplicates and geographically adjacent scenes still need geographic grouping for a deployment-grade evaluation.

Validation loss selects the best epoch and controls early stopping. A separate calibration partition sets the default threshold to the 95th percentile of normal reconstruction errors. `--quantile` controls the desired calibration operating point; its false-positive rate on future imagery is not guaranteed. Do not tune it against the final test set.

The saved checkpoint contains weights, architecture, threshold, training settings, history, and the complete dataset/split fingerprint manifest. The default output is `satellite_anomaly_detection/models/best_autoencoder.pth`, resolved relative to the source files. Training writes the calibrated checkpoint atomically after successful completion. Use `--output` to keep separate experiments. Legacy raw weight files are rejected because their threshold and training provenance are unknown.

## Evaluate

```powershell
python -m satellite_anomaly_detection.src.evaluate --data-dir R:/PDNC_PBL/EuroSAT_RGB/EuroSAT_RGB
python -m satellite_anomaly_detection.src.report
```

Evaluation reloads the checkpoint's fixed threshold and exact test partition. If selected dataset files have changed, evaluation stops rather than silently changing the test set. Outputs beside the checkpoint include `.metrics.json` and `.scores.npz`. Metrics include ROC-AUC, average precision, precision, recall, F1, balanced accuracy, false-positive rate, and class counts. Because this benchmark has many more anomalies than normals, do not interpret precision without considering its class balance.

## Serve

```powershell
python -m uvicorn satellite_anomaly_detection.api:app --host 127.0.0.1 --port 8000
```

Open http://127.0.0.1:8000/docs to upload an image and inspect the response. `GET /health` returns 503 if a calibrated checkpoint is unavailable. `POST /analyze` accepts a multipart `file` and an optional positive `threshold` query value (at most 1). Omitting the override uses the saved calibration. Overrides are request-local. Images are processed in memory and returned as PNG data URLs; inference is serialized to bound concurrent model execution. Uploads over 10 MiB or 16 million pixels are rejected.

Set `SATELLITE_MODEL_PATH` to use a different checkpoint. Set `CORS_ORIGINS` to a comma-separated list of permitted frontend origins. Defaults permit localhost ports 3000 and 8081.

For an upload UI:

```powershell
python -m streamlit run satellite_anomaly_detection/app.py
```

The Expo app at the repository root remains a starter app; it is not wired to this API. Use the API documentation or Streamlit for model inference.

## Tests

```powershell
python -m pip install -r satellite_anomaly_detection/requirements-dev.txt
python -m unittest satellite_anomaly_detection.tests.test_pipeline -v
```

Tests cover partition/duplicate isolation, data drift, checkpoint validation, zero-error heatmaps, request threshold isolation, invalid/oversized uploads, unavailable-model health, and the complete train/calibrate/save/reload/evaluate path.
