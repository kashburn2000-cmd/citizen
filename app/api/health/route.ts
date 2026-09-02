import { NextResponse } from "next/server";
import { supabaseEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

/**
 * Deployment check. Reports whether Supabase is configured and which
 * environment variable names are present (names only, never values).
 */
export async function GET() {
  const names = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_PUBLISHABLE_DEFAULT_KEY",
    "SUPABASE_ANON_KEY",
  ];
  const present = names.filter((n) => Boolean(process.env[n]?.trim()));
  const cfg = supabaseEnv();
  let database: "not_configured" | "ok" | string = "not_configured";
  if (cfg) {
    try {
      const r = await fetch(`${cfg.url}/rest/v1/issues?select=id&limit=1`, {
        headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}` },
        cache: "no-store",
      });
      database = r.ok ? "ok" : `http ${r.status}: ${(await r.text()).slice(0, 200)}`;
    } catch (e) {
      database = e instanceof Error ? e.message : String(e);
    }
  }
  return NextResponse.json({
    supabase_configured: cfg !== null,
    supabase_host: cfg ? new URL(cfg.url).host : null,
    variables_present: present,
    database,
    vercel_env: process.env.VERCEL_ENV ?? null,
  });
}
