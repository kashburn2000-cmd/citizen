"use client";

import { useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useSupabaseConfig } from "@/components/SupabaseProvider";
import type { SupabaseConfig } from "./env";

let cached: { url: string; client: SupabaseClient } | null = null;

/** One browser client per page load. Config comes from SupabaseProvider. */
export function getBrowserSupabase(config: SupabaseConfig | null): SupabaseClient | null {
  if (!config) return null;
  if (!cached || cached.url !== config.url) cached = { url: config.url, client: createBrowserClient(config.url, config.key) };
  return cached.client;
}

/** Hook form for client components. Returns null in static mode. */
export function useSupabase(): SupabaseClient | null {
  const config = useSupabaseConfig();
  return useMemo(() => getBrowserSupabase(config), [config]);
}
