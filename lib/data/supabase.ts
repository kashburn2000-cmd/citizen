import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Candidate, Dataset, Endorsement, HouseSeat, Issue, Org, Race, Score } from "../types";

async function all<T>(supabase: SupabaseClient, table: string, order: string): Promise<T[]> {
  // Supabase caps a single select at 1000 rows by default; page to be safe.
  const out: T[] = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order(order)
      .range(from, from + page - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < page) break;
  }
  return out;
}

export async function loadFromSupabase(supabase: SupabaseClient): Promise<Dataset> {
  const [seats, races, candidates, issues, scores, orgs, endorsements] = await Promise.all([
    all<HouseSeat>(supabase, "house_seats", "id"),
    all<Race>(supabase, "races", "election_date"),
    all<Candidate>(supabase, "candidates", "sort_order"),
    all<Issue>(supabase, "issues", "sort_order"),
    all<Score>(supabase, "scores", "candidate_id"),
    all<Org>(supabase, "orgs", "sort_order"),
    all<Endorsement>(supabase, "endorsements", "id"),
  ]);
  return {
    seats,
    races,
    candidates,
    issues: issues.map((i) => ({ ...i, weight: Number(i.weight) })),
    scores,
    orgs,
    endorsements,
    source: "supabase",
  };
}
