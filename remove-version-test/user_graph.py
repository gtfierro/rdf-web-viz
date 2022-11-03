
# IDEA: We may want to throw filter_list in this class as well, but we also don't want to bloat the user's client with unnecessary data. We already have to query again for
# the graph data once a user selects a graph, so a filter_list will just be extra data sent initially that is not really needed at the time of displaying the user with graphs
# they have existing under their account.
class User_Graph:
    def __init__(self, display_name, file_name):
        self.display_name = display_name
        self.file_name = file_name