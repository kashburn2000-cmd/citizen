"use client";

import { useMemo, useRef } from "react";
import { MapTip, useMapTip, useMapZoom } from "./mapUtils";
import { seatFill } from "@/lib/colors";
import { seatLabel } from "@/lib/geo/states";
import type { HouseSeat, SeatParty } from "@/lib/types";
import type { RaceView } from "@/lib/view";

export interface CartogramLayout {
  width: number;
  height: number;
  hexRadius: number;
  states: Array<{ state: string; x: number; y: number; r: number; seats: number }>;
  seats: Array<{ id: string; state: string; district: number; x: number; y: number }>;
}

interface Props {
  layout: CartogramLayout;
  seats: HouseSeat[];
  races: RaceView[];
  /** Per-seat projected holder when the projection toggle is on. */
  projection: Map<string, SeatParty | "tossup"> | null;
  selectedRaceId: string | null;
  onSelectRace: (raceId: string | null) => void;
  dimUntracked: boolean;
}

function hexPath(r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i + 30);
    pts.push(`${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join("L")}Z`;
}

export function HouseCartogram({ layout, seats, races, projection, selectedRaceId, onSelectRace, dimUntracked }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const { zoomed, resetZoom } = useMapZoom(svgRef, gRef, layout.width, layout.height, 6);
  const { tip, hover, tap, hide, svgProps } = useMapTip();

  const seatById = useMemo(() => new Map(seats.map((s) => [s.id, s])), [seats]);
  const raceBySeat = useMemo(() => {
    const m = new Map<string, RaceView>();
    for (const r of races) if (r.office === "house" && r.seat_id && r.tracked) m.set(r.seat_id, r);
    return m;
  }, [races]);
  const d = useMemo(() => hexPath(layout.hexRadius - 0.9), [layout.hexRadius]);

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        className="w-full h-auto select-none"
        role="img"
        aria-label="House seats by party, one hexagon per seat"
        {...svgProps}
      >
        <g ref={gRef}>
          {layout.seats.map((h) => {
            const seat = seatById.get(h.id);
            const race = raceBySeat.get(h.id);
            const holder = projection ? (projection.get(h.id) ?? "tossup") : (seat?.incumbent_party ?? "V");
            const fill = seatFill(holder, seat?.caucuses_with);
            const isVacant = !projection && seat?.incumbent_party === "V";
            const cls = ["hex", race ? "tracked" : "", race && race.id === selectedRaceId ? "selected" : "", dimUntracked && !race ? "dim" : ""]
              .filter(Boolean)
              .join(" ");
            const lines = () => {
              const out = [seatLabel(h.state, h.district)];
              if (seat) out.push(seat.incumbent_party === "V" ? "Vacant" : `${seat.incumbent_name ?? "?"} (${seat.incumbent_party})`);
              if (projection) out.push(`Projected: ${holder === "tossup" ? "toss-up" : holder}`);
              if (race) out.push(`Tracked: ${race.title}`);
              else if (seat?.notes) out.push(seat.notes);
              return out;
            };
            return (
              <path
                key={h.id}
                d={d}
                transform={`translate(${h.x},${h.y})`}
                fill={fill}
                stroke={isVacant ? "var(--text-3)" : undefined}
                strokeDasharray={isVacant ? "2 2" : undefined}
                className={cls}
                onClick={(e) => {
                  onSelectRace(race ? (race.id === selectedRaceId ? null : race.id) : null);
                  if (race) hide();
                  else tap(e, lines());
                }}
                onPointerMove={(e) => hover(e, lines())}
              />
            );
          })}
          {layout.states.map((s) => (
            <text
              key={s.state}
              x={s.x}
              y={s.y - s.r - 3}
              textAnchor="middle"
              fontSize={10.5}
              fontWeight={800}
              fill="var(--text)"
              className="pointer-events-none"
            >
              {s.state}
            </text>
          ))}
        </g>
      </svg>
      <MapTip tip={tip} onDismiss={hide} />
      {zoomed && (
        <button onClick={resetZoom} className="btn absolute top-2 right-2 bg-bg px-3 py-2 text-[12px]">
          Reset zoom
        </button>
      )}
    </div>
  );
}
