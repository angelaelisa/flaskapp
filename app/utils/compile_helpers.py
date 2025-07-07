# --- Standard library ---
import os
from pathlib import Path

# --- TQEC imports ---
from tqec import (
    BlockGraph,
    NoiseModel,
    compile_block_graph,   
)
from tqec.compile.convention import FIXED_BULK_CONVENTION, FIXED_PARITY_CONVENTION
from tqec.utils.paths import DEFAULT_DETECTOR_DATABASE_PATH
from tqec.compile.detectors.database import DetectorDatabase

# --- Constants ---
DETECTOR_DB_FOLDER = Path("detector_databases")

# --- Compilation helper ---
def compile_from_working_dae(
    selected_surface_index,
    compile_convention,
    k,
    noise_p,
    manhattan_radius,
):
    # Validate inputs strictly
    if not isinstance(selected_surface_index, int) or selected_surface_index < 0:
        raise ValueError("❌ selected_surface_index must be a non-negative integer")

    if compile_convention not in ["FIXED_BULK_CONVENTION", "FIXED_PARITY_CONVENTION"]:
       raise ValueError("❌ compile_convention must be 'FIXED_BULK_CONVENTION' or 'FIXED_PARITY_CONVENTION'")

    if not isinstance(k, int) or k <= 0:
        raise ValueError("❌ k must be a positive integer")

    if not isinstance(noise_p, float) or not (0 <= noise_p <= 1):
        raise ValueError("❌ noise_p must be a float between 0 and 1")

    if not isinstance(manhattan_radius, int):
        raise ValueError("❌ manhattan_radius must be an integer")

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

    if compile_convention == "FIXED_BULK_CONVENTION":
        compile_conv = FIXED_BULK_CONVENTION
    else:
        compile_conv = FIXED_PARITY_CONVENTION

    compiled_computation = compile_block_graph(
        block_graph, convention=compile_conv, observables=[selected_surface]
    )

    circuit = compiled_computation.generate_stim_circuit(
        k=k, manhattan_radius=manhattan_radius, noise_model=NoiseModel.uniform_depolarizing(noise_p)
    )

    print(f"✅ Circuit compiled using surface {selected_surface_index}")
    return circuit
