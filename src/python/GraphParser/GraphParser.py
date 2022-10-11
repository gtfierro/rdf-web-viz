import pyoxigraph as oxi
import rdflib_sqlalchemy as alc
from rdflib import plugin, Graph, Literal, URIRef
import pprint

def main():
    g = Graph()
    g.parse("./src/python/GraphParser/TestGraphs/graph1.ttl")
    # for stmt in g:
    #     pprint.pprint(stmt)
    q = '''SELECT ?AHU WHERE
    { <http://buildsys.org/ontologies/bldg3#bldg3.CHW.ECONOMIZER> <https://brickschema.org/schema/Brick/timeseries> ?AHU01 . }  
    '''
    print(g.query(q))

main()


