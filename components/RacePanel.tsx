"use client";

import Link from "next/link";
import { CandidateCard } from "./CandidateCard";
import { RatingPill, Tag } from "./Pills";
import { useEditor, must } from "./edit/useEditor";
import { RATING_LABEL, RATING_ORDER, daysUntil, formatDate } from "@/lib/scoring";
import { OFFICE_LABEL, type RaceView } from "@/lib/view";
import type { Issue, Rating } from "@/lib/types";

export function RacePanel({ race, issues, canEdit, onClose }: { race: RaceView; issues: Issue[]; canEdit: boolean; onClose?: () => void }) {
  const { save, saving, error } = useEditor();
  const days = daysUntil(race.election_date);
  return (
    <div className="grid gap-4">
      <header className="grid gap-2">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-xs text-text-2 uppercase tracking-wide">
              {OFFICE_LABEL[race.office]} · {race.state}
              {race.election_type !== "general" && ` · ${race.election_type.replace("_", " ")}`}
            </div>
            <h3 className="text-lg font-semibold leading-tight">
              <Link href={`/races/${race.id}`} className="hover:underline">
                {race.title}
              </Link>
            </h3>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-xs text-text-2 underline shrink-0" aria-label="Close race">
              Close
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-text">{formatDate(race.election_date)}</span>
          <span className="text-text-2">
            {days > 0 ? `in ${days} days` : days === 0 ? "today" : `${-days} days ago`}
          </span>
          {canEdit ? (
            <select
              value={race.rating ?? ""}
              disabled={saving}
              onChange={(e) => save(async (sb) => must(await sb.from("races").update({ rating: (e.target.value || null) as Rating | null }).eq("id", race.id)))}
              aria-label="Race rating"
            >
              <option value="">Unrated</option>
              {RATING_ORDER.map((r) => (
                <option key={r} value={r}>
                  {RATING_LABEL[r]}
                </option>
              ))}
            </select>
          ) : (
            <RatingPill rating={race.rating} />
          )}
          {race.is_open_seat && <Tag>Open seat</Tag>}
          {race.incumbent_name && (
            <span className="text-text-2">
              {race.is_open_seat ? "Vacated by" : "Incumbent"} {race.incumbent_name}
              {race.incumbent_party ? ` (${race.incumbent_party})` : ""}
            </span>
          )}
          {race.needs_review && <Tag>Unverified</Tag>}
        </div>
        {race.why_it_matters && <p className="text-sm">{race.why_it_matters}</p>}
        {race.notes && <p className="text-xs text-text-2">{race.notes}</p>}
        {error && <p className="text-xs text-[color:var(--signal-neg)]">{error}</p>}
      </header>

      <section className="grid gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-text-2">Candidates</h4>
        {race.candidates.length === 0 && <p className="text-sm text-text-3">No candidates entered yet.</p>}
        {race.candidates.map((c) => (
          <CandidateCard key={c.id} candidate={c} issues={issues} canEdit={canEdit} />
        ))}
      </section>
    </div>
  );
}
