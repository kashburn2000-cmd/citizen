import Link from "next/link";
import { getViewer } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function Nav() {
  const configured = isSupabaseConfigured();
  const viewer = configured ? await getViewer() : null;
  return (
    <header className="border-b-4 border-border bg-bg">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 h-16 flex items-center gap-6">
        <Link href="/" className="display text-[26px] sm:text-[30px] leading-none">
          Progressive Races <span className="text-rep">2026</span>
        </Link>
        <nav className="ml-auto flex items-center gap-5 sm:gap-7 label text-[13px]">
          <Link href="/" className="hover:underline underline-offset-8 decoration-4">
            Map
          </Link>
          <Link href="/matrix" className="hover:underline underline-offset-8 decoration-4">
            Matrix
          </Link>
          <Link href="/issues" className="hover:underline underline-offset-8 decoration-4">
            Rubric
          </Link>
          {!configured && (
            <span className="hidden sm:inline text-text-3" title="Add Supabase keys to enable editing. See docs/SETUP.md.">
              Preview
            </span>
          )}
          {configured && viewer?.userId && (
            <Link href="/login" className="text-rep hover:underline underline-offset-8 decoration-4" title="Account">
              {viewer.canEdit ? "Editor" : "Viewer"}
            </Link>
          )}
          {configured && !viewer?.userId && (
            <Link href="/login" className="text-rep hover:underline underline-offset-8 decoration-4">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
