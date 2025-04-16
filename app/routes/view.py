# --- Flask imports ---
from flask import send_file, jsonify
from app.config import UPLOAD_FOLDER

# --- TQEC imports ---
from tqec import BlockGraph
from tqec.interop.collada.read_write import write_block_graph_to_dae_file
from tqec.interop.collada.html_viewer import display_collada_model

# --- Standard library ---
from io import BytesIO
import os


def view_routes(app):
    @app.route("/view/<html_file>")
    def view_html(html_file):
        return send_file(os.path.join(UPLOAD_FOLDER, html_file), mimetype="text/html")

    @app.route("/render_inline_viewer")
    def render_inline_viewer():
        working_path = os.path.join(UPLOAD_FOLDER, "working.dae")

        if not os.path.exists(working_path):
            return jsonify(
                {"html": "<p style='color:red;'>❌ No BlockGraph found yet.</p>"}
            )

        bg = BlockGraph.from_dae_file(working_path)
        bytes_buffer = BytesIO()
        write_block_graph_to_dae_file(bg, bytes_buffer)

        viewer = display_collada_model(filepath_or_bytes=bytes_buffer.getvalue())
        html = viewer._repr_html_()
        html += """
            <style>
                iframe, canvas {
                    padding-left: 2%;
                    padding-right: 2%;
                    width: 100% !important;
                    height: 40em !important;
                    max-width: 96%;
                }
            </style>
        """

        return jsonify({"html": html})
