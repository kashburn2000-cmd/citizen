"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { feature, mesh } from "topojson-client";
import { geoIdentity, geoPath } from "d3-geo";
import { select } from "d3-selection";
import { zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { FeatureCollection, Geometry } from "geojson";
import { seatFill } from "@/lib/colors";
import { STATE_BY_FIPS, seatId, seatLabel } from "@/lib/geo/states";
import type { HouseSeat, SeatParty } from "@/lib/types";
import type { RaceView } from "@/lib/view";

type DistrictProps = { id: string; state: string; cd: string };
export type DistrictTopology = Topology<{ [name: string]: GeometryCollection<DistrictProps> }>;

interface Props {
  topo: DistrictTopology;
  seats: HouseSeat[];
  races: RaceView[];
  projection: Map<string, SeatParty | "tossup"> | null;
  selectedRaceId: string | null;
  onSelectRace: (raceId: string | null) => void;
  dimUntracked: boolean;
}

const WIDTH = 975;
const HEIGHT = 610;

/** Geographic House map from Census 119th Congress boundaries (see scripts/build-districts.sh). */
export function DistrictMap({ topo, seats, races, projection, selectedRaceId, onSelectRace, dimUntracked }: Props) {
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

  const { districts, borders } = useMemo(() => {
    const obj = Object.values(topo.objects)[0];
    const fc = feature(topo, obj) as FeatureCollection<Geometry, DistrictProps>;
    // mapshaper wrote projected meters with north up; flip Y and fit the frame.
    const proj = geoIdentity().reflectY(true).fitSize([WIDTH, HEIGHT], fc);
    const path = geoPath(proj);
    const districts = fc.features.map((f) => {
      const info = STATE_BY_FIPS[f.properties.state];
      const cd = Number(f.properties.cd);
      const id = info ? seatId(info.postal, info.seats === 1 ? 0 : cd) : f.properties.id;
      return { id, state: info?.postal ?? f.properties.state, district: info?.seats === 1 ? 0 : cd, d: path(f) ?? "" };
    });
    const stateOf = (g: { properties?: unknown }) => (g.properties as DistrictProps | undefined)?.state;
    const borders = path(mesh(topo, obj, (a, b) => stateOf(a) !== stateOf(b))) ?? "";
    return { districts, borders };
  }, [topo]);

  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;
    const svg = select(svgRef.current);
    const g = select(gRef.current);
    const z = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 12])
      .translateExtent([
        [0, 0],
        [WIDTH, HEIGHT],
      ])
      .on("zoom", (e) => g.attr("transform", e.transform.toString()));
    svg.call(z);
    zoomRef.current = z;
    return () => {
      svg.on(".zoom", null);
    };
  }, []);

  const resetZoom = () => {
    if (svgRef.current && zoomRef.current) select(svgRef.current).call(zoomRef.current.transform, zoomIdentity);
  };

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto select-none"
        role="img"
        aria-label="House districts by party"
        onMouseLeave={() => setTip(null)}
      >
        <g ref={gRef}>
          {districts.map((dist) => {
            const seat = seatById.get(dist.id);
            const race = raceBySeat.get(dist.id);
            const holder = projection ? (projection.get(dist.id) ?? "tossup") : (seat?.incumbent_party ?? "V");
            const isVacant = !projection && seat?.incumbent_party === "V";
            const cls = ["hex", race ? "tracked" : "", race && race.id === selectedRaceId ? "selected" : "", dimUntracked && !race ? "dim" : ""]
              .filter(Boolean)
              .join(" ");
            return (
              <path
                key={dist.id}
                d={dist.d}
                fill={seatFill(holder, seat?.caucuses_with)}
                stroke={isVacant ? "var(--text-3)" : "var(--surface)"}
                strokeWidth={isVacant ? 0.8 : 0.4}
                strokeDasharray={isVacant ? "2 2" : undefined}
                className={cls}
                vectorEffect="non-scaling-stroke"
                onClick={() => onSelectRace(race ? (race.id === selectedRaceId ? null : race.id) : null)}
                onMouseMove={(e) => {
                  const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                  const lines = [seatLabel(dist.state, dist.district)];
                  if (seat) lines.push(seat.incumbent_party === "V" ? "Vacant" : `${seat.incumbent_name ?? "?"} (${seat.incumbent_party})`);
                  if (projection) lines.push(`Projected: ${holder === "tossup" ? "toss-up" : holder}`);
                  if (race) lines.push(`Tracked: ${race.title}`);
                  else if (seat?.notes) lines.push(seat.notes);
                  setTip({ x: e.clientX - rect.left, y: e.clientY - rect.top, lines });
                }}
              />
            );
          })}
          <path d={borders} fill="none" stroke="var(--text)" strokeWidth={0.7} strokeOpacity={0.5} pointerEvents="none" vectorEffect="non-scaling-stroke" />
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
