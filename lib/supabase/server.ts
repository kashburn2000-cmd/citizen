import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseEnv } from "./env";
import type { Profile } from "../types";

/** Server client bound to the current request's cookies. Null in static mode. */
export async function getServerSupabase(): Promise<SupabaseClient | null> {
  const env = supabaseEnv();
  if (!env) return null;
  const cookieStore = await cookies();
  return createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component; proxy.ts refreshes the session instead.
        }
      },
    },
  });
}

export interface Viewer {
  userId: string | null;
  email: string | null;
  profile: Profile | null;
  canEdit: boolean;
}

/** Who is looking at the page, and whether they may edit. */
export async function getViewer(): Promise<Viewer> {
  const supabase = await getServerSupabase();
  if (!supabase) return { userId: null, email: null, profile: null, canEdit: false };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { userId: null, email: null, profile: null, canEdit: false };
  const { data: profile } = await supabase.from("profiles").select("id, email, role").eq("id", user.id).maybeSingle();
  const p = (profile as Profile | null) ?? null;
  return {
    userId: user.id,
    email: user.email ?? null,
    profile: p,
    canEdit: p?.role === "editor" || p?.role === "admin",
  };
}
