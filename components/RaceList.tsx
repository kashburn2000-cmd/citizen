"use client";

import { PartyDot, RatingPill } from "./Pills";
import { daysUntil, formatDate } from "@/lib/scoring";
import { OFFICE_LABEL, type RaceView } from "@/lib/view";
import { totalScoreFill } from "@/lib/colors";

export function RaceList({ races, selectedRaceId, onSelectRace }: { races: RaceView[]; selectedRaceId: string | null; onSelectRace: (id: string) => void }) {
  const sorted = [...races].sort((a, b) => a.election_date.localeCompare(b.election_date) || a.title.localeCompare(b.title));
  return (
    <ul className="grid gap-1">
      {sorted.map((r) => {
        const days = daysUntil(r.election_date);
        const top = r.candidates.filter((c) => c.party !== "R" && c.summary.score !== null).sort((a, b) => b.summary.score! - a.summary.score!)[0];
        return (
          <li key={r.id}>
            <button
              onClick={() => onSelectRace(r.id)}
              className={`w-full text-left rounded-md border px-3 py-2 hover:bg-surface-2 ${r.id === selectedRaceId ? "border-accent" : "border-border"}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wide text-text-3 w-14 shrink-0">{OFFICE_LABEL[r.office]}</span>
                <span className="font-medium truncate">{r.title}</span>
                <span className="ml-auto shrink-0">
                  <RatingPill rating={r.rating} />
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-text-2 mt-1">
                <span>
                  {formatDate(r.election_date)}
                  {days >= 0 ? ` · ${days}d` : ""}
                </span>
                {top && (
                  <span className="inline-flex items-center gap-1 ml-auto">
                    <PartyDot party={top.party} size={8} />
                    <span className="truncate max-w-40">{top.name}</span>
                    <span className="px-1 rounded tabular-nums text-text" style={{ background: totalScoreFill(top.summary.score) }}>
                      {Math.round(top.summary.score!)}
                    </span>
                  </span>
                )}
                {!top && r.candidates.length > 0 && <span className="ml-auto text-text-3">{r.candidates.length} candidates</span>}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
