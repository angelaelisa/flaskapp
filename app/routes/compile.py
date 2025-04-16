# --- Flask imports ---
from flask import request, jsonify, url_for, current_app, flash, send_from_directory

# --- App imports ---
from app.utils import compile_from_working_dae
from app.config import DETECTOR_DB_FOLDER, UPLOAD_FOLDER

# --- TQEC imports ---
from tqec import BlockGraph

# --- Standard library ---
import os


def compile_routes(app):
    @app.route("/list_detector_files")
    def list_detector_files():
        files = [f.name for f in DETECTOR_DB_FOLDER.glob("*.pkl")]
        return jsonify({"files": files})

    @app.route("/get_correlation_surfaces")
    def get_correlation_surfaces():
        working_path = os.path.join(UPLOAD_FOLDER, "working.dae")

        if not os.path.exists(working_path):
            return jsonify({"surfaces": [], "error": "No working.dae found."})

        block_graph = BlockGraph.from_dae_file(working_path)
        correlation_surfaces = block_graph.find_correlation_surfaces()

        surfaces_info = []
        for i, cs in enumerate(correlation_surfaces):
            try:
                span_edges = list(cs.span)
                edge_count = len(span_edges)
                first_edge_str = str(span_edges[0]) if edge_count > 0 else "None"
            except Exception:
                span_edges = []
                edge_count = 0
                first_edge_str = "Unavailable"

            surfaces_info.append(
                {
                    "index": i,
                    "num_edges": edge_count,
                    "example_edge": first_edge_str,
                    "description": str(cs),
                }
            )

        return jsonify({"surfaces": surfaces_info})

    @app.route("/compile_circuit_from_working", methods=["POST"])
    def compile_circuit_from_working():
        try:
            db_filename = (
                request.form.get("detector_filename")
                or request.form.get("existing_detector")
                or None
            )
            db_filename = db_filename.strip() if db_filename else None

            circuit = compile_from_working_dae(detector_db_name=db_filename)

            folder = os.path.join(current_app.root_path, "stim_files")
            os.makedirs(folder, exist_ok=True)
            filename = "stim_circuit.txt"
            filepath = os.path.join(folder, filename)

            with open(filepath, "w") as f:
                f.write(str(circuit))

            return jsonify(
                {
                    "circuit": str(circuit),
                    "download_url": url_for("download_stim", filename=filename),
                }
            )

        except Exception as e:
            return jsonify({"error": f"❌ {str(e)}"}), 400

    @app.route("/download_stim/<filename>")
    def download_stim(filename):
        stim_folder = os.path.join(current_app.root_path, "stim_files")
        flash(
            "Stim circuit generated successfully! You can now download it.", "success"
        )
        return send_from_directory(stim_folder, filename, as_attachment=True)


def render_pop_faces_viewer(app):
    @app.route("/pop_faces", methods=["POST"])
    def pop_faces():
        try:
            data = request.get_json()
            direction = data.get("direction")
            surface_index = int(data.get("surface_index", 0))

            if direction not in ["+X", "-X", "+Y", "-Y", "+Z", "-Z"]:
                return (
                    jsonify(
                        {"html": "<p style='color:red;'>❌ Invalid direction.</p>"}
                    ),
                    400,
                )

            working_path = os.path.join(UPLOAD_FOLDER, "working.dae")
            if not os.path.exists(working_path):
                return (
                    jsonify(
                        {"html": "<p style='color:red;'>❌ working.dae not found.</p>"}
                    ),
                    400,
                )

            block_graph = BlockGraph.from_dae_file(working_path)
            correlation_surfaces = block_graph.find_correlation_surfaces()

            if surface_index >= len(correlation_surfaces):
                return (
                    jsonify(
                        {"html": "<p style='color:red;'>❌ Invalid surface index.</p>"}
                    ),
                    400,
                )

            viewer = block_graph.view_as_html(
                pop_faces_at_direction=direction,
                show_correlation_surface=correlation_surfaces[surface_index],
            )

            return jsonify({"html": viewer._repr_html_()})

        except Exception as e:
            return (
                jsonify({"html": f"<p style='color:red;'>❌ Error: {str(e)}</p>"}),
                500,
            )
