import { describe, it, expect, beforeAll } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { bootDatabase, actAs } from "./pglite";

const ADMIN = "00000000-0000-0000-0000-00000000000a";
const VIEWER = "00000000-0000-0000-0000-00000000000b";

describe("schema", () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await bootDatabase();
    await db.exec(`
      insert into auth.users (id, email) values ('${ADMIN}', 'admin@example.com'), ('${VIEWER}', 'viewer@example.com');
      select public.grant_editor('admin@example.com', 'admin');
      insert into public.house_seats (id, state, district, incumbent_name, incumbent_party) values ('NY-14', 'NY', 14, 'Alexandria Ocasio-Cortez', 'D');
      insert into public.races (id, office, state, district, seat_id, title, election_date) values ('house-ny-14-2026-general', 'house', 'NY', 14, 'NY-14', 'NY-14 general', '2026-11-03');
      insert into public.candidates (id, race_id, name, party, is_incumbent) values ('aoc', 'house-ny-14-2026-general', 'Alexandria Ocasio-Cortez', 'D', true);
      insert into public.issues (id, name, weight, sort_order) values ('m4a', 'Medicare for All', 2, 1), ('gnd', 'Green New Deal', 1, 2), ('pac', 'No corporate PAC money', 1, 3);
    `);
  });

  it("creates a profile row for each new auth user", async () => {
    const r = await db.query<{ email: string; role: string }>("select email, role from public.profiles order by email");
    expect(r.rows).toEqual([
      { email: "admin@example.com", role: "admin" },
      { email: "viewer@example.com", role: "viewer" },
    ]);
  });

  it("computes a weighted progressive score over scored issues only", async () => {
    await db.exec(`
      insert into public.scores (candidate_id, issue_id, score) values ('aoc', 'm4a', 4), ('aoc', 'gnd', 3);
    `);
    const r = await db.query<{ progressive_score: string; issues_scored: number; issues_total: number }>(
      "select progressive_score, issues_scored, issues_total from public.candidate_scores where candidate_id = 'aoc'",
    );
    // (4*2 + 3*1) / (4 * (2+1)) = 11/12 = 91.7
    expect(Number(r.rows[0].progressive_score)).toBeCloseTo(91.7, 1);
    expect(r.rows[0].issues_scored).toBe(2);
    expect(r.rows[0].issues_total).toBe(3);
  });

  it("returns a null score for an unscored candidate", async () => {
    await db.exec(`insert into public.candidates (id, race_id, name) values ('nobody', 'house-ny-14-2026-general', 'Nobody Yet')`);
    const r = await db.query<{ progressive_score: string | null }>(
      "select progressive_score from public.candidate_scores where candidate_id = 'nobody'",
    );
    expect(r.rows[0].progressive_score).toBeNull();
  });

  it("is_editor reflects the caller's role", async () => {
    await actAs(db, ADMIN);
    expect((await db.query<{ ok: boolean }>("select public.is_editor() as ok")).rows[0].ok).toBe(true);
    await actAs(db, VIEWER);
    expect((await db.query<{ ok: boolean }>("select public.is_editor() as ok")).rows[0].ok).toBe(false);
    await actAs(db, null);
    expect((await db.query<{ ok: boolean }>("select public.is_editor() as ok")).rows[0].ok).toBe(false);
  });

  it("rejects out-of-range scores", async () => {
    await expect(db.exec(`insert into public.scores (candidate_id, issue_id, score) values ('aoc', 'pac', 5)`)).rejects.toThrow();
  });

  it("has RLS enabled with public read and editor write policies on every data table", async () => {
    const r = await db.query<{ tablename: string; rowsecurity: boolean; policies: number }>(`
      select t.tablename, t.rowsecurity, (select count(*) from pg_policies p where p.tablename = t.tablename)::int as policies
      from pg_tables t where t.schemaname = 'public' order by 1
    `);
    for (const row of r.rows) {
      expect(row.rowsecurity, row.tablename).toBe(true);
      expect(row.policies, row.tablename).toBeGreaterThanOrEqual(row.tablename === "profiles" ? 2 : 4);
    }
  });
});
