"use client";

import { useMemo, useState } from "react";
import { ratingFill } from "@/lib/colors";
import { RATING_LABEL } from "@/lib/scoring";
import type { RaceView } from "@/lib/view";
import type { Office } from "@/lib/types";

export interface StatesLayout {
  width: number;
  height: number;
  states: Array<{ postal: string; name: string; d: string; cx: number; cy: number }>;
  borders: string;
}

interface Props {
  layout: StatesLayout;
  races: RaceView[];
  office: Exclude<Office, "house">;
  selectedRaceId: string | null;
  onSelectRace: (raceId: string | null) => void;
}

/** Geographic map for statewide races: states shaded by rating, a pin per tracked race. */
export function StateMap({ layout, races, office, selectedRaceId, onSelectRace }: Props) {
  const [tip, setTip] = useState<{ x: number; y: number; lines: string[] } | null>(null);
  const byState = useMemo(() => {
    const m = new Map<string, RaceView[]>();
    for (const r of races) {
      if (r.office !== office || !r.tracked) continue;
      m.set(r.state, [...(m.get(r.state) ?? []), r]);
    }
    return m;
  }, [races, office]);

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        className="w-full h-auto select-none"
        role="img"
        aria-label={`${office} races by state`}
        onMouseLeave={() => setTip(null)}
      >
        {layout.states.map((s) => {
          const list = byState.get(s.postal);
          const primary = list?.[0];
          return (
            <path
              key={s.postal}
              d={s.d}
              fill={primary ? ratingFill(primary.rating) : "var(--surface-2)"}
              className={primary ? "pin" : undefined}
              onClick={() => primary && onSelectRace(primary.id === selectedRaceId ? null : primary.id)}
              onMouseMove={(e) => {
                const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                const lines = [s.name];
                if (list) for (const r of list) lines.push(`${r.title}${r.rating ? ` · ${RATING_LABEL[r.rating]}` : ""}`);
                else lines.push(`No tracked ${office} race`);
                setTip({ x: e.clientX - rect.left, y: e.clientY - rect.top, lines });
              }}
            />
          );
        })}
        <path d={layout.borders} fill="none" stroke="var(--bg)" strokeWidth={1.2} pointerEvents="none" />
        {layout.states.map((s) => {
          const list = byState.get(s.postal);
          if (!list) return null;
          return list.map((r, i) => {
            const selected = r.id === selectedRaceId;
            return (
              <g key={r.id} transform={`translate(${s.cx + i * 14},${s.cy})`} className="pin" onClick={() => onSelectRace(selected ? null : r.id)}>
                <circle r={selected ? 10 : 8} fill={selected ? "var(--accent)" : "var(--text)"} stroke="var(--bg)" strokeWidth={2.5} />
                <circle r={selected ? 4 : 3} fill={selected ? "var(--text)" : "var(--bg)"} />
              </g>
            );
          });
        })}
      </svg>
      {tip && (
        <div
          className="pointer-events-none absolute z-10 border-[3px] border-border bg-bg px-3 py-2 text-[13px] max-w-72"
          style={{ left: tip.x + 12, top: tip.y + 12 }}
        >
          {tip.lines.map((l, i) => (
            <div key={i} className={i === 0 ? "display text-[18px]" : "text-text-2"}>
              {l}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
