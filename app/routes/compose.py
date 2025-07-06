# --- Flask imports ---
from flask import current_app, request, jsonify

# --- TQEC imports ---
from tqec.interop.collada import (
    read_block_graph_from_dae_file,
    write_block_graph_to_dae_file,
)
from tqec.computation.block_graph import BlockGraph

# --- Standard library ---
import os
from werkzeug.utils import secure_filename

second_graph = None  # Store temporarily

def compose_routes(app):
    global second_graph

    @app.route("/upload_second_blockgraph", methods=["POST"])
    def upload_second_blockgraph():
        file = request.files.get("compose_dae")
        if not file or not file.filename.endswith(".dae"):
            return jsonify({"error": "Please upload a .dae file."}), 400

        filename = secure_filename("second_blockgraph.dae")
        file_path = os.path.join(current_app.config["UPLOAD_FOLDER"], filename)
        file.save(file_path)

        try:
            second_graph = BlockGraph.from_dae_file(file_path)

            relabel_mapping = {
                cube.label: f"{cube.label}_2"
                for cube in second_graph.cubes
                if str(cube.kind) == "PORT" and not cube.label.endswith("_2")
            }

            second_graph = second_graph.relabel_cubes(relabel_mapping)
            write_block_graph_to_dae_file(second_graph, file_path)

            return jsonify({"message": "✅ Second BlockGraph uploaded and relabeled."})
        except Exception as e:
            return jsonify({"error": f"Upload failed: {e}"}), 500
    
    @app.route("/get_second_blockgraph_ports")
    def get_second_blockgraph_ports():
        file_path = os.path.join(current_app.config["UPLOAD_FOLDER"], "second_blockgraph.dae")

        if not os.path.exists(file_path):
            return jsonify({"ports": []}) 

        bg = read_block_graph_from_dae_file(file_path)

        ports = [
            {
                "label": str(cube.label),
                "position": str(cube.position)
            }
            for cube in bg.cubes
            if str(cube.kind) == "PORT"  # Ensure it's a string match, not enum
        ]

        return jsonify({"ports": ports})

    @app.route("/compose_blockgraphs", methods=["POST"])
    def compose_blockgraphs():
        if second_graph is None:
            return jsonify({"error": "Second BlockGraph not uploaded."}), 400

        data = request.get_json()
        main_port = data.get("main_port")
        second_port = data.get("second_port")

        if not main_port or not second_port:
            return jsonify({"error": "Both ports must be selected."}), 400

        try:
            composed = current_app.block_graph.compose(
                second_graph,
                self_port_label=main_port,
                other_port_label=second_port
            )

            output_path = os.path.join(current_app.config["UPLOAD_FOLDER"], "working.dae")
            write_block_graph_to_dae_file(composed, output_path)
            current_app.block_graph = composed

            return jsonify({"message": "✅ BlockGraphs composed successfully."})
        except Exception as e:
            return jsonify({"error": str(e)}), 500
