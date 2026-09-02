"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getBrowserSupabase } from "@/lib/supabase/client";

/**
 * Runs a write against Supabase from the browser (RLS decides whether it's
 * allowed), then refreshes server-rendered data.
 */
export function useEditor() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = useCallback(
    async (fn: (sb: SupabaseClient) => Promise<void>) => {
      const sb = getBrowserSupabase();
      if (!sb) {
        setError("Supabase isn't configured, so edits can't be saved.");
        return false;
      }
      setSaving(true);
      setError(null);
      try {
        await fn(sb);
        router.refresh();
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [router],
  );

  return { save, saving, error, clearError: () => setError(null) };
}

/** Throws on a Supabase error so `save` can surface it. */
export function must(result: { error: { message: string } | null }) {
  if (result.error) throw new Error(result.error.message);
}
