from .upload import upload_routes
from .view import view_routes
from .blockgraph import blockgraph_routes
from .compile import compile_routes, render_pop_faces_viewer
from .edit import edit_routes


def register_routes(app):
    upload_routes(app)
    view_routes(app)
    blockgraph_routes(app)
    compile_routes(app)
    edit_routes(app)
    render_pop_faces_viewer(app)
