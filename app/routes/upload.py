# --- Flask imports ---
from flask import request, render_template, redirect, session

# --- App imports ---
from app.utils import compile_from_working_dae
from app.config import UPLOAD_FOLDER, DETECTOR_DB_FOLDER, STIM_FOLDER

# --- TQEC imports ---
from tqec.utils import Direction3D
from tqec.interop.collada import (
    read_block_graph_from_dae_file,
    write_block_graph_to_dae_file,
)

# --- Standard library ---
import os
import shutil
import secrets


def upload_routes(app):

    @app.route("/", methods=["GET", "POST"])
    def index():
        working_path = os.path.join(UPLOAD_FOLDER, "working.dae")

        if request.method == "POST":
            file = request.files.get("dae_file")
            action = request.form.get("action")
            axis = request.form.get("rotate_axis")

            if file:
                filename = file.filename

                # Remove all existing files in the uploads folder
                for f in os.listdir(UPLOAD_FOLDER):
                    file_path = os.path.join(UPLOAD_FOLDER, f)
                    try:
                        if os.path.isfile(file_path):
                            os.remove(file_path)
                    except Exception as e:
                        print(f"⚠️ Could not remove {file_path}: {e}")

                # Save the uploaded file and make a working copy
                original_path = os.path.join(UPLOAD_FOLDER, filename)
                file.save(original_path)
                shutil.copyfile(original_path, working_path)

                session["uploaded_filename"] = filename
                print(f"Uploaded: {filename} → working.dae")
                return redirect("/")

            if action == "rotate" and axis in ["X", "Y", "Z"]:
                print(f"Rotating around {axis}")
                bg = read_block_graph_from_dae_file(working_path)
                rotated = bg.rotate(Direction3D[axis])
                write_block_graph_to_dae_file(rotated, working_path)
                return redirect("/")

            elif action == "compile":
                print("Compiling Stim circuit with selected surface...")
                try:
                    selected_index = int(request.form.get("surface_index", 0))
                    stim_circuit = compile_from_working_dae(selected_index)
                    print("✅ Compilation complete!")

                    stim_filename = f"stim_circuit_{secrets.token_hex(8)}.stim"
                    stim_path = os.path.join(STIM_FOLDER, stim_filename)
                    with open(stim_path, "w") as f:
                        f.write(str(stim_circuit))

                    session["stim_filename"] = stim_filename
                except Exception as e:
                    print(f"❌ Compilation failed: {e}")
                    return f"❌ Compilation failed: {e}", 500
                return redirect("/")

            elif action == "clear":
                print("🧹 Clearing all files and session")
                for file in ["working.dae", "working.html"]:
                    file_path = os.path.join(UPLOAD_FOLDER, file)
                    if os.path.exists(file_path):
                        os.remove(file_path)

                session.pop("uploaded_filename", None)
                session.pop("stim_filename", None)
                session["just_acted"] = True

                return redirect("/")

        # GET request
        filename = session.get("uploaded_filename", None)
        uploaded = session.pop("uploaded", False)
        stim_filename = session.get("stim_filename", None)
        available_db_files = [f.name for f in DETECTOR_DB_FOLDER.glob("*.pkl")]

        return render_template(
            "index.html",
            uploaded_filename=filename,
            uploaded=uploaded,
            stim_filename=stim_filename,
            available_db_files=available_db_files,
        )
