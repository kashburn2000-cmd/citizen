/**
 * Pre-renders state outlines (Albers USA, 975x610) from us-atlas into SVG
 * path strings so the Senate/governor map ships a small JSON instead of
 * TopoJSON plus a client-side projection.
 *
 *   npx tsx scripts/build-states.ts
 *
 * Output: public/geo/states-albers.json
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { feature, mesh } from "topojson-client";
import { geoPath } from "d3-geo";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { FeatureCollection, Geometry } from "geojson";
import { STATE_BY_FIPS } from "../lib/geo/states";

const atlasPath = path.resolve(__dirname, "../node_modules/us-atlas/states-albers-10m.json");
const topo = JSON.parse(readFileSync(atlasPath, "utf8")) as Topology<{ states: GeometryCollection<{ name: string }> }>;
const fc = feature(topo, topo.objects.states) as FeatureCollection<Geometry, { name: string }>;
const pathGen = geoPath();

const states = fc.features
  .map((f) => {
    const info = STATE_BY_FIPS[String(f.id).padStart(2, "0")];
    if (!info) return null;
    const [cx, cy] = pathGen.centroid(f);
    return { postal: info.postal, name: info.name, d: pathGen(f) ?? "", cx: Math.round(cx * 10) / 10, cy: Math.round(cy * 10) / 10 };
  })
  .filter((s): s is NonNullable<typeof s> => s !== null);

// Interior borders as one path (drawn once, lighter than per-state strokes).
const borders = pathGen(mesh(topo, topo.objects.states, (a, b) => a !== b)) ?? "";

const out = { width: 975, height: 610, states, borders };
const outPath = path.resolve(__dirname, "../public/geo/states-albers.json");
writeFileSync(outPath, JSON.stringify(out));
console.log(`wrote ${states.length} states to ${path.relative(process.cwd(), outPath)} (${Math.round(JSON.stringify(out).length / 1024)} KB)`);
