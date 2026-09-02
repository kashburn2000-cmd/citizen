"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseEnv } from "./env";

let cached: SupabaseClient | null = null;

/** Browser client. Returns null when Supabase isn't configured (static mode). */
export function getBrowserSupabase(): SupabaseClient | null {
  const env = supabaseEnv();
  if (!env) return null;
  if (!cached) cached = createBrowserClient(env.url, env.key);
  return cached;
}
