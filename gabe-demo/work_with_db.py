import sqlite3
import secrets

user_schema = """
CREATE TABLE IF NOT EXISTS Users ( 
	Username TEXT  NOT NULL PRIMARY KEY, 
	Apikey TEXT  NOT NULL
); 
"""

graph_schema = """
CREATE TABLE IF NOT EXISTS Graphs (
      GraphID INTEGER NOT NULL PRIMARY KEY,
      Name TEXT NOT NULL,
      Version INTEGER NOT NULL,
      Username TEXT NOT NULL
);
"""

class DB:
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
