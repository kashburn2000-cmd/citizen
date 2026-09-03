"use client";

import { useMemo } from "react";
import { MapTip, useMapTip } from "./mapUtils";
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
  const { tip, hover, tap, hide, svgProps } = useMapTip();
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
        {...svgProps}
      >
        {layout.states.map((s) => {
          const list = byState.get(s.postal);
          const primary = list?.[0];
          const lines = () => {
            const out = [s.name];
            if (list) for (const r of list) out.push(`${r.title}${r.rating ? ` · ${RATING_LABEL[r.rating]}` : ""}`);
            else out.push(`No tracked ${office} race`);
            return out;
          };
          return (
            <path
              key={s.postal}
              d={s.d}
              fill={primary ? ratingFill(primary.rating) : "var(--surface-2)"}
              className={primary ? "pin" : undefined}
              onClick={(e) => {
                if (primary) {
                  onSelectRace(primary.id === selectedRaceId ? null : primary.id);
                  hide();
                } else tap(e, lines());
              }}
              onPointerMove={(e) => hover(e, lines())}
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
      <MapTip tip={tip} onDismiss={hide} />
    </div>
  );
}
