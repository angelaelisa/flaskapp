# --- Flask imports ---
from flask import request, jsonify

# --- App imports ---
from app.config import UPLOAD_FOLDER

# --- TQEC imports ---
from tqec import BlockGraph, Position3D, Direction3D
from tqec.computation.cube import cube_kind_from_string
from tqec.interop.collada.read_write import write_block_graph_to_dae_file

# --- Standard library ---
import os


def edit_routes(app):
    @app.route("/add_cube_directionally", methods=["POST"])
    def add_cube_directionally():
        data = request.get_json()
        base = data.get("base_cube")
        direction = data.get("direction")
        kind = data.get("kind")
        label = data.get("label")

        try:
            x, y, z = map(int, base.strip("()").split(","))
            dir_map = {
                "X+": (1, 0, 0),
                "X-": (-1, 0, 0),
                "Y+": (0, 1, 0),
                "Y-": (0, -1, 0),
                "Z+": (0, 0, 1),
                "Z-": (0, 0, -1),
            }
            dx, dy, dz = dir_map[direction]
            new_pos = Position3D(x + dx, y + dy, z + dz)
            base_pos = Position3D(x, y, z)

            working_path = os.path.join(UPLOAD_FOLDER, "working.dae")
            if not os.path.exists(working_path):
                return jsonify({"error": "❌ No working.dae found."}), 400

            bg = BlockGraph.from_dae_file(working_path)

            if any(c.position == new_pos for c in bg.cubes):
                return (
                    jsonify({"error": f"❌ Position {new_pos} already occupied."}),
                    400,
                )

            bg.add_cube(new_pos, kind, label)
            bg.add_pipe(base_pos, new_pos)
            write_block_graph_to_dae_file(bg, working_path)

            return jsonify(
                {
                    "message": f"✅ Cube added at {new_pos} with label '{label}'.",
                    "cubes": [
                        {
                            "kind": str(c.kind),
                            "position": str(c.position),
                            "label": str(c.label),
                        }
                        for c in bg.cubes
                    ],
                }
            )

        except Exception as e:
            return jsonify({"error": f"❌ {str(e)}"}), 400

    @app.route("/remove_cube", methods=["POST"])
    def remove_cube():
        data = request.get_json()
        pos_str = data.get("position")
        if not pos_str:
            return jsonify({"error": "❌ No position provided"}), 400

        try:
            x, y, z = map(int, pos_str.strip("()").split(","))
            pos = Position3D(x, y, z)

            working_path = os.path.join(UPLOAD_FOLDER, "working.dae")
            if not os.path.exists(working_path):
                return jsonify({"error": "❌ working.dae not found."}), 400

            bg = BlockGraph.from_dae_file(working_path)

            if not any(c.position == pos for c in bg.cubes):
                return jsonify({"error": "❌ Cube not found at position."}), 400

            bg.remove_cube(pos)
            write_block_graph_to_dae_file(bg, working_path)

            return jsonify({"message": f"✅ Cube at {pos} removed."})

        except Exception as e:
            return jsonify({"error": f"❌ {str(e)}"}), 400

    @app.route("/rotate_blockgraph", methods=["POST"])
    def rotate_blockgraph():
        data = request.get_json()
        axis = data.get("axis")

        if axis not in ["X", "Y", "Z"]:
            return jsonify({"error": "❌ Invalid axis."}), 400

        working_path = os.path.join(UPLOAD_FOLDER, "working.dae")
        if not os.path.exists(working_path):
            return jsonify({"error": "❌ working.dae not found."}), 400

        bg = BlockGraph.from_dae_file(working_path)
        rotated = bg.rotate(Direction3D[axis])
        write_block_graph_to_dae_file(rotated, working_path)

        return jsonify({"message": f"✅ Rotated around {axis}."})

    @app.route("/get_ports")
    def get_ports():
        working_path = os.path.join(UPLOAD_FOLDER, "working.dae")
        if not os.path.exists(working_path):
            return jsonify({"ports": []})

        graph = BlockGraph.from_dae_file(working_path)

        ports = [
            {"label": label, "position": str(pos)} for label, pos in graph.ports.items()
        ]
        return jsonify({"ports": ports})

    @app.route("/fill_ports", methods=["POST"])
    def fill_ports():
        try:
            data = request.get_json()
            fill_data = data.get("fill")

            if not fill_data:
                return jsonify({"success": False, "error": "Missing fill data."}), 400

            working_path = os.path.join(UPLOAD_FOLDER, "working.dae")
            if not os.path.exists(working_path):
                return (
                    jsonify({"success": False, "error": "No working.dae loaded."}),
                    400,
                )

            graph = BlockGraph.from_dae_file(working_path)

            converted_fill = {
                label: cube_kind_from_string(kind_str)
                for label, kind_str in fill_data.items()
            }

            graph.fill_ports(converted_fill)
            write_block_graph_to_dae_file(graph, working_path)

            return jsonify(
                {"success": True, "message": f"Filled {len(converted_fill)} ports."}
            )

        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500

    @app.route("/fill_minimal", methods=["POST"])
    def fill_minimal():
        try:
            data = request.get_json()
            index = int(data.get("index", 0))  # default to 0 if not provided

            working_path = os.path.join(UPLOAD_FOLDER, "working.dae")
            if not os.path.exists(working_path):
                return (
                    jsonify({"success": False, "error": "No working.dae found."}),
                    400,
                )

            block_graph = BlockGraph.from_dae_file(working_path)
            filled_graphs = block_graph.fill_ports_for_minimal_simulation()

            if not filled_graphs:
                return (
                    jsonify({"success": False, "error": "No filled graphs returned."}),
                    400,
                )

            if index >= len(filled_graphs):
                return (
                    jsonify(
                        {"success": False, "error": f"Index {index} out of range."}
                    ),
                    400,
                )

            chosen_graph = filled_graphs[index].graph

            # Save it back to working.dae
            from tqec.interop.collada.read_write import write_block_graph_to_dae_file

            write_block_graph_to_dae_file(chosen_graph, working_path)

            return jsonify(
                {
                    "success": True,
                    "message": f"Filled using minimal graph at index {index}.",
                    "num_options": len(filled_graphs),
                }
            )

        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500
