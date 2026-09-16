"""Serve with: python -m uvicorn satellite_anomaly_detection.api:app --port 8000."""
import base64
import io
import logging
import os
import threading
from contextlib import asynccontextmanager

import cv2
import numpy as np
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError
from starlette.concurrency import run_in_threadpool

from .src.detect import AnomalyDetector, MODEL_PATH

MAX_BYTES = 10 * 1024 * 1024
MAX_PIXELS = 16_000_000
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app):
    app.state.detector = None
    app.state.inference_lock = threading.Lock()
    try:
        app.state.detector = AnomalyDetector(os.environ.get("SATELLITE_MODEL_PATH", str(MODEL_PATH)))
    except Exception:
        logger.exception("Model unavailable; train a calibrated checkpoint before serving predictions")
    yield


app = FastAPI(title="Satellite Anomaly Detection API", lifespan=lifespan)
app.add_middleware(CORSMiddleware,
                   allow_origins=os.environ.get("CORS_ORIGINS", "http://localhost:3000,http://localhost:8081").split(","),
                   allow_methods=["GET", "POST"], allow_headers=["*"])


def encode_image(array):
    ok, encoded = cv2.imencode(".png", array)
    if not ok:
        raise RuntimeError("Image encoding failed")
    return "data:image/png;base64," + base64.b64encode(encoded).decode("ascii")


def analyze_contents(contents, detector, threshold):
    try:
        with Image.open(io.BytesIO(contents)) as opened:
            if opened.width * opened.height > MAX_PIXELS:
                raise HTTPException(413, "Image exceeds 16 million pixels")
            opened.load()
            image = opened.copy()
    except HTTPException:
        raise
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
        raise HTTPException(400, "Upload a valid, non-corrupt image")
    with app.state.inference_lock:
        score, label, original, reconstruction, heatmap = detector.predict(image, threshold=threshold)
    rgb = lambda value: cv2.cvtColor((np.clip(value, 0, 1) * 255).astype(np.uint8), cv2.COLOR_RGB2BGR)
    return {"score": score, "label": label, "isAnomaly": label == "Anomaly",
            "threshold": detector.threshold if threshold is None else threshold,
            "images": {"original": encode_image(rgb(original)),
                       "reconstructed": encode_image(rgb(reconstruction)),
                       "heatmap": encode_image(heatmap)}}


@app.post("/analyze")
async def analyze_image(file: UploadFile = File(...),
                        threshold: float | None = Query(None, gt=0, le=1)):
    detector = app.state.detector
    if detector is None:
        raise HTTPException(503, "Calibrated model unavailable. Train the model first.")
    contents = await file.read(MAX_BYTES + 1)
    await file.close()
    if len(contents) > MAX_BYTES:
        raise HTTPException(413, "Upload exceeds 10 MiB")
    return await run_in_threadpool(analyze_contents, contents, detector, threshold)


@app.get("/health")
def health():
    detector = app.state.detector
    if detector is None:
        raise HTTPException(503, "Calibrated model unavailable")
    return {"status": "ok", "model_loaded": True, "threshold": detector.threshold,
            "architecture": detector.metadata["architecture"]}
