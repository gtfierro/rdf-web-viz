import sqlite3
import secrets
import user_graph

user_schema = """
CREATE TABLE IF NOT EXISTS Users ( 
	Username TEXT NOT NULL PRIMARY KEY, 
	Apikey TEXT NOT NULL
); 
"""

# Potential Discussion:
# LONGBLOBS have a maximum size of 4,294,967,295 bytes... if graph files (.ttl) exceed that size, we may need to reconsider and store this as a FILESTREAM and store the
# file on some file location.
graph_schema = """
CREATE TABLE IF NOT EXISTS Graphs (
    File_Name TEXT NOT NULL PRIMARY KEY,
    File LONGBLOB NOT NULL
);
"""

filtered_graph_schema = """
CREATE TABLE IF NOT EXISTS Filtered_Graphs (
    File_Name TEXT NOT NULL,
    Username TEXT NOT NULL,
    Display_Name TEXT NOT NULL,
    Transforms TEXT NOT NULL,
    PRIMARY KEY (Display_Name),
    FOREIGN KEY (File_Name) REFERENCES Graphs(File_Name),
    FOREIGN KEY (Username) REFERENCES Users(Username)
);
"""

class DB:
    ### Init ###
    def __init__(self, filename: str = ':memory:'):
        """
        Creates a new Database

        :param filename: location of database (defaults to in-memory)
        :type filename: str
        """
        self.filename = filename
        self.db = sqlite3.connect(filename)

        # create tables
        self.db.execute(user_schema)
        self.db.execute(graph_schema)
        self.db.execute(filtered_graph_schema)

    ########################
    ### Database Queries ###
    ########################

    # TODO: Clean up code so instead of sqlit3 throwing us an error for violation of primary key, we do the checking and return some bool to determine if the user can be added or not.
    # This may be out of scope currently, because users will not be able to create an account. Some system admin will been creating user accounts.

    # Add new user to database (username must be unique)
    def add_user(self, username: str) -> str:
        """
        Creates a new user and returns the api key

        :param username: username (must be unique)
        :type username: str
        :return: generated API key
        :rtype: str
        """
        api_key = secrets.token_hex(16)
        self.db.execute("""INSERT INTO Users(Username, Apikey)
                           VALUES (?, ?)""", (username, api_key))
        self.db.commit()
        return api_key

    # Add new graph (.ttl file) to database (file_name must be unique)
    def add_graph(self, file_name: str, file) -> bool:
        """
        Return true if the graph was successfully added to the database, return false otherwise

        :return: whether the graph was added to the database successfully
        :retype: bool
        """

        # TODO: Something to keep in mind.
        # How to store file contents here? this (https://pynative.com/python-mysql-blob-insert-retrieve-file-image-as-a-blob-in-mysql/) article says
        # to just store the graph in a super long string.

        # Insert new graph
        cursor = self.db.execute("""INSERT INTO Graphs(File_Name, File) VALUES (?, ?)""", (file_name, file))
        self.db.commit()

        # If rowcount == 1, that means execution was successful
        if(cursor.rowcount == 1):
            return True
        return False
        #

    # TODO: add_filtered_graph(self, graph_reference, display_name, list_of_filters, timestamp, username) -> returns bool if graph is added
    # Add new filtered graph data into database (display_name must be unique)
    def add_filtered_graph(self, graph_reference: str, display_name: str, list_of_filters: list, username: str) -> bool:
        """
        Return true if the filtered graph data was successfully added to the database, return false otherwise

        :return: whether the filtered graph data was added to the database successfully
        :retype: bool
        """

        # Note: username doesn't have to be checked for existence because user will be unable to save graph to database if they do not have an account.
        # No need for redundant error checking.

        # Check if graph exists in database, if doesn't exist return false
        checker = self.db.execute("""SELECT EXISTS(SELECT 1 FROM Graphs WHERE File_Name=(?))""", [graph_reference])

        # Grab first value from checker (tuple)
        temp = checker.fetchone()
        if(temp[0] != 1):
            return False

        # Instead of storing list of filters into database as a list, convert list into a comma seperated string
        listOfFiltersAsString = ','.join(list_of_filters)

        # Insert new filtered graph_data
        cursor = self.db.execute("""INSERT INTO Filtered_Graphs(File_Name, Username, Display_Name, Transforms) VALUES (?, ?, ?, ?)""", 
        (graph_reference, username, display_name, listOfFiltersAsString))
        self.db.commit()

        # If rowcount == 1, that means execution was successful
        if(cursor.rowcount == 1):
            return True
        return False

    # Get filtered graph from database by username and display_name
    def get_filtered_graph(self, username: str, display_name: str) -> list:
        """
        Return list of filters (transforms) that will be used to generate a graph on the front-end.

        :return: List of filters that correspond to some selected graph
        :retype: list
        """

        # display_name will be unique for a user's list of graphs
        queryResult = self.db.execute("""SELECT Transforms FROM Filtered_Graphs WHERE Username=(?) AND Display_Name=(?)""", (username, display_name))

        # If queryResult != Null, return list (split by comma), else return Null (None)
        listOfFiltersAsString = []
        result = queryResult.fetchone()
        if(result != None):
            listOfFiltersAsString = result[0]
            #print(listOfFiltersAsString)
            return listOfFiltersAsString.split(",")
        else:
            return None

        

    # TODO: I'm not a fan of returning a huge string as the graph contents... but from my googling I couldn't find a way to store graphs as a file without having to have 
    # some external file location. Open for suggestions!

    # Get graph data from database by file_name
    def get_graph_data(self, file_name: str) -> str:
        """
        Return graph data as a string. The data of the graph is stored as a string in LONGBLOB form. Idea came from: 
        (https://pynative.com/python-mysql-blob-insert-retrieve-file-image-as-a-blob-in-mysql/).

        :return: String of graph data
        :retype: str
        """
        # file_name will be unique in the database
        queryResult = self.db.execute("""SELECT File FROM Graphs WHERE File_Name=(?)""", [file_name])

        # If queryResult != Null, return graph data, else return Null (None)
        result = queryResult.fetchone()
        if(result != None):
            #print(queryResult.fetchone()[0])
            return result[0]
        else:
            return None

    # TODO: Potential Future Problem: Something to keep in mind on the front-end: If I share a graph with Bob, and Bob decides to save my graph I sent him, we need to check that Bob doesn't 
    # already have a saved graph in the same display name as the graph I sent. This should be a pretty simple checking but something to keep in mind.

    # Get list of graphs associated with a specific user
    def get_graphs_by_username(self, username) -> list:
        """
        Return list of graphs associated with a username. All the graphs will be unique for a specific user. This is a list of user_graph objects, which consist of
        display_name and file_name
        """

        # display_name will be unique for a user's list of graphs
        queryResult = self.db.execute("""SELECT Display_Name, File_Name FROM Filtered_Graphs WHERE Username=(?)""", [username])

        # If queryResult is not empty, return list of graphs, else return Null (None)
        result = queryResult.fetchall()
        listOfGraphs = []
        if(result):
            for index in result:
                tempObj = user_graph.User_Graph(index[0], index[1])
                listOfGraphs.append(tempObj)          
            return listOfGraphs
        else:
            return None

    ### Helper Functions ###
    def is_apikey_valid(self, username: str, apikey: str) -> bool:
        """
        Return true if the apikey matches the username, return false otherwise

        :return: whether the apikey is valid
        :rtype: bool
        """
        result = self.db.execute("""SELECT 1 FROM Users WHERE Username=? AND Apikey=?""", (username, apikey))
        return result.rowcount == 1

if __name__ == '__main__':

    ### Testing Functions: ###

    # Create Database #
    db = DB("test.db")

    # Add user to Database #
    db.add_user("testuser")

    # Add new graph to Database #
    testFile = open(".\graph.ttl").read()
    graphTest = db.add_graph("test graph", testFile)

    # Add new filtered_graph to Database #
    test_filter_list = ["test1", "test2", "test3"]
    filterTest = db.add_filtered_graph("test graph", "Testing123", ["test1", "test2", "test3"], "testuser")
    filterTest = db.add_filtered_graph("test graph", "Testing1234", ["test1", "test2", "test3"], "testuser")

    # Retrieve filtered_graph test from Database #
    getList = db.get_filtered_graph("testuser", "Testing123")
    print(getList)

    # Retrieve graph data test from Database #
    graphData = db.get_graph_data("test graph2")
    print(graphData)

    # Retrieve list of graphs associated with user test from Database #
    userGraphs = db.get_graphs_by_username("testuser")
    for index in userGraphs:
        print(index.display_name)
        print(index.file_name)
