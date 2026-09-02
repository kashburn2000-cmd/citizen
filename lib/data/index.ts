import "server-only";
import { cache } from "react";
import type { Dataset } from "../types";
import { getServerSupabase } from "../supabase/server";
import { loadFromSupabase } from "./supabase";
import { loadSeed } from "./static";

/**
 * Loads the whole dataset once per request. Uses Supabase when configured,
 * otherwise the JSON in data/seed (read-only "static mode").
 */
export const getDataset = cache(async (): Promise<Dataset> => {
  const supabase = await getServerSupabase();
  if (supabase) return loadFromSupabase(supabase);
  return { ...loadSeed(), source: "static" };
});
