import Link from "next/link";
import { getViewer } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function Nav() {
  const configured = isSupabaseConfigured();
  const viewer = configured ? await getViewer() : null;
  return (
    <header className="border-b border-border bg-surface">
      <div className="max-w-[1400px] mx-auto px-4 h-12 flex items-center gap-6 text-sm">
        <Link href="/" className="font-semibold tracking-tight">
          Progressive Races <span className="text-text-3 font-normal">2026</span>
        </Link>
        <nav className="flex items-center gap-4 text-text-2">
          <Link href="/" className="hover:text-text">
            Map
          </Link>
          <Link href="/matrix" className="hover:text-text">
            Matrix
          </Link>
          <Link href="/issues" className="hover:text-text">
            Rubric
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-3 text-text-2">
          {!configured && (
            <span className="hidden sm:inline text-xs px-2 py-0.5 rounded bg-surface-2 border border-border" title="Add Supabase keys to enable editing. See docs/SETUP.md.">
              Read-only preview
            </span>
          )}
          {configured && viewer?.userId && (
            <>
              <Link href="/login" className="text-xs hover:underline" title="Account: set a password or sign out">
                {viewer.email}
                {viewer.canEdit ? " · editor" : " · viewer"}
              </Link>
              <form action="/auth/signout" method="post">
                <button className="text-xs underline" type="submit">
                  Sign out
                </button>
              </form>
            </>
          )}
          {configured && !viewer?.userId && (
            <Link href="/login" className="text-xs underline">
              Sign in to edit
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
