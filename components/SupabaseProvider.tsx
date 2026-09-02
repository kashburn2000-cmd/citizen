"use client";

import { createContext, useContext } from "react";
import type { SupabaseConfig } from "@/lib/supabase/env";

const SupabaseConfigContext = createContext<SupabaseConfig | null>(null);

/** Hands the (public) Supabase URL and publishable key from the server to client components. */
export function SupabaseProvider({ config, children }: { config: SupabaseConfig | null; children: React.ReactNode }) {
  return <SupabaseConfigContext.Provider value={config}>{children}</SupabaseConfigContext.Provider>;
}

export function useSupabaseConfig(): SupabaseConfig | null {
  return useContext(SupabaseConfigContext);
}
