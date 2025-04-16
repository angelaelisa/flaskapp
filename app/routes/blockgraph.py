# --- Flask imports ---
from flask import jsonify, request

# --- TQEC imports ---
from tqec import BlockGraph, Position3D

# --- Standard library ---
import os

UPLOAD_FOLDER = "uploads"


def blockgraph_routes(app):

    @app.route("/get_blockgraph_cubes")
    def get_blockgraph_cubes():
        print("🚀 /get_blockgraph_cubes called")
        working_path = os.path.join(UPLOAD_FOLDER, "working.dae")

        if not os.path.exists(working_path):
            return jsonify({"cubes": []})  # No data if file not loaded

        bg = BlockGraph.from_dae_file(working_path)

        # Create a clean, serializable list of cube data
        cubes = [
            {
                "kind": str(cube.kind),
                "position": str(cube.position),
                "label": str(cube.label),
            }
            for cube in bg.cubes
        ]

        return jsonify({"cubes": cubes})

    @app.route("/get_blockgraph_pipes")
    def get_blockgraph_pipes():
        print("🚀 /get_blockgraph_pipes called")
        working_path = os.path.join(UPLOAD_FOLDER, "working.dae")

        if not os.path.exists(working_path):
            return jsonify({"pipes": []})  # No data if file not loaded

        bg = BlockGraph.from_dae_file(working_path)

        pipes = [
            {"source": str(pipe.u), "target": str(pipe.v), "kind": str(pipe.kind)}
            for pipe in bg.pipes
        ]

        return jsonify({"pipes": pipes})

    @app.route("/create", methods=["POST"])
    def create_blockgraph():
        try:
            data = request.get_json()
            kind = data.get("kind", "ZXX").upper()
            position_str = data.get("position", "")
            label = data.get("label", "").strip()

            # Default position
            if position_str:
                try:
                    x, y, z = map(int, position_str.split(","))
                    position = Position3D(x, y, z)
                except Exception:
                    return (
                        jsonify(
                            {"error": "Invalid position format. Use x,y,z integers."}
                        ),
                        400,
                    )
            else:
                position = Position3D(0, 0, 0)

            # Default label logic
            if kind == "PORT" and not label:
                label = "Port0"
            elif kind != "PORT" and not label:
                label = ""

            graph = BlockGraph("working")
            graph.add_cube(position, kind, label)

            os.makedirs(UPLOAD_FOLDER, exist_ok=True)
            working_path = os.path.join(UPLOAD_FOLDER, "working.dae")
            from tqec.interop.collada.read_write import write_block_graph_to_dae_file

            write_block_graph_to_dae_file(graph, working_path)

            return jsonify({"message": "✅ BlockGraph created from scratch."})
        except Exception as e:
            return jsonify({"error": str(e)}), 500
