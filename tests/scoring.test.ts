import { describe, it, expect } from "vitest";
import { countHouse, projectHouse, ratingLeans, summarizeScores, daysUntil } from "@/lib/scoring";
import type { HouseSeat, Issue, Race, Score } from "@/lib/types";

const issues: Issue[] = [
  { id: "a", name: "A", description: null, weight: 2, sort_order: 1, rubric: {}, active: true },
  { id: "b", name: "B", description: null, weight: 1, sort_order: 2, rubric: {}, active: true },
  { id: "c", name: "C", description: null, weight: 1, sort_order: 3, rubric: {}, active: false },
];

function seat(id: string, party: HouseSeat["incumbent_party"], caucus: "D" | "R" | null = null): HouseSeat {
  const [state, d] = id.split("-");
  return { id, state, district: Number(d), incumbent_name: null, incumbent_party: party, caucuses_with: caucus, notes: null, needs_review: false };
}

describe("summarizeScores", () => {
  it("weights by issue and ignores inactive issues", () => {
    const scores: Score[] = [
      { candidate_id: "x", issue_id: "a", score: 4, evidence: null, source_url: null, provisional: false },
      { candidate_id: "x", issue_id: "b", score: 2, evidence: null, source_url: null, provisional: true },
      { candidate_id: "x", issue_id: "c", score: 0, evidence: null, source_url: null, provisional: false },
    ];
    const s = summarizeScores(scores, issues);
    // (4*2 + 2*1) / (4*(2+1)) = 10/12
    expect(s.score).toBe(83.3);
    expect(s.scored).toBe(2);
    expect(s.total).toBe(2);
    expect(s.anyProvisional).toBe(true);
  });

  it("returns null with no scores", () => {
    expect(summarizeScores([], issues).score).toBeNull();
  });
});

describe("house math", () => {
  const seats = [seat("AA-01", "D"), seat("AA-02", "R"), seat("AA-03", "V"), seat("AA-04", "I", "D")];

  it("counts current holders and caucus totals", () => {
    const c = countHouse(seats);
    expect(c).toEqual({ D: 1, R: 1, I: 1, V: 1, demCaucus: 2, repCaucus: 1 });
  });

  it("projects with race ratings overriding incumbency", () => {
    const races: Race[] = [
      {
        id: "r1", office: "house", state: "AA", district: 2, seat_id: "AA-02", senate_class: null, title: "AA-2",
        election_date: "2026-11-03", election_type: "general", rating: "lean_d", incumbent_name: null,
        incumbent_party: "R", is_open_seat: false, why_it_matters: null, notes: null, tracked: true, needs_review: false,
      },
      {
        id: "r2", office: "house", state: "AA", district: 1, seat_id: "AA-01", senate_class: null, title: "AA-1",
        election_date: "2026-11-03", election_type: "general", rating: "tossup", incumbent_name: null,
        incumbent_party: "D", is_open_seat: false, why_it_matters: null, notes: null, tracked: true, needs_review: false,
      },
    ];
    const p = projectHouse(seats, races);
    expect(p.bySeat.get("AA-02")).toBe("D"); // rating flips it
    expect(p.bySeat.get("AA-01")).toBe("tossup");
    expect(p.bySeat.get("AA-03")).toBe("tossup"); // vacant, untracked
    expect(p.bySeat.get("AA-04")).toBe("D"); // independent caucusing with D
    expect(p).toMatchObject({ D: 2, R: 0, tossup: 2 });
  });

  it("maps ratings to a lean", () => {
    expect(ratingLeans("safe_r")).toBe("R");
    expect(ratingLeans("lean_d")).toBe("D");
    expect(ratingLeans("tossup")).toBeNull();
    expect(ratingLeans(null)).toBeNull();
  });

  it("computes days until an election", () => {
    expect(daysUntil("2026-11-03", new Date("2026-09-02T15:00:00Z"))).toBe(62);
  });
});
