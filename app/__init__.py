from flask import Flask
import secrets
from .routes import register_routes
from app.config import UPLOAD_FOLDER


def create_app():
    app = Flask(__name__)
    app.secret_key = secrets.token_hex(16)

    app.config["TEMPLATES_AUTO_RELOAD"] = True
    app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

    register_routes(app)

    return app
