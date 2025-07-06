# --- Standard library ---
import os
from pathlib import Path

# --- TQEC imports ---
from tqec import BlockGraph, NoiseModel, compile_block_graph

# --- Constants ---
DETECTOR_DB_FOLDER = Path("detector_databases")
DETECTOR_DB_FOLDER.mkdir(exist_ok=True)


# --- Compilation helper ---
def compile_from_working_dae(selected_surface_index=1):
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

    compiled_computation = compile_block_graph(
        block_graph, observables=[selected_surface]
    )

    circuit = compiled_computation.generate_stim_circuit(
        k=2, noise_model=NoiseModel.uniform_depolarizing(0.001)
    )

    print(f"✅ Circuit compiled using surface {selected_surface_index}")
    return circuit
