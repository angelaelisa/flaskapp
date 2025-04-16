from flask import Flask
import secrets
from .routes import register_routes


def create_app():
    app = Flask(__name__)
    app.secret_key = secrets.token_hex(16)

    app.config["TEMPLATES_AUTO_RELOAD"] = True
    register_routes(app)

    return app
