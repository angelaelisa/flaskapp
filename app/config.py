import os
from pathlib import Path

UPLOAD_FOLDER = "uploads"
STIM_FOLDER = "stim_files"
DETECTOR_DB_FOLDER = Path("detector_databases")
STIM_FOLDER = "stim_files"

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(STIM_FOLDER, exist_ok=True)
DETECTOR_DB_FOLDER.mkdir(exist_ok=True)
