/**
 * Converts scripts/house-seats.txt (one seat per line, easy to hand-edit)
 * into data/seed/house_seats.json.
 *
 *   npx tsx scripts/build-house-seats.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { STATE_BY_POSTAL, TOTAL_HOUSE_SEATS, seatId } from "../lib/geo/states";
import type { HouseSeat } from "../lib/types";

const src = readFileSync(path.resolve(__dirname, "house-seats.txt"), "utf8");
const seats: HouseSeat[] = [];
for (const raw of src.split("\n")) {
  const line = raw.trim();
  if (!line || line.startsWith("#")) continue;
  const m = line.match(/^([A-Z]{2}) (\d+) (.*)$/);
  if (!m) throw new Error(`bad line: ${line}`);
  const [, state, districtStr, rest] = m;
  const [nameRaw, partyRaw, noteRaw] = rest.split("|").map((s) => s.trim());
  const district = Number(districtStr);
  const party = (partyRaw ?? "").toUpperCase();
  if (!["D", "R", "I", "V"].includes(party)) throw new Error(`bad party on: ${line}`);
  if (!STATE_BY_POSTAL[state]) throw new Error(`unknown state on: ${line}`);
  seats.push({
    id: seatId(state, district),
    state,
    district,
    incumbent_name: nameRaw || null,
    incumbent_party: party as HouseSeat["incumbent_party"],
    caucuses_with: null,
    notes: noteRaw || null,
    // Seats come from congress-legislators; only flag ones whose note asks for a check.
    needs_review: /verify|confirm/i.test(noteRaw ?? ""),
  });
}

const byState = new Map<string, number>();
for (const s of seats) byState.set(s.state, (byState.get(s.state) ?? 0) + 1);
for (const [postal, info] of Object.entries(STATE_BY_POSTAL)) {
  const n = byState.get(postal) ?? 0;
  if (n !== info.seats) throw new Error(`${postal}: expected ${info.seats} seats, found ${n}`);
}
if (seats.length !== TOTAL_HOUSE_SEATS) throw new Error(`expected ${TOTAL_HOUSE_SEATS}, got ${seats.length}`);
if (new Set(seats.map((s) => s.id)).size !== seats.length) throw new Error("duplicate seat ids");

const out = path.resolve(__dirname, "../data/seed/house_seats.json");
writeFileSync(out, JSON.stringify(seats, null, 2) + "\n");
const tally = seats.reduce<Record<string, number>>((acc, s) => ((acc[s.incumbent_party] = (acc[s.incumbent_party] ?? 0) + 1), acc), {});
console.log(`wrote ${seats.length} seats`, tally);
