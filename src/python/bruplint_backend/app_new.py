from flask import Flask, render_template, request
import os
from typing import Any, Mapping, Optional
from waitress import serve
from werkzeug.wrappers.response import Response
import work_with_db

import json

# TODO: change to real db name
db = work_with_db.DB("test.db")

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

    # @app.route("/view/<username>/<display_name>/series.json", methods=["GET"])
    # def get_series_json(username: str, display_name: str) -> Response:
    #     return app.json.response(
    #         format = "series",
    #         metadata = {
    #             "username": username,
    #             "display_name": display_name
    #         },
    #     )

    @app.route("/view/<username>/<display_name>/view.json", methods=["GET", "PUT"])
    def get_filtered_graph_json(username: str, display_name: str) -> Response:
        # `type=bool` will cast truthy values to `True`
        # if request.args.get("embedded", default=False, type=bool):

        # TODO: Are we still using bru and brls, or are we switching to boolean?
        # if request.args.get("embedded", default=False) == "true":
        #     format = "bru"
        # else:
        #     format = "brl"
        if request.method == "GET":
            return app.json.response(
                format = format,
                graph = {
                    "type": "str",
                    "graph_data": get_graph(username, display_name)
                },
                transforms = db.get_filtered_graph(username, display_name)
            )
        elif request.method == "PUT":
            return app.json.response(
                format = format,
                graph = {
                    "type": "str",
                    "graph_data": get_graph(username, display_name)
                },
                transforms = db.get_filtered_graph(username, display_name)
            )

    @app.route("/view/<username>/<display_name>/graph.ttl", methods=["GET"])
    def get_graph(username: str, filename: str) -> str:
        graph = db.get_graph_data(filename)
        return graph

    # TODO: what is dis
    # @app.route("/view/<username>/<display_name>", methods=["GET"])
    # def get_main_page(username: str, display_name: str) -> str:
    #     return render_template("index.html")

    return app

def run(host: str = "0.0.0.0", port: int = 8000) -> None:
    serve(create(), host=host, port=port)

if __name__ == "__main__":
    run()