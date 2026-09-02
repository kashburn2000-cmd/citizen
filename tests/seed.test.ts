import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseSeed } from "@/lib/data/seed-schema";
import { countHouse, projectHouse, summarizeScores, scoresByCandidate } from "@/lib/scoring";
import { TOTAL_HOUSE_SEATS } from "@/lib/geo/states";

const dir = path.resolve(__dirname, "../data/seed");
const read = (f: string) => JSON.parse(readFileSync(path.join(dir, f), "utf8"));

describe("seed data", () => {
  const seed = parseSeed({
    seats: read("house_seats.json"),
    races: read("races.json"),
    candidates: read("candidates.json"),
    issues: read("issues.json"),
    scores: read("scores.json"),
    orgs: read("orgs.json"),
    endorsements: read("endorsements.json"),
  });

  it("has every House seat exactly once", () => {
    expect(seed.seats).toHaveLength(TOTAL_HOUSE_SEATS);
    const counts = countHouse(seed.seats);
    expect(counts.D + counts.R + counts.I + counts.V).toBe(TOTAL_HOUSE_SEATS);
  });

  it("tracks a useful number of races across all three offices", () => {
    const byOffice = { house: 0, senate: 0, governor: 0 };
    for (const r of seed.races) byOffice[r.office] += 1;
    expect(byOffice.house).toBeGreaterThanOrEqual(25);
    expect(byOffice.senate).toBeGreaterThanOrEqual(8);
    expect(byOffice.governor).toBeGreaterThanOrEqual(8);
  });

  it("gives every race at least one candidate", () => {
    const withCandidates = new Set(seed.candidates.map((c) => c.race_id));
    const empty = seed.races.filter((r) => !withCandidates.has(r.id)).map((r) => r.id);
    expect(empty).toEqual([]);
  });

  it("links every House race to a real seat", () => {
    const seatIds = new Set(seed.seats.map((s) => s.id));
    for (const r of seed.races.filter((r) => r.office === "house")) {
      expect(r.seat_id, r.id).toBeTruthy();
      expect(seatIds.has(r.seat_id!), r.id).toBe(true);
    }
  });

  it("projects a full House", () => {
    const p = projectHouse(seed.seats, seed.races);
    expect(p.D + p.R + p.tossup).toBe(TOTAL_HOUSE_SEATS);
  });

  it("produces scores between 0 and 100", () => {
    const by = scoresByCandidate(seed.scores);
    for (const [, scores] of by) {
      const s = summarizeScores(scores, seed.issues);
      expect(s.score).not.toBeNull();
      expect(s.score!).toBeGreaterThanOrEqual(0);
      expect(s.score!).toBeLessThanOrEqual(100);
    }
  });
});
