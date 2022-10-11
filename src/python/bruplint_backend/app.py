from brutil_py import greet_rs
from flask import Flask, render_template
import os
from typing import Any, Mapping, Optional
from util import greet_py
from waitress import serve
from werkzeug.wrappers.response import Response

def create(config: Optional[Mapping[str, Any]] = None) -> Flask:
    app = Flask(
        __name__,
        instance_relative_config = True,
        template_folder = "../templates",
        static_folder = "../static"
    )

    if config is None:
        app.config.from_pyfile("config.py", silent=True)
    else:
        app.config.from_mapping(config)

    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass

    @app.route('/')
    def root() -> Response:
        return app.redirect(app.url_for("greet", name="world"))

    @app.route("/greet/<name>")
    def greet(name: str) -> str:
        return render_template(
            "greet/index.html",
            greet_py = greet_py,
            greet_rs = greet_rs,
            name = name
        )

    return app

def run(host: str = "0.0.0.0", port: int = 8000) -> None:
    serve(create(), host=host, port=port)

if __name__ == "__main__":
    run()
