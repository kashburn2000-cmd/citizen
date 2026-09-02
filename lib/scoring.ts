import type { Candidate, HouseSeat, Issue, Race, Rating, Score, SeatParty } from "./types";

export const MAX_SCORE = 4;
export const HOUSE_MAJORITY = 218;

export interface CandidateScoreSummary {
  /** Weighted 0-100 over the issues that have a score; null if nothing is scored. */
  score: number | null;
  scored: number;
  total: number;
  anyProvisional: boolean;
}

/** Mirrors the candidate_scores SQL view so static mode and Supabase agree. */
export function summarizeScores(scores: Score[], issues: Issue[]): CandidateScoreSummary {
  const active = issues.filter((i) => i.active);
  const byIssue = new Map(active.map((i) => [i.id, i]));
  let num = 0;
  let den = 0;
  let scored = 0;
  let anyProvisional = false;
  for (const s of scores) {
    const issue = byIssue.get(s.issue_id);
    if (!issue) continue;
    num += s.score * issue.weight;
    den += MAX_SCORE * issue.weight;
    scored += 1;
    anyProvisional ||= s.provisional;
  }
  return {
    score: den > 0 ? Math.round((1000 * num) / den) / 10 : null,
    scored,
    total: active.length,
    anyProvisional,
  };
}

export function scoresByCandidate(scores: Score[]): Map<string, Score[]> {
  const m = new Map<string, Score[]>();
  for (const s of scores) {
    const list = m.get(s.candidate_id);
    if (list) list.push(s);
    else m.set(s.candidate_id, [s]);
  }
  return m;
}

export const RATING_LABEL: Record<Rating, string> = {
  safe_d: "Safe D",
  likely_d: "Likely D",
  lean_d: "Lean D",
  tossup: "Toss-up",
  lean_r: "Lean R",
  likely_r: "Likely R",
  safe_r: "Safe R",
};

export const RATING_ORDER: Rating[] = ["safe_d", "likely_d", "lean_d", "tossup", "lean_r", "likely_r", "safe_r"];

/** Party a rating points toward, or null for a toss-up. */
export function ratingLeans(rating: Rating | null | undefined): "D" | "R" | null {
  if (!rating || rating === "tossup") return null;
  return rating.endsWith("_d") ? "D" : "R";
}

export interface HouseCounts {
  D: number;
  R: number;
  I: number;
  V: number;
  /** Independents counted with the party they caucus with. */
  demCaucus: number;
  repCaucus: number;
}

export function countHouse(seats: HouseSeat[]): HouseCounts {
  const c: HouseCounts = { D: 0, R: 0, I: 0, V: 0, demCaucus: 0, repCaucus: 0 };
  for (const s of seats) {
    c[s.incumbent_party] += 1;
    if (s.incumbent_party === "D" || (s.incumbent_party === "I" && s.caucuses_with === "D")) c.demCaucus += 1;
    if (s.incumbent_party === "R" || (s.incumbent_party === "I" && s.caucuses_with === "R")) c.repCaucus += 1;
  }
  return c;
}

export interface Projection {
  /** Seats expected to go D / R after November, plus seats with no lean (toss-ups). */
  D: number;
  R: number;
  tossup: number;
  /** Per-seat expected holder. */
  bySeat: Map<string, SeatParty | "tossup">;
}

/**
 * Projects the post-election House: every seat holds for its current party
 * unless a tracked general-election race with a rating says otherwise.
 * Vacant seats with no tracked race count as toss-ups.
 */
export function projectHouse(seats: HouseSeat[], races: Race[]): Projection {
  const raceBySeat = new Map<string, Race>();
  for (const r of races) {
    if (r.office !== "house" || !r.seat_id || !r.tracked) continue;
    if (r.election_type !== "general" && r.election_type !== "special") continue;
    const existing = raceBySeat.get(r.seat_id);
    if (!existing || r.election_date > existing.election_date) raceBySeat.set(r.seat_id, r);
  }
  const bySeat = new Map<string, SeatParty | "tossup">();
  let D = 0;
  let R = 0;
  let tossup = 0;
  for (const s of seats) {
    const race = raceBySeat.get(s.id);
    let expected: SeatParty | "tossup";
    if (race?.rating) {
      expected = ratingLeans(race.rating) ?? "tossup";
    } else if (s.incumbent_party === "V") {
      expected = "tossup";
    } else if (s.incumbent_party === "I") {
      expected = s.caucuses_with ?? "tossup";
    } else {
      expected = s.incumbent_party;
    }
    bySeat.set(s.id, expected);
    if (expected === "D") D += 1;
    else if (expected === "R") R += 1;
    else tossup += 1;
  }
  return { D, R, tossup, bySeat };
}

export function candidatesForRace(candidates: Candidate[], raceId: string): Candidate[] {
  return candidates
    .filter((c) => c.race_id === raceId)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
}

export function daysUntil(isoDate: string, now = new Date()): number {
  const target = new Date(isoDate + "T12:00:00Z").getTime();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12);
  return Math.round((target - today) / 86_400_000);
}

export function formatDate(isoDate: string): string {
  return new Date(isoDate + "T12:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
