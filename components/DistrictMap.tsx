"use client";

import { useMemo, useRef } from "react";
import { feature, mesh } from "topojson-client";
import { geoIdentity, geoPath } from "d3-geo";
import { MapTip, useMapTip, useMapZoom } from "./mapUtils";
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
  const { zoomed, resetZoom } = useMapZoom(svgRef, gRef, WIDTH, HEIGHT, 12);
  const { tip, hover, tap, hide, svgProps } = useMapTip();

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

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto select-none"
        role="img"
        aria-label="House districts by party"
        {...svgProps}
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
            const lines = () => {
              const out = [seatLabel(dist.state, dist.district)];
              if (seat) out.push(seat.incumbent_party === "V" ? "Vacant" : `${seat.incumbent_name ?? "?"} (${seat.incumbent_party})`);
              if (projection) out.push(`Projected: ${holder === "tossup" ? "toss-up" : holder}`);
              if (race) out.push(`Tracked: ${race.title}`);
              else if (seat?.notes) out.push(seat.notes);
              return out;
            };
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
                onClick={(e) => {
                  onSelectRace(race ? (race.id === selectedRaceId ? null : race.id) : null);
                  if (race) hide();
                  else tap(e, lines());
                }}
                onPointerMove={(e) => hover(e, lines())}
              />
            );
          })}
          <path d={borders} fill="none" stroke="var(--text)" strokeWidth={0.7} strokeOpacity={0.5} pointerEvents="none" vectorEffect="non-scaling-stroke" />
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
