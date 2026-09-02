import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseSeed, type SeedData } from "./seed-schema";

const SEED_DIR = path.join(process.cwd(), "data", "seed");

function readJson(name: string): unknown {
  return JSON.parse(readFileSync(path.join(SEED_DIR, name), "utf8"));
}

/** Loads and validates everything in data/seed. Used in static mode and by the seed script. */
export function loadSeed(): SeedData {
  return parseSeed({
    seats: readJson("house_seats.json"),
    races: readJson("races.json"),
    candidates: readJson("candidates.json"),
    issues: readJson("issues.json"),
    scores: readJson("scores.json"),
    orgs: readJson("orgs.json"),
    endorsements: readJson("endorsements.json"),
  });
}
