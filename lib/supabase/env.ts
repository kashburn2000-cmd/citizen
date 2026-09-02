/**
 * Reads Supabase config from the environment on the server.
 *
 * Accepts every name Supabase's docs and its Vercel integration have used,
 * so it works whether you pasted keys by hand or let the integration set
 * them. The values reach the browser through SupabaseProvider, not through
 * NEXT_PUBLIC_ inlining, so the prefix doesn't matter either.
 */
export interface SupabaseConfig {
  url: string;
  key: string;
}

const URL_NAMES = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"];
const KEY_NAMES = [
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_PUBLISHABLE_DEFAULT_KEY",
  "SUPABASE_ANON_KEY",
];

function first(names: string[]): string | undefined {
  for (const n of names) {
    const v = process.env[n];
    if (v && v.trim()) return v.trim();
  }
  return undefined;
}

export function supabaseEnv(): SupabaseConfig | null {
  const url = first(URL_NAMES);
  const key = first(KEY_NAMES);
  if (!url || !key) return null;
  return { url, key };
}

export function isSupabaseConfigured(): boolean {
  return supabaseEnv() !== null;
}
