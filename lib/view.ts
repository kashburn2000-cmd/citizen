import type { Candidate, Dataset, Endorsement, Org, Race, Score } from "./types";
import { summarizeScores, scoresByCandidate, type CandidateScoreSummary } from "./scoring";

export const OFFICE_LABEL: Record<Race["office"], string> = {
  house: "House",
  senate: "Senate",
  governor: "Governor",
};

export const STATUS_LABEL: Record<Candidate["status"], string> = {
  running: "Running",
  won_primary: "Won primary",
  lost_primary: "Lost primary",
  advanced: "Advanced",
  withdrew: "Withdrew",
  won: "Won",
  lost: "Lost",
  died: "Died",
};

/** Statuses that mean a candidate is no longer on the ballot. */
export const OUT = new Set<Candidate["status"]>(["lost_primary", "withdrew", "lost", "died"]);

export interface CandidateView extends Candidate {
  summary: CandidateScoreSummary;
  scores: Score[];
  endorsements: Array<Endorsement & { org: Org }>;
}

export interface RaceView extends Race {
  candidates: CandidateView[];
  /** Highest-scoring Democratic-side candidate, for the map and list. */
  topScore: number | null;
}

/** Joins candidates, scores, and endorsements onto races. Pure; safe on client or server. */
export function buildRaceViews(data: Pick<Dataset, "races" | "candidates" | "issues" | "scores" | "orgs" | "endorsements">): RaceView[] {
  const byCandidate = scoresByCandidate(data.scores);
  const orgById = new Map(data.orgs.map((o) => [o.id, o]));
  const endorsementsByCandidate = new Map<string, Array<Endorsement & { org: Org }>>();
  for (const e of data.endorsements) {
    const org = orgById.get(e.org_id);
    if (!org) continue;
    const list = endorsementsByCandidate.get(e.candidate_id) ?? [];
    list.push({ ...e, org });
    endorsementsByCandidate.set(e.candidate_id, list);
  }
  const candidatesByRace = new Map<string, CandidateView[]>();
  for (const c of data.candidates) {
    const scores = byCandidate.get(c.id) ?? [];
    const view: CandidateView = {
      ...c,
      scores,
      summary: summarizeScores(scores, data.issues),
      endorsements: (endorsementsByCandidate.get(c.id) ?? []).sort((a, b) => a.org.sort_order - b.org.sort_order),
    };
    const list = candidatesByRace.get(c.race_id) ?? [];
    list.push(view);
    candidatesByRace.set(c.race_id, list);
  }
  return data.races.map((r) => {
    const candidates = (candidatesByRace.get(r.id) ?? []).sort(
      (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
    );
    const topScore = candidates
      .filter((c) => c.party !== "R" && c.summary.score !== null && !OUT.has(c.status))
      .reduce<number | null>((best, c) => (best === null || c.summary.score! > best ? c.summary.score! : best), null);
    return { ...r, candidates, topScore };
  });
}
