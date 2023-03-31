= How to generate a working geojson =

1. Identify target region 
 - search on openstreetmap.org for your region and open it
 - e.g. https://www.openstreetmap.org/relation/1413196
 - note the relation id, e.g. `1413196`
 
2. Fetch the relation geojson from polygons.openstreetmap.fr
 - http://polygons.openstreetmap.fr/?id=1413196
 - change the "X" parameter to zero
 - download the middle line item, it should be a simplified polygon not enlarged
   (the top item would be not simplified, the bottom is simplified and enlarged)

3. Manipulate the downloaded `.json`
 hand-edit to change from a `GeometryCollection` to a `Feature`
 this involves:
  - change the top-level `"type"` to `"Feature"`
  - adding (if it's not already there) a `"properties": {},` property
  - changing `"geometries"` to `"geometry"`
  - take the inner `MultiPolygon` object out of the enclosing list i.e. remove the `[]`'s from the outer list

This is now ready for loading into the geojson column on the database.
