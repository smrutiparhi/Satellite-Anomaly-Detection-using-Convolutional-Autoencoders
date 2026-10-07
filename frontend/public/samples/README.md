# Working analysis samples

These are real EuroSAT RGB tiles from the checkpoint's held-out test partition:

- `forest.jpg`: `Forest/Forest_1224.jpg`, expected Normal with the saved threshold.
- `industrial.jpg`: `Industrial/Industrial_1.jpg`, expected Anomaly with the saved threshold.

They are provided to exercise uploads and inference without needing the full dataset.
The model was trained on Forest imagery; it does not recognize objects, specific hazards,
or arbitrary land-cover classes. These samples are not used to select the threshold.
