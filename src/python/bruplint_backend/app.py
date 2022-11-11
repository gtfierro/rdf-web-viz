from datetime import datetime
from flask import Flask, Response, render_template, request, make_response
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from os import makedirs
from pyoxigraph import parse as parseRdf
from secrets import token_urlsafe
from typing import Any, Mapping, Optional
from urllib.parse import urljoin
from urllib.request import urlopen
from waitress import serve

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
        makedirs(app.instance_path)
    except OSError:
        pass

    db = SQLAlchemy()
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///bruplint.db"
    db.init_app(app)
    CORS(app)

    class User(db.Model):
        __tablename__ = "users"
        username = db.Column(db.Text, primary_key=True, unique=True, nullable=False)
        api_key = db.Column(db.Text, nullable=False)
        # TODO: creation timestamp?

    class Graph(db.Model):
        __tablename__ = "graphs"
        id = db.Column(db.Integer, primary_key=True, autoincrement=True)
        # https://stackoverflow.com/a/43791881
        content = db.Column(db.LargeBinary(length = (2 ** 32) - 1), nullable=False)
        source = db.Column(db.Text, nullable=True)
        # TODO: creation timestamp
        # TODO: MIME type

    class View(db.Model):
        __tablename__ = "views"
        id = db.Column(db.Integer, primary_key=True, autoincrement=True)
        username = db.Column(db.Text, db.ForeignKey("users.username"), nullable=False)
        series_name = db.Column(db.Text, nullable=False)
        timestamp = db.Column(db.DateTime, nullable=False)
        graph_id = db.Column(db.Text, db.ForeignKey("graphs.id"), nullable=False)
        transforms = db.Column(db.JSON, nullable=False)

        # TODO: BRU and BRL constructors as View instance methods?

    def getUserOr4XX(username: str, api_key: Optional[str] = None) -> User:
        user = db.get_or_404(User, username)
        if api_key == None:
            api_key = request.headers.get("Authentication")
        if api_key != user.api_key:
            app.aborter(401) # Incorrect API key
        return user

    def parseTimestampOr404(timestamp_string: str) -> datetime:
        try:
            # TODO: Server should be the one to deal with parsing 'Z' timestamps, not the client
            return datetime.fromisoformat(timestamp_string)
        except:
            app.aborter(404) # Improper ISO format

    @app.route("/user/<username>", methods=["DELETE", "GET", "PUT"])
    def user_create(username: str) -> Response:
        if request.method == "PUT":
            if db.session.get(User, username):
                app.aborter(403) # User exists
            else:
                new_user = User(
                    username = username,
                    api_key = token_urlsafe(32)
                )
                print(new_user)
                db.session.add(new_user)
                db.session.commit()
                # TODO: Make 201 status code
                return app.json.response(
                    username = new_user.username,
                    api_key = new_user.api_key
                )
        elif request.method == "GET":
            getUserOr4XX(username)
            return make_response('', 204)
        elif request.method == "DELETE":
            user = getUserOr4XX(username)
            db.session.delete(user)
            db.session.commit()
            # TODO: Delete associated views
            return make_response('', 204)

    @app.route("/view/<username>/<series_name>/<timestamp>/view.json", methods=["POST"])
    def post_view_json(username: str, series_name: str, timestamp: str) -> Response:
        parseTimestampOr404(timestamp)

        if request.headers.get("Content-Type") != "application/json":
            print("Failed JSON")
            app.aborter(400) # Content is not JSON

        print(request.json)

        if isBru(request.json):
            graph_content = request.json.get("graph").get("content")
            graph_source = None
        elif isBrl(request.json):
            graph_source = request.json.get("graph").get("url")
            location = urljoin(request.host_url, graph_source) if graph_source[0] == '/' else graph_source
            try:
                with urlopen(location) as graph:
                    graph_content = graph.read()
            except:
                print("Failed URL")
                app.aborter(400) # Failed to read from URL
        else:
            print("Failed BRL")
            app.aborter(400) # Content is not a Bru nor a Brl

        user = getUserOr4XX(username)

        existing_graph = db.session.execute(
            db.select(Graph)
                .where(Graph.source == graph_source)
                .where(Graph.content == graph_content)
                .limit(1)
        ).first()

        if existing_graph == None:
            # Assert that it is possible to parse before trying to save
            try:
                list(parseRdf(graph_content, "text/turtle"))
            except:
                app.aborter(400) # Graph content is not Turtle-formatted

            working_graph = Graph(content=graph_content, source=graph_source)

            db.session.add(working_graph)
            db.session.commit()
        else:
            working_graph = existing_graph[0]

        new_view = View(
            username = user.username,
            series_name = series_name,
            timestamp = datetime.now(),
            graph_id = working_graph.id,
            transforms = request.json.get("transforms")
        )

        db.session.add(new_view)
        db.session.commit()

        return make_response('', 201)

    # TODO: DELETE method for deleting all views of a series (may not make sense to have a view-level DELETE call)
    @app.route("/view/<username>/<series_name>/<timestamp>/series.json", methods=["GET"])
    def get_series_json(username: str, series_name: str, timestamp: str) -> Response:
        parsed_timestamp = parseTimestampOr404(timestamp)

        series_entries = db.session.execute(
            db.select(View)
                .where(View.username == username)
                .where(View.series_name == series_name)
                .where(View.timestamp <= parsed_timestamp)
                .order_by(db.desc(View.timestamp))
        ).all()

        # TODO: Deduplicate `view[0].timestamp.isoformat()`
        views = list(map(lambda view: {
            "timestamp": view[0].timestamp.isoformat(),
            "url": app.url_for("get_view_json", username=username, series_name=series_name, timestamp=view[0].timestamp.isoformat())
        }, series_entries))

        if len(views) == 0:
            app.aborter(422)

        return app.json.response(
            format = "series",
            metadata = {
                "username": username,
                "series_name": series_name,
                "last_modified": views[0]["timestamp"]
            },
            versions = views
        )

    @app.route("/view/<username>/<series_name>/<timestamp>/view.json", methods=["GET"])
    def get_view_json(username: str, series_name: str, timestamp: str) -> Response:
        parsed_timestamp = parseTimestampOr404(timestamp)

        view = db.session.execute(
            db.select(View)
                .where(View.username == username)
                .where(View.series_name == series_name)
                .where(View.timestamp <= parsed_timestamp)
                .order_by(db.desc(View.timestamp))
        ).first()

        if view == None:
            # TODO: Should aborters return non-HTML content?
            app.aborter(422)

        return app.json.response(
            format = "brl",
            graph = {
                # TODO: Should "type" be actual MIME types?
                "type": "turtle",
                "url": app.url_for("get_graph_ttl",
                    username = username,
                    series_name = series_name,
                    timestamp = view[0].timestamp
                )
            },
            transforms = view[0].transforms
        )

    # TODO: In future, when other types can be supported, should this return 404 on non-Turtle types?
    # TODO: Alternatively, headers have an "Accepts" field that can be a list of MIME types
    @app.route("/view/<username>/<series_name>/<timestamp>/graph.ttl", methods=["GET"])
    def get_graph_ttl(username: str, series_name: str, timestamp: str) -> Response:
        parsed_timestamp = parseTimestampOr404(timestamp)

        # TODO: Deduplicate
        view = db.session.execute(
            db.select(View)
                .where(View.username == username)
                .where(View.series_name == series_name)
                .where(View.timestamp <= parsed_timestamp)
                .order_by(db.desc(View.timestamp))
        ).first()

        if view == None:
            app.aborter(422)

        graph = db.session.get(Graph, view[0].graph_id)

        if graph == None:
            app.aborter(422)

        response = make_response(graph.content, 200)
        response.headers["Content-Type"] = "text/turtle"
        return response

    @app.route("/view/<username>/<series_name>/<timestamp>", methods=["GET"])
    def get_main_page(username: str, series_name: str, timestamp: str) -> str:
        parsed_timestamp = parseTimestampOr404(timestamp)

        view = db.session.execute(
            db.select(View)
                .where(View.username == username)
                .where(View.series_name == series_name)
                .where(View.timestamp <= parsed_timestamp)
                .order_by(db.desc(View.timestamp))
        ).first()

        if view == None:
            app.aborter(422)

        return render_template("index.html")

    @app.route("/view/<username>/<series_name>/latest", methods=["GET"])
    def get_main_page_latest(username: str, series_name: str) -> str:

        view = db.session.execute(
            db.select(View)
                .where(View.username == username)
                .where(View.series_name == series_name)
                .order_by(db.desc(View.timestamp))
        ).first()

        if view == None:
            app.aborter(422)

        return render_template("index.html")

    @app.route("/bruplint", methods=["GET"])
    def presence():
        return make_response('', 204)

    def isBru(potential_bru) -> bool:
        match potential_bru:
            case {
                "format": "bru",
                "graph": {
                    "type": "turtle",
                    "content": dict(),
                    **rest_graph
                },
                "transforms": [*transforms],
                **rest
            } if not rest and not rest_graph:
                for transform in transforms:
                    match transform:
                        case {
                            "type": str(),
                            "name": str(),
                            "enabled": bool(),
                            "params": dict(),
                            **rest
                        } if not rest:
                            pass
                        case _:
                            return False
                return True
            case _:
                return False

    def isBrl(potential_brl) -> bool:
        match potential_brl:
            case {
                "format": "brl",
                "graph": {
                    "type": "turtle",
                    "url": str(),
                    **rest_graph
                },
                "transforms": [*transforms],
                **rest
            } if not rest and not rest_graph:
                for transform in transforms:
                    match transform:
                        case {
                            "type": str(),
                            "name": str(),
                            "enabled": bool(),
                            "params": dict(),
                            **rest
                        } if not rest:
                            pass
                        case _:
                            return False
                return True
            case _:
                return False

    return app

def run(host: str = "0.0.0.0", port: int = 8000) -> None:
    serve(create(), host=host, port=port)

if __name__ == "__main__":
    run()
