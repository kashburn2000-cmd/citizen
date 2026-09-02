import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Boots an in-memory Postgres with a stub of Supabase's auth schema,
 * then applies every migration in supabase/migrations in order.
 */
export async function bootDatabase(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(`
    create schema if not exists auth;
    create table auth.users (id uuid primary key, email text);
    create or replace function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    create role anon nologin;
    create role authenticated nologin;
  `);
  const dir = path.resolve(__dirname, "../supabase/migrations");
  const { readdirSync } = await import("node:fs");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(path.join(dir, file), "utf8"));
  }
  return db;
}

/** Simulate a Supabase JWT for RLS checks. */
export async function actAs(db: PGlite, userId: string | null) {
  await db.exec(`select set_config('request.jwt.claim.sub', '${userId ?? ""}', false)`);
}
