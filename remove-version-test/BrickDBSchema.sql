CREATE TABLE IF NOT EXISTS Users ( 
	Username TEXT  NOT NULL PRIMARY KEY, 
	Apikey TEXT  NOT NULL
); 

CREATE TABLE IF NOT EXISTS Graphs (
    File_Name TEXT NOT NULL PRIMARY KEY,
    File LONGBLOB NOT NULL
);

CREATE TABLE IF NOT EXISTS Filtered_Graphs (
    File_Name TEXT NOT NULL,
    Username TEXT NOT NULL,
    Display_Name TEXT NOT NULL,
    Transforms TEXT NOT NULL,
    PRIMARY KEY (Display_Name),
    FOREIGN KEY (File_Name) REFERENCES Graphs(File_Name),
    FOREIGN KEY (Username) REFERENCES Users(Username)
);
