#!/usr/bin/env bash
# Downloads Census cartographic boundaries for the 119th Congress and writes a
# simplified, pre-projected TopoJSON for the geographic House map.
#
#   bash scripts/build-districts.sh
#
# Needs network access to www2.census.gov. Output: public/geo/districts-albers.json
set -euo pipefail
cd "$(dirname "$0")/.."
tmp=$(mktemp -d)
curl -sSL -o "$tmp/cd119.zip" https://www2.census.gov/geo/tiger/GENZ2024/shp/cb_2024_us_cd119_5m.zip
unzip -q -o "$tmp/cd119.zip" -d "$tmp"
npx --yes mapshaper -i "$tmp/cb_2024_us_cd119_5m.shp" \
  -filter 'STATEFP < "57" && STATEFP != "11"' \
  -proj albersusa \
  -simplify 12% keep-shapes \
  -each 'id=GEOID, state=STATEFP, cd=CD119FP' \
  -filter-fields id,state,cd \
  -o format=topojson public/geo/districts-albers.json
rm -rf "$tmp"
echo "wrote public/geo/districts-albers.json"
