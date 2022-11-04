# TUTORIAL USED FROM: (https://medium.com/quantrium-tech/creating-a-hello-world-api-functionality-using-swagger-ui-and-python-42e2a5335ff0)

from flask import Flask, request
from flasgger import Swagger, LazyString, LazyJSONEncoder
from flasgger import swag_from
import work_with_db

app = Flask(__name__)
app.json_encoder = LazyJSONEncoder

# Send list of user graphs (Sends list of User_Graph objects with display_name and file_name)
swagger_template = dict(
info = {
    'title': LazyString(lambda: 'User Associated Graphs'),
    'version': LazyString(lambda: '0.1'),
    'description': LazyString(lambda: 'This document depicts sending a list of graphs associated with a user.'),
    },
    host = LazyString(lambda: request.host)
)

# TODO: TO FIX
swagger_config = {
    "headers": [],
    "specs": [
        {
            "endpoint": 'hello_world',
            "route": '/hello_world.json',
            "rule_filter": lambda rule: True,
            "model_filter": lambda tag: True,
        }
    ],
    "static_url_path": "/flasgger_static",
    "swagger_ui": True,
    "specs_route": "/apidocs/"
}

swagger = Swagger(app, template=swagger_template,             
                  config=swagger_config)

@swag_from("user_graph_api.yml", methods=['GET'])
@app.route("/")
def hello_world():
    db = init()
    userGraphs = db.get_graphs_by_username("testuser")

    returnList = []
    for index in userGraphs:
        temp = index.display_name + index.file_name
        returnList.append(temp)
    userGraphsAsString = ','.join(returnList)
    print(userGraphsAsString)

    return userGraphsAsString

# Initialize test database values
def init():
    db = work_with_db.DB("test.db")
    # Add user to Database #
    db.add_user("testuser")

    # Add new graph to Database #
    testFile = open(".\graph.ttl").read()
    graphTest = db.add_graph("test graph", testFile)

    # Add new filtered_graph to Database #
    test_filter_list = ["test1", "test2", "test3"]
    filterTest = db.add_filtered_graph("test graph", "Testing123", ["test1", "test2", "test3"], "testuser")
    filterTest = db.add_filtered_graph("test graph", "Testing1234", ["test1", "test2", "test3"], "testuser")

    # # Retrieve filtered_graph test from Database #
    # getList = db.get_filtered_graph("testuser", "Testing123")
    # print(getList)

    # # Retrieve graph data test from Database #
    # graphData = db.get_graph_data("test graph2")
    # print(graphData)

    # Retrieve list of graphs associated with user test from Database #
    #userGraphs = db.get_graphs_by_username("testuser")
    return db

if __name__ == '__main__':
    app.run()