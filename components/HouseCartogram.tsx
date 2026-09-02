"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { select } from "d3-selection";
import { zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom";
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
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [tip, setTip] = useState<{ x: number; y: number; lines: string[] } | null>(null);

  const seatById = useMemo(() => new Map(seats.map((s) => [s.id, s])), [seats]);
  const raceBySeat = useMemo(() => {
    const m = new Map<string, RaceView>();
    for (const r of races) if (r.office === "house" && r.seat_id && r.tracked) m.set(r.seat_id, r);
    return m;
  }, [races]);
  const d = useMemo(() => hexPath(layout.hexRadius - 0.9), [layout.hexRadius]);

  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;
    const svg = select(svgRef.current);
    const g = select(gRef.current);
    const z = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 6])
      .translateExtent([
        [0, 0],
        [layout.width, layout.height],
      ])
      .on("zoom", (e) => g.attr("transform", e.transform.toString()));
    svg.call(z);
    zoomRef.current = z;
    return () => {
      svg.on(".zoom", null);
    };
  }, [layout.width, layout.height]);

  const resetZoom = () => {
    if (svgRef.current && zoomRef.current) select(svgRef.current).call(zoomRef.current.transform, zoomIdentity);
  };

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        className="w-full h-auto select-none"
        role="img"
        aria-label="House seats by party, one hexagon per seat"
        onMouseLeave={() => setTip(null)}
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
            return (
              <path
                key={h.id}
                d={d}
                transform={`translate(${h.x},${h.y})`}
                fill={fill}
                stroke={isVacant ? "var(--text-3)" : undefined}
                strokeDasharray={isVacant ? "2 2" : undefined}
                className={cls}
                onClick={() => onSelectRace(race ? (race.id === selectedRaceId ? null : race.id) : null)}
                onMouseMove={(e) => {
                  const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                  const lines = [seatLabel(h.state, h.district)];
                  if (seat) lines.push(seat.incumbent_party === "V" ? "Vacant" : `${seat.incumbent_name ?? "?"} (${seat.incumbent_party})`);
                  if (projection) lines.push(`Projected: ${holder === "tossup" ? "toss-up" : holder}`);
                  if (race) lines.push(`Tracked: ${race.title}`);
                  else if (seat?.notes) lines.push(seat.notes);
                  setTip({ x: e.clientX - rect.left, y: e.clientY - rect.top, lines });
                }}
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
      <button onClick={resetZoom} className="btn absolute bottom-3 right-3 bg-bg">
        Reset zoom
      </button>
    </div>
  );
}
