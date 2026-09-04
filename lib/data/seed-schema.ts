import { z } from "zod";
import { seatId } from "../geo/states";
import type { Candidate, Endorsement, HouseSeat, Issue, Org, Race, Score } from "../types";

/**
 * Seed files in data/seed are hand-edited, so they accept a terse shape and
 * these schemas fill in the defaults. The same normalized objects are what
 * the seed script pushes into Supabase.
 */

const party = z.enum(["D", "R", "I", "G", "L", "WFP", "other"]);
const rating = z.enum(["safe_d", "likely_d", "lean_d", "tossup", "lean_r", "likely_r", "safe_r"]);

export const houseSeatSchema = z.object({
  id: z.string(),
  state: z.string().length(2),
  district: z.number().int().min(0),
  incumbent_name: z.string().nullable().default(null),
  incumbent_party: z.enum(["D", "R", "I", "V"]),
  caucuses_with: z.enum(["D", "R"]).nullable().default(null),
  notes: z.string().nullable().default(null),
  needs_review: z.boolean().default(true),
});

export const raceSchema = z
  .object({
    id: z.string(),
    office: z.enum(["house", "senate", "governor"]),
    state: z.string().length(2),
    district: z.number().int().min(0).nullable().default(null),
    seat_id: z.string().nullable().optional(),
    senate_class: z.union([z.literal(1), z.literal(2), z.literal(3)]).nullable().default(null),
    title: z.string(),
    election_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    election_type: z.enum(["general", "primary", "runoff", "special", "top_two"]).default("general"),
    rating: rating.nullable().default(null),
    incumbent_name: z.string().nullable().default(null),
    incumbent_party: z.enum(["D", "R", "I"]).nullable().default(null),
    is_open_seat: z.boolean().default(false),
    why_it_matters: z.string().nullable().default(null),
    notes: z.string().nullable().default(null),
    tracked: z.boolean().default(true),
    needs_review: z.boolean().default(true),
  })
  .transform((r): Race => ({
    ...r,
    seat_id: r.seat_id ?? (r.office === "house" && r.district !== null ? seatId(r.state, r.district) : null),
  }));

export const candidateSchema = z.object({
  id: z.string(),
  race_id: z.string(),
  name: z.string(),
  party: party.default("D"),
  is_incumbent: z.boolean().default(false),
  status: z
    .enum(["running", "won_primary", "lost_primary", "advanced", "withdrew", "won", "lost", "died"])
    .default("running"),
  website: z.string().nullable().default(null),
  bio: z.string().nullable().default(null),
  fec_id: z.string().nullable().default(null),
  dw_nominate: z.number().nullable().default(null),
  photo_url: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
  open_questions: z.string().nullable().default(null),
  nonindividual_share: z.number().min(0).max(100).nullable().default(null),
  outside_spending_for: z.number().min(0).nullable().default(null),
  outside_spending_against: z.number().min(0).nullable().default(null),
  top_outside_spenders: z.string().nullable().default(null),
  sort_order: z.number().int().default(0),
  needs_review: z.boolean().default(true),
});

export const issueSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().default(null),
  weight: z.number().min(0).default(1),
  sort_order: z.number().int().default(0),
  rubric: z.record(z.string(), z.string()).default({}),
  active: z.boolean().default(true),
});

export const scoreSchema = z.object({
  candidate_id: z.string(),
  issue_id: z.string(),
  score: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  evidence: z.string().nullable().default(null),
  source_url: z.string().nullable().default(null),
  provisional: z.boolean().default(true),
});

export const orgSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().nullable().default(null),
  kind: z.enum(["progressive", "labor", "establishment", "issue", "politician", "other"]).default("progressive"),
  signal: z.union([z.literal(-1), z.literal(0), z.literal(1)]).default(1),
  sort_order: z.number().int().default(0),
});

export const endorsementSchema = z.object({
  candidate_id: z.string(),
  org_id: z.string(),
  note: z.string().nullable().default(null),
  url: z.string().nullable().default(null),
});

export interface SeedData {
  seats: HouseSeat[];
  races: Race[];
  candidates: Candidate[];
  issues: Issue[];
  scores: Score[];
  orgs: Org[];
  endorsements: Endorsement[];
}

/** Parses raw seed JSON and checks cross-references. Throws on the first problem. */
export function parseSeed(raw: {
  seats: unknown;
  races: unknown;
  candidates: unknown;
  issues: unknown;
  scores: unknown;
  orgs: unknown;
  endorsements: unknown;
}): SeedData {
  const seats = z.array(houseSeatSchema).parse(raw.seats);
  const races = z.array(raceSchema).parse(raw.races);
  const candidates = z.array(candidateSchema).parse(raw.candidates);
  const issues = z.array(issueSchema).parse(raw.issues);
  const scores = z.array(scoreSchema).parse(raw.scores);
  const orgs = z.array(orgSchema).parse(raw.orgs);
  const endorsements = z.array(endorsementSchema).parse(raw.endorsements);

  const seatIds = new Set(seats.map((s) => s.id));
  const raceIds = new Set(races.map((r) => r.id));
  const candidateIds = new Set(candidates.map((c) => c.id));
  const issueIds = new Set(issues.map((i) => i.id));
  const orgIds = new Set(orgs.map((o) => o.id));

  const dupes = (ids: string[]) => ids.filter((id, i) => ids.indexOf(id) !== i);
  for (const [label, ids] of [
    ["race", races.map((r) => r.id)],
    ["candidate", candidates.map((c) => c.id)],
    ["issue", issues.map((i) => i.id)],
    ["org", orgs.map((o) => o.id)],
  ] as const) {
    const d = dupes([...ids]);
    if (d.length) throw new Error(`duplicate ${label} ids: ${d.join(", ")}`);
  }
  for (const r of races) {
    if (r.seat_id && !seatIds.has(r.seat_id)) throw new Error(`race ${r.id} references unknown seat ${r.seat_id}`);
  }
  for (const c of candidates) {
    if (!raceIds.has(c.race_id)) throw new Error(`candidate ${c.id} references unknown race ${c.race_id}`);
  }
  const scoreKeys = new Set<string>();
  for (const s of scores) {
    if (!candidateIds.has(s.candidate_id)) throw new Error(`score references unknown candidate ${s.candidate_id}`);
    if (!issueIds.has(s.issue_id)) throw new Error(`score for ${s.candidate_id} references unknown issue ${s.issue_id}`);
    const key = `${s.candidate_id}|${s.issue_id}`;
    if (scoreKeys.has(key)) throw new Error(`duplicate score ${key}`);
    scoreKeys.add(key);
  }
  for (const e of endorsements) {
    if (!candidateIds.has(e.candidate_id)) throw new Error(`endorsement references unknown candidate ${e.candidate_id}`);
    if (!orgIds.has(e.org_id)) throw new Error(`endorsement for ${e.candidate_id} references unknown org ${e.org_id}`);
  }
  return { seats, races, candidates, issues, scores, orgs, endorsements };
}
