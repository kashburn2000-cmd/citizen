import Link from "next/link";
import { getViewer } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function Nav() {
  const configured = isSupabaseConfigured();
  const viewer = configured ? await getViewer() : null;
  return (
    <header className="border-b-4 border-border bg-bg">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 min-h-16 py-3 flex flex-wrap items-center gap-x-6 gap-y-1">
        <Link href="/" className="display text-[26px] sm:text-[30px] leading-none whitespace-nowrap py-1">
          Progressive Races <span className="text-rep">2026</span>
        </Link>
        <nav className="ml-auto flex flex-wrap items-center gap-x-5 sm:gap-x-7 label text-[13px] [&>a]:py-2">
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
          {viewer?.canEdit && (
            <a href="/api/export" className="hover:underline underline-offset-8 decoration-4" title="Download every table as an Excel workbook">
              Export
            </a>
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
