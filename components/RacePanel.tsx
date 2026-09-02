"use client";

import Link from "next/link";
import { CandidateCard } from "./CandidateCard";
import { RatingPill } from "./Pills";
import { useEditor, must } from "./edit/useEditor";
import { RATING_LABEL, RATING_ORDER, daysUntil, formatDate } from "@/lib/scoring";
import { OFFICE_LABEL, type RaceView } from "@/lib/view";
import { STATE_BY_POSTAL } from "@/lib/geo/states";
import type { Issue, Rating } from "@/lib/types";

export function RacePanel({ race, issues, canEdit, onClose }: { race: RaceView; issues: Issue[]; canEdit: boolean; onClose?: () => void }) {
  const { save, saving, error } = useEditor();
  const days = daysUntil(race.election_date);
  const stateName = STATE_BY_POSTAL[race.state]?.name ?? race.state;
  return (
    <div className="grid gap-5">
      <header className="grid gap-3">
        <div className="flex items-start gap-3">
          <div className="label text-accent text-[12px] flex-1">
            {race.rating ? RATING_LABEL[race.rating] : "Unrated"} · {OFFICE_LABEL[race.office]} · {stateName}
            {race.election_type !== "general" && ` · ${race.election_type.replace("_", " ")}`}
          </div>
          {onClose && (
            <button onClick={onClose} className="label text-[11px] underline underline-offset-4 decoration-2 shrink-0" aria-label="Close race">
              Close
            </button>
          )}
        </div>
        <h3 className="display text-[40px] sm:text-[48px]">
          <Link href={`/races/${race.id}`} className="hover:underline underline-offset-8 decoration-4">
            {race.title.replace(/\s*\(.*\)$/, "")}
          </Link>
        </h3>
        {race.title.includes("(") && <div className="text-[15px] text-text-2 -mt-1">{race.title.replace(/^.*\((.*)\)$/, "$1")}</div>}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[15px]">
          <span className="font-semibold">{formatDate(race.election_date)}</span>
          <span className="text-text-2">{days > 0 ? `in ${days} days` : days === 0 ? "today" : `${-days} days ago`}</span>
          {race.incumbent_name && (
            <span className="text-text-2">
              {race.is_open_seat ? "Vacated by" : "Incumbent"} {race.incumbent_name}
              {race.incumbent_party ? ` (${race.incumbent_party})` : ""}
            </span>
          )}
          {canEdit && (
            <select value={race.rating ?? ""} disabled={saving} onChange={(e) => save(async (sb) => must(await sb.from("races").update({ rating: (e.target.value || null) as Rating | null }).eq("id", race.id)))} aria-label="Race rating">
              <option value="">Unrated</option>
              {RATING_ORDER.map((r) => (
                <option key={r} value={r}>
                  {RATING_LABEL[r]}
                </option>
              ))}
            </select>
          )}
          {!canEdit && !race.rating && <RatingPill rating={null} />}
        </div>
        {race.why_it_matters && <p className="text-[16px] leading-relaxed">{race.why_it_matters}</p>}
        {race.notes && <p className="text-[13px] leading-relaxed text-text-3">{race.notes}</p>}
        {error && <p className="text-[13px] text-[color:var(--signal-neg)]">{error}</p>}
      </header>

      <section className="grid gap-4">
        <h4 className="label text-accent">Candidates</h4>
        {race.candidates.length === 0 && <p className="text-text-3">No candidates entered yet.</p>}
        {race.candidates.map((c) => (
          <CandidateCard key={c.id} candidate={c} issues={issues} canEdit={canEdit} />
        ))}
      </section>
    </div>
  );
}
