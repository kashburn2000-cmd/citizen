/**
 * Builds the House hex cartogram layout: one hexagon per seat, clustered by
 * state, states positioned near their geographic centroid (Albers USA, as
 * pre-projected by us-atlas) and pushed apart so clusters don't overlap.
 *
 *   npx tsx scripts/build-cartogram.ts
 *
 * Output: public/geo/house-cartogram.json
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { feature } from "topojson-client";
import { geoPath } from "d3-geo";
import { forceSimulation, forceX, forceY, forceCollide } from "d3-force";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { FeatureCollection, Geometry } from "geojson";
import { STATES, STATE_BY_FIPS, seatId } from "../lib/geo/states";

const WIDTH = 975;
const HEIGHT = 610;
const HEX_R = 7.2; // hex circumradius in map units
const PAD = 4; // gap between state clusters

const atlasPath = path.resolve(__dirname, "../node_modules/us-atlas/states-albers-10m.json");
const topo = JSON.parse(readFileSync(atlasPath, "utf8")) as Topology<{ states: GeometryCollection<{ name: string }> }>;
const fc = feature(topo, topo.objects.states) as FeatureCollection<Geometry, { name: string }>;
const pathGen = geoPath(); // identity: coordinates are already projected

interface Node {
  postal: string;
  seats: number;
  r: number;
  x: number;
  y: number;
  cx: number;
  cy: number;
}

const nodes: Node[] = [];
for (const f of fc.features) {
  const info = STATE_BY_FIPS[String(f.id).padStart(2, "0")];
  if (!info) continue; // DC and territories have no voting House seat
  const [cx, cy] = pathGen.centroid(f);
  // A hex spiral of n hexes fits in a circle of roughly this radius.
  const r = HEX_R * (1.05 * Math.sqrt(info.seats) + 0.7);
  nodes.push({ postal: info.postal, seats: info.seats, r, x: cx, y: cy, cx, cy });
}
if (nodes.length !== STATES.length) throw new Error(`expected ${STATES.length} states, got ${nodes.length}`);

// Dorling-style relaxation: pull toward centroid, don't overlap.
const sim = forceSimulation(nodes)
  .force("x", forceX<Node>((d) => d.cx).strength(0.25))
  .force("y", forceY<Node>((d) => d.cy).strength(0.25))
  .force("collide", forceCollide<Node>((d) => d.r + PAD).strength(1).iterations(4))
  .stop();
for (let i = 0; i < 400; i++) sim.tick();

// Keep everything inside the canvas.
for (const n of nodes) {
  n.x = Math.min(WIDTH - n.r, Math.max(n.r, n.x));
  n.y = Math.min(HEIGHT - n.r, Math.max(n.r, n.y));
}

/** Axial coordinates of a hex spiral, center first, then ring by ring. */
function spiral(count: number): Array<[number, number]> {
  const out: Array<[number, number]> = [[0, 0]];
  // Axial neighbor directions in ring order; the walk starts at dirs[4] * ring.
  const dirs: Array<[number, number]> = [
    [1, 0],
    [1, -1],
    [0, -1],
    [-1, 0],
    [-1, 1],
    [0, 1],
  ];
  for (let ring = 1; out.length < count; ring++) {
    let q = -ring;
    let r = ring;
    for (let side = 0; side < 6 && out.length < count; side++) {
      for (let step = 0; step < ring && out.length < count; step++) {
        out.push([q, r]);
        q += dirs[side][0];
        r += dirs[side][1];
      }
    }
  }
  return out.slice(0, count);
}

// Order hexes so district numbers read roughly left-to-right, top-to-bottom.
function orderedOffsets(count: number): Array<[number, number]> {
  const cells = spiral(count).map(([q, r]) => {
    const x = Math.sqrt(3) * HEX_R * (q + r / 2);
    const y = 1.5 * HEX_R * r;
    return { x, y };
  });
  cells.sort((a, b) => Math.round((a.y - b.y) / (1.5 * HEX_R)) || a.x - b.x);
  return cells.map((c) => [c.x, c.y]);
}

interface SeatHex {
  id: string;
  state: string;
  district: number;
  x: number;
  y: number;
}
interface StateCluster {
  state: string;
  x: number;
  y: number;
  r: number;
  seats: number;
}

const seats: SeatHex[] = [];
const states: StateCluster[] = [];
for (const n of nodes) {
  states.push({ state: n.postal, x: round(n.x), y: round(n.y), r: round(n.r), seats: n.seats });
  const offsets = orderedOffsets(n.seats);
  for (let i = 0; i < n.seats; i++) {
    const district = n.seats === 1 ? 0 : i + 1;
    seats.push({
      id: seatId(n.postal, district),
      state: n.postal,
      district,
      x: round(n.x + offsets[i][0]),
      y: round(n.y + offsets[i][1]),
    });
  }
}

function round(v: number): number {
  return Math.round(v * 10) / 10;
}

const out = { width: WIDTH, height: HEIGHT, hexRadius: HEX_R, states, seats };
const outPath = path.resolve(__dirname, "../public/geo/house-cartogram.json");
writeFileSync(outPath, JSON.stringify(out));
console.log(`wrote ${seats.length} seats in ${states.length} states to ${path.relative(process.cwd(), outPath)}`);
