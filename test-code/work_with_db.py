import sqlite3
import secrets

user_schema = """
CREATE TABLE IF NOT EXISTS Users ( 
	Username TEXT NOT NULL PRIMARY KEY, 
	Apikey TEXT NOT NULL
); 
"""

# TODO: We need to store the turtle file here or just a reference to it stored in a shared folder someplace

# TODO: Questions for Dr. Fierro
# How should graphs be stored in the database? BLOB has a limit of 2 GBs and FILESTREAM requires the data to be stored somewhere on the file system.
graph_schema = """
CREATE TABLE IF NOT EXISTS Graphs (
    File_Name TEXT NOT NULL PRIMARY KEY,
    File BLOB NOT NULL
);
"""

filtered_graph_schema = """
CREATE TABLE IF NOT EXISTS Filter_Graphs (
    File_Name TEXT NOT NULL,
    Username TEXT NOT NULL,
    Display_Name TEXT NOT NULL,
    Version TIMESTAMP NOT NULL,
    Transforms TEXT NOT NULL,
    PRIMARY KEY (File_Name, Username, Transforms),
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

    ### Database Queries ###
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

    def add_graph(self, file_name: str, file) -> bool:
        """
        Return true if the graph was successfully added to the database, return false otherwise

        :return: whether the graph was added to the database successfully
        :retype: bool
        """
        #TESTING
        print("FILE TYPE: \n")
        print(type(file))

        # CURRENTLY RUNNING INTO ISSUE: How to store file contents here? this (https://pynative.com/python-mysql-blob-insert-retrieve-file-image-as-a-blob-in-mysql/) article says
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

    # TODO: Retrieve filtered_graph(self, username, display_name) -> returns: list_of_filters from Filter_Graphs Table

    # TODO: Retrieve graph_data(self, file_name) -> returns: file of graph from Graphs Table

    # TODO: Retrieve list of graphs associated with user get_graphs_by_username(self, username) -> returns: list_of_graphs (list of graph's display names) 
    # (This is where the issue of Versioning comes into play, because from a list of graphs which version do we present? If we have a parent graph (latest version), we are going to need
    # another menu to display all the children (versions) of the graph... but then how do we name these versions? Its a pain.

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
    db = DB("test.db")
    testFile = open(".\graph.ttl").read()
    graphTest = db.add_graph("test graph", testFile)
    #db.add_user("testUser")
