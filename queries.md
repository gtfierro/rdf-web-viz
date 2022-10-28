### Points on AHUs

```sparql
PREFIX brick: <https://brickschema.org/schema/Brick#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT * WHERE {
  ?ahu rdf:type brick:AHU .
  ?ahu brick:hasPoint ?point .
  ?point rdf:type ?point_type
}
```

### HVAC System Topology 1

```sparql
PREFIX brick: <https://brickschema.org/schema/Brick#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT * WHERE {
  ?upstream brick:feeds ?downstream .
  ?upstream rdf:type/rdfs:subClassOf* brick:HVAC_Equipment .
  ?downstream rdf:type/rdfs:subClassOf* brick:HVAC_Equipment .
  ?upstream rdf:type ?upstream_type .
  ?downstream rdf:type ?downstream_type .
}
```

### HVAC System Topology 2

```sparql
PREFIX brick: <https://brickschema.org/schema/Brick#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT * WHERE {
  ?upstream brick:feeds ?downstream .
  { ?upstream rdf:type/rdfs:subClassOf* brick:HVAC_Equipment }
  UNION
  { ?upstream rdf:type/rdfs:subClassOf* brick:Location }
  { ?downstream rdf:type/rdfs:subClassOf* brick:HVAC_Equipment }
  UNION
  { ?downstream rdf:type/rdfs:subClassOf* brick:Location }
  ?upstream rdf:type ?upstream_type .
  ?downstream rdf:type ?downstream_type .
}
```

### Location Hierarchy

```sparql
PREFIX brick: <https://brickschema.org/schema/Brick#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT * WHERE {
    ?parent brick:hasPart ?child .
    ?parent rdf:type/rdfs:subClassOf* brick:Location .
    ?child rdf:type/rdfs:subClassOf* brick:Location .
    ?parent rdf:type ?parent_type .
    ?child rdf:type ?child_type .
}
```
