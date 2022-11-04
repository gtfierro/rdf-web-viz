from flask import Flask, render_template, request, jsonify
import os
from typing import Any, Mapping, Optional
from waitress import serve
from werkzeug.wrappers.response import Response
import work_with_db

import json

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

    @app.route("/view/<username>/user_graphs.json", methods=["GET"])
    def get_user_graphs_json(username: str) -> Response:
        return app.json.response(
            format = "user_graphs",
            metadata = {
                "username": username
            },
            user_graphs = db.get_graphs_by_username(username)
        )

    @app.route("/view/<username>/<filename>/<display_name>/view.json", methods=["GET"])
    def get_view_json(username: str, filename: str, display_name: str) -> Response:
        # `type=bool` will cast truthy values to `True`
        # if request.args.get("embedded", default=False, type=bool):
        if request.args.get("embedded", default=False) == "true":
            format = "bru"
        else:
            format = "brl"
        return app.json.response(
            format = format,
            graph = {
                "type": "str",
                "graph_data": get_graph(username, display_name)
            },
            transforms = db.get_filtered_graph(username, display_name)
        )

    @app.route("/view/<username>/<filename>/graph.ttl", methods=["GET"])
    def get_graph(username: str, filename: str) -> str:
        graph = db.get_graph_data(filename)
        return graph

    @app.route("/view/<username>/<display_name>", methods=["GET"])
    def get_main_page(username: str, display_name: str) -> str:
        return render_template("index.html")

    @app.route('/', methods=['PUT'])
    def create_record():
        record = json.loads(request.data)
        with open('/tmp/data.txt', 'r') as f:
            data = f.read()
        if not data:
            records = [record]
        else:
            records = json.loads(data)
            records.append(record)
        with open('/tmp/data.txt', 'w') as f:
            f.write(json.dumps(records, indent=2))
        return jsonify(record)

    # @app.route('/', methods=['PUT'])
    # def save_view():
    #     record = json.loads(request.data)
    #     record.filename
    #     db.add_graph()

    return app

def run(host: str = "0.0.0.0", port: int = 8000) -> None:
    serve(create(), host=host, port=port)

if __name__ == "__main__":
    run()