/**
 * Pushes data/seed/*.json into a Supabase project.
 *
 *   SUPABASE_URL=https://xxxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   npx tsx scripts/seed-supabase.ts [--reset]
 *
 * Upserts by primary key, so re-running is safe. --reset deletes every row in
 * the data tables first (profiles are left alone).
 *
 * The service role key bypasses RLS. Never put it in a NEXT_PUBLIC_ variable
 * or commit it.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseSeed } from "../lib/data/seed-schema";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const reset = process.argv.includes("--reset");
const supabase = createClient(url, key, { auth: { persistSession: false } });

const dir = path.resolve(__dirname, "../data/seed");
const read = (f: string) => JSON.parse(readFileSync(path.join(dir, f), "utf8"));
const seed = parseSeed({
  seats: read("house_seats.json"),
  races: read("races.json"),
  candidates: read("candidates.json"),
  issues: read("issues.json"),
  scores: read("scores.json"),
  orgs: read("orgs.json"),
  endorsements: read("endorsements.json"),
});

async function upsert<T extends object>(table: string, rows: T[], onConflict = "id") {
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
  console.log(`${table}: ${rows.length} rows`);
}

async function main() {
  if (reset) {
    // Child tables first; cascades handle the rest but be explicit.
    for (const t of ["endorsements", "scores", "candidates", "races", "house_seats", "issues", "orgs"]) {
      const { error } = await supabase.from(t).delete().neq("id", "__none__");
      if (error && !error.message.includes("column")) throw new Error(`reset ${t}: ${error.message}`);
    }
    // endorsements has a bigint id; the neq trick above doesn't match it.
    await supabase.from("endorsements").delete().gte("id", 0);
    console.log("reset done");
  }
  await upsert("house_seats", seed.seats);
  await upsert("orgs", seed.orgs);
  await upsert("issues", seed.issues);
  await upsert("races", seed.races);
  await upsert("candidates", seed.candidates);
  await upsert("scores", seed.scores, "candidate_id,issue_id");
  await upsert("endorsements", seed.endorsements, "candidate_id,org_id");
  console.log("seed complete");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
