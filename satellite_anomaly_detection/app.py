"""Run with: streamlit run satellite_anomaly_detection/app.py."""
from pathlib import Path
import sys

import cv2
import streamlit as st

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from satellite_anomaly_detection.src.detect import AnomalyDetector

st.set_page_config(page_title="Satellite anomaly detection", layout="wide")
st.title("Satellite image anomaly detection")
st.caption("Reconstruction-based novelty scoring. A high score does not identify a specific hazard.")


@st.cache_resource
def load_detector():
    return AnomalyDetector()


try:
    detector = load_detector()
except Exception as error:
    st.error(f"Model unavailable: {error}")
    st.stop()

threshold = st.sidebar.number_input("Anomaly threshold", min_value=0.00000001,
                                    value=detector.threshold, format="%.6f")
uploaded = st.file_uploader("Satellite image", type=["png", "jpg", "jpeg"])
if uploaded:
    try:
        score, label, original, reconstruction, heatmap = detector.predict(uploaded, threshold=threshold)
        st.metric("Result", label, f"MSE: {score:.6f}")
        for col, value, caption in zip(st.columns(3),
                                      (original, reconstruction, cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)),
                                      ("Original", "Reconstruction", "Reconstruction error")):
            col.image(value, caption=caption, use_container_width=True)
    except Exception as error:
        st.error(f"Unable to analyze image: {error}")
