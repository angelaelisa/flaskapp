# --- Standard library ---
import os
from pathlib import Path

# --- TQEC imports ---
from tqec import BlockGraph, NoiseModel, compile_block_graph
from tqec.compile.detectors.database import DetectorDatabase

# --- Constants ---
DETECTOR_DB_FOLDER = Path("detector_databases")
DETECTOR_DB_FOLDER.mkdir(exist_ok=True)


# --- Compilation helper ---
def compile_from_working_dae(selected_surface_index=1, detector_db_name=None):
    working_path = os.path.join("uploads", "working.dae")

    if not os.path.exists(working_path):
        raise FileNotFoundError(
            "❌ working.dae not found. " "Please upload a model first."
        )

    block_graph = BlockGraph.from_dae_file(working_path)
    correlation_surfaces = block_graph.find_correlation_surfaces()

    if len(correlation_surfaces) <= selected_surface_index:
        raise ValueError(
            f"❌ Surface index {selected_surface_index}" " is out of range."
        )

    selected_surface = correlation_surfaces[selected_surface_index]

    # --- Handle detector DB ---
    database = None
    new_detector_filename = None

    if detector_db_name:
        detector_db_path = DETECTOR_DB_FOLDER / detector_db_name

        if detector_db_path.exists():
            print(f"📂 Using existing detector DB: {detector_db_path}")
            database = DetectorDatabase.from_file(detector_db_path)
        else:
            print(f"📁 Creating new detector DB: {detector_db_path}")
            database = DetectorDatabase()
            new_detector_filename = detector_db_path.name  # Save later

    compiled_computation = compile_block_graph(
        block_graph, observables=[selected_surface]
    )

    circuit = compiled_computation.generate_stim_circuit(
        k=2,
        noise_model=NoiseModel.uniform_depolarizing(0.001),
        detector_database=database,
    )

    if detector_db_name and new_detector_filename:
        if not new_detector_filename.endswith(".pkl"):
            new_detector_filename += ".pkl"

        detector_db_path = DETECTOR_DB_FOLDER / new_detector_filename
        database.to_file(detector_db_path)
        print(f"💾 Detector DB saved: {detector_db_path}")

    print(f"✅ Circuit compiled using surface {selected_surface_index}")
    return circuit, new_detector_filename
