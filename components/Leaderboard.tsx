import Link from "next/link";
import { OUT, type RaceView } from "@/lib/view";

/** The six highest-scoring non-Republican candidates still in the running. */
export function Leaderboard({ races }: { races: RaceView[] }) {
  const rows = races
    .filter((r) => r.tracked)
    .flatMap((r) =>
      r.candidates
        .filter((c) => c.party !== "R" && c.summary.score !== null && !OUT.has(c.status))
        .map((c) => ({ candidate: c, race: r })),
    )
    .sort((a, b) => b.candidate.summary.score! - a.candidate.summary.score! || a.candidate.name.localeCompare(b.candidate.name))
    .slice(0, 6);
  if (rows.length === 0) return null;
  return (
    <section className="grid gap-4 pt-10">
      <div className="flex items-baseline gap-4 flex-wrap">
        <h2 className="display text-[34px] sm:text-[40px]">Most progressive on the ballot</h2>
        <Link href="/matrix" className="text-[15px] font-semibold text-text-3 hover:underline underline-offset-4">
          Weighted 0 to 100 across 12 issues · see everyone
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {rows.map(({ candidate, race }) => (
          <Link key={candidate.id} href={`/?race=${race.id}`} className="grid gap-1 border-[3px] border-border p-3.5 hover:bg-surface-2">
            <span className="display text-[52px] text-dem leading-none">{Math.round(candidate.summary.score!)}</span>
            <span className="font-extrabold text-[15px] leading-tight">{candidate.name}</span>
            <span className="label text-text-3 text-[11px]">{race.title.replace(/\s*\(.*\)$/, "")}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
