"use client";

import { RatingPill } from "./Pills";
import { daysUntil, formatDate } from "@/lib/scoring";
import { OFFICE_LABEL, OUT, type RaceView } from "@/lib/view";

export function RaceList({ races, selectedRaceId, onSelectRace }: { races: RaceView[]; selectedRaceId: string | null; onSelectRace: (id: string) => void }) {
  const sorted = [...races].sort((a, b) => a.election_date.localeCompare(b.election_date) || a.title.localeCompare(b.title));
  return (
    <ul className="grid">
      {sorted.map((r) => {
        const days = daysUntil(r.election_date);
        const top = r.candidates.filter((c) => c.party !== "R" && c.summary.score !== null && !OUT.has(c.status)).sort((a, b) => b.summary.score! - a.summary.score!)[0];
        const selected = r.id === selectedRaceId;
        return (
          <li key={r.id} className="border-t-2 border-border-soft first:border-t-0">
            <button onClick={() => onSelectRace(r.id)} className={`w-full text-left py-3.5 px-1 grid gap-1.5 hover:bg-surface-2 ${selected ? "bg-surface-2" : ""}`}>
              <div className="flex items-start gap-3">
                <span className="display text-[22px] leading-none min-w-0 flex-1">{r.title.replace(/\s*\(.*\)$/, "")}</span>
                <RatingPill rating={r.rating} />
              </div>
              <div className="flex items-center gap-2 text-[13px] text-text-2 flex-wrap">
                <span className="label text-[10px] text-text-3">{OFFICE_LABEL[r.office]}</span>
                <span>{formatDate(r.election_date)}{days >= 0 ? ` · ${days}d` : ""}</span>
                {top && (
                  <span className="ml-auto inline-flex items-center gap-2">
                    <span className="truncate max-w-44">{top.name}</span>
                    <span className="display text-[18px] text-dem leading-none">{Math.round(top.summary.score!)}</span>
                  </span>
                )}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
