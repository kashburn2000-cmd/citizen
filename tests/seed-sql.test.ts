import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { bootDatabase } from "./pglite";

const seedPath = path.resolve(__dirname, "../supabase/seed.sql");

describe("supabase/seed.sql", () => {
  it("exists (run `npm run build:seed-sql`)", () => {
    expect(existsSync(seedPath)).toBe(true);
  });

  it("loads into a fresh database and matches the JSON row counts", async () => {
    const db = await bootDatabase();
    await db.exec(readFileSync(seedPath, "utf8"));
    const count = async (t: string) => Number((await db.query<{ n: string }>(`select count(*) as n from public.${t}`)).rows[0].n);
    const json = (f: string) => JSON.parse(readFileSync(path.resolve(__dirname, "../data/seed", f), "utf8")).length;
    expect(await count("house_seats")).toBe(json("house_seats.json"));
    expect(await count("races")).toBe(json("races.json"));
    expect(await count("candidates")).toBe(json("candidates.json"));
    expect(await count("scores")).toBe(json("scores.json"));
    expect(await count("endorsements")).toBe(json("endorsements.json"));
    // Re-running must be a no-op, not a duplicate-key error, and it must remove rows the seed no longer has.
    await db.exec(`
      insert into public.candidates (id, race_id, name) values ('stale-candidate', (select id from public.races limit 1), 'Stale');
      insert into public.scores (candidate_id, issue_id, score) values ('stale-candidate', (select id from public.issues limit 1), 4);
      insert into public.orgs (id, name) values ('stale-org', 'Stale Org');
    `);
    await db.exec(readFileSync(seedPath, "utf8"));
    expect(await count("candidates")).toBe(json("candidates.json"));
    expect(await count("scores")).toBe(json("scores.json"));
    expect(await count("orgs")).toBe(json("orgs.json"));
    const top = await db.query<{ candidate_id: string; progressive_score: string }>(
      "select candidate_id, progressive_score from public.candidate_scores where progressive_score is not null order by progressive_score desc limit 1",
    );
    expect(Number(top.rows[0].progressive_score)).toBeGreaterThan(90);
  });
});
