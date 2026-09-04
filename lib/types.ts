export type Party = "D" | "R" | "I" | "G" | "L" | "WFP" | "other";
export type SeatParty = "D" | "R" | "I" | "V";
export type Office = "house" | "senate" | "governor";
export type ElectionType = "general" | "primary" | "runoff" | "special" | "top_two";
export type Rating = "safe_d" | "likely_d" | "lean_d" | "tossup" | "lean_r" | "likely_r" | "safe_r";
export type CandidateStatus =
  | "running"
  | "won_primary"
  | "lost_primary"
  | "advanced"
  | "withdrew"
  | "won"
  | "lost"
  | "died";
export type OrgKind = "progressive" | "labor" | "establishment" | "issue" | "politician" | "other";
export type Role = "viewer" | "editor" | "admin";

export interface HouseSeat {
  id: string; // "NY-14", "AK-00"
  state: string;
  district: number; // 0 = at-large
  incumbent_name: string | null;
  incumbent_party: SeatParty;
  caucuses_with: "D" | "R" | null;
  notes: string | null;
  needs_review: boolean;
}

export interface Race {
  id: string;
  office: Office;
  state: string;
  district: number | null;
  seat_id: string | null;
  senate_class: 1 | 2 | 3 | null;
  title: string;
  election_date: string; // ISO date
  election_type: ElectionType;
  rating: Rating | null;
  incumbent_name: string | null;
  incumbent_party: "D" | "R" | "I" | null;
  is_open_seat: boolean;
  why_it_matters: string | null;
  notes: string | null;
  tracked: boolean;
  needs_review: boolean;
}

export interface Candidate {
  id: string;
  race_id: string;
  name: string;
  party: Party;
  is_incumbent: boolean;
  status: CandidateStatus;
  website: string | null;
  bio: string | null;
  fec_id: string | null;
  dw_nominate: number | null;
  photo_url: string | null;
  notes: string | null;
  /** Rubric issues with no published position found; for candidate outreach. */
  open_questions: string | null;
  /** FEC: share of receipts from non-individual sources, in percent. Includes ActBlue-style conduits. */
  nonindividual_share: number | null;
  /** FEC Schedule E: independent expenditures supporting the candidate, in dollars. */
  outside_spending_for: number | null;
  /** FEC Schedule E: independent expenditures opposing the candidate, in dollars. */
  outside_spending_against: number | null;
  /** FEC Schedule E: largest outside spenders, as text. */
  top_outside_spenders: string | null;
  sort_order: number;
  needs_review: boolean;
}

export interface Issue {
  id: string;
  name: string;
  description: string | null;
  weight: number;
  sort_order: number;
  rubric: Record<string, string>; // "0".."4" -> what that score means
  active: boolean;
}

export interface Score {
  candidate_id: string;
  issue_id: string;
  score: 0 | 1 | 2 | 3 | 4;
  evidence: string | null;
  source_url: string | null;
  provisional: boolean;
}

export interface Org {
  id: string;
  name: string;
  url: string | null;
  kind: OrgKind;
  signal: -1 | 0 | 1; // 1 = progressive signal, -1 = counter-signal (e.g. AIPAC money)
  sort_order: number;
}

export interface Endorsement {
  id?: number;
  candidate_id: string;
  org_id: string;
  note: string | null;
  url: string | null;
}

export interface Profile {
  id: string;
  email: string | null;
  role: Role;
}

/** Everything the dashboard needs, loaded in one go. */
export interface Dataset {
  seats: HouseSeat[];
  races: Race[];
  candidates: Candidate[];
  issues: Issue[];
  scores: Score[];
  orgs: Org[];
  endorsements: Endorsement[];
  /** Where the data came from; the UI shows a banner in static mode. */
  source: "supabase" | "static";
}
