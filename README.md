# Satellite Anomaly Detection using Convolutional Autoencoders

A trainable PyTorch model, calibrated FastAPI inference service, and Streamlit upload interface for satellite-image novelty detection.

## Working model pipeline

See [the model guide](satellite_anomaly_detection/README.md) for installation, training, evaluation, and serving commands.

The [verified local benchmark](satellite_anomaly_detection/RESULTS.md) achieved 99.70% F1 and a 5% normal false-positive rate on held-out EuroSAT Forest versus Industrial images. These results apply only to this benchmark.

- Compact convolutional autoencoder with a 512-value bottleneck; original dense architecture also available.
- Separate training, validation, calibration, and test partitions, with exact-duplicate grouping.
- Saved calibration threshold and dataset fingerprints shared by training, evaluation, and inference.
- Real evaluation metrics on held-out images, plus tests for data isolation and concurrent requests.
- In-memory image uploads, bounded upload sizes, and explicit unavailable-model errors.

The local benchmark uses EuroSAT Forest as normal and Industrial as anomalous. It measures land-cover novelty, not validated detection of oil spills, illegal construction, or deforestation. A reconstruction heatmap is not a hazard segmentation mask.

## Quick start

Run from the repository root with Python 3.10+:

```powershell
python -m pip install -r satellite_anomaly_detection/requirements.txt
python -m satellite_anomaly_detection.src.train --data-dir path/to/EuroSAT_RGB --normal-class Forest --anomaly-class Industrial --epochs 20
python -m satellite_anomaly_detection.src.evaluate --data-dir path/to/EuroSAT_RGB
python -m uvicorn satellite_anomaly_detection.api:app --port 8000
```

Open http://127.0.0.1:8000/docs to analyze an image, or run:

```powershell
python -m streamlit run satellite_anomaly_detection/app.py
```

The calibrated benchmark checkpoint is included, so a fresh clone can run inference after installing dependencies. Datasets and additional checkpoints are excluded from Git. Retraining is optional; the training command above reproduces the benchmark.

## Repository layout

- `satellite_anomaly_detection/`: working model, training/evaluation commands, API, Streamlit interface, and regression tests.
- `app/`, `components/`, `hooks/`, `assets/`: existing Expo starter application. It is not yet connected to model inference.

The previously documented React/Vite dashboard and Express authentication service are absent from this repository's main branch. The model interface above is the supported way to use this implementation.

## Team

<div align="center">

| Name | Roll number |
|:--|:--|
| **N Hemanth** *(Team Lead)* | 2410030028 |
| **Alok Kumar Singh** | 2410030048 |
| **Smruti Ranjan Parhi** | 2410030110 |
| **Arjun** | 2410030114 |

Department of Computer Science & Engineering<br/>
KL University — Hyderabad Campus

</div>

---
