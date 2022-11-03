from flask import Flask, render_template, request
import os
from typing import Any, Mapping, Optional
from waitress import serve
from werkzeug.wrappers.response import Response

def create(config: Optional[Mapping[str, Any]] = None) -> Flask:
    app = Flask(
        __name__,
        instance_relative_config = True,
        template_folder = "../astro",
        static_folder = "../astro",
        static_url_path = ''
    )

    if config is None:
        app.config.from_pyfile("config.py", silent=True)
    else:
        app.config.from_mapping(config)

    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass

    @app.route("/view/<username>/<series_name>/<timestamp>/series.json", methods=["GET"])
    def get_series_json(username: str, series_name: str, timestamp: str) -> Response:
        return app.json.response(
            format = "series",
            metadata = {
                "username": username,
                "series_name": series_name,
                "last_modified": int(timestamp)
            },
            versions = [
                {
                    "timestamp": int(timestamp),
                    "url": app.url_for(
                        "get_view_json",
                        username = username,
                        series_name = series_name,
                        timestamp = timestamp
                    )
                }
            ]
        )

    @app.route("/view/<username>/<series_name>/<timestamp>/view.json", methods=["GET"])
    def get_view_json(username: str, series_name: str, timestamp: str) -> Response:
        # `type=bool` will cast truthy values to `True`
        # if request.args.get("embedded", default=False, type=bool):
        if request.args.get("embedded", default=False) == "true":
            format = "bru"
        else:
            format = "brl"
        return app.json.response(
            format = format,
            graph = {
                "type": "turtle",
                "url": app.url_for(
                    "get_graph",
                    username = username,
                    series_name = series_name,
                    timestamp = timestamp
                )
            },
            transforms = [
                {
                    "type": "sparql",
                    "name": "Select rooms on floors",
                    "enabled": True,
                    "params": {
                        "query": """PREFIX brick: <https://brickschema.org/schema/Brick#>

SELECT ?room ?floor WHERE {
  ?room a brick:Room;
        brick:isPartOf ?floor.
  ?floor a brick:Floor
}"""
                    }
                },
                {
                    "type": "regex",
                    "name": "Select only odd rooms",
                    "enabled": True,
                    "params": {
                        "regex": "room_\\w*[13579]$",
                        "flags": "i",
                        "match_over": "subject"
                    }
                },
                {
                    "type": "regex",
                    "name": "Select only odd floors",
                    "enabled": True,
                    "params": {
                        "regex": "floor_\\d*[13579]$",
                        "flags": "i",
                        "match_over": "object"
                    }
                }
            ]
        )

    @app.route("/view/<username>/<series_name>/<timestamp>/graph.ttl", methods=["GET"])
    def get_graph(username: str, series_name: str, timestamp: str) -> Response:
        return app.redirect("http://brickschema.org/ttl/soda_brick.ttl")

    @app.route("/view/<username>/<series_name>/<timestamp>", methods=["GET"])
    def get_main_page(username: str, series_name: str, timestamp: str) -> str:
        return render_template("index.html")

    return app

def run(host: str = "0.0.0.0", port: int = 8000) -> None:
    serve(create(), host=host, port=port)

if __name__ == "__main__":
    run()
