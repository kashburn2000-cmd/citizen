import { HOUSE_MAJORITY, countHouse, projectHouse } from "@/lib/scoring";
import { TOTAL_HOUSE_SEATS } from "@/lib/geo/states";
import type { HouseSeat, Race } from "@/lib/types";

interface Props {
  seats: HouseSeat[];
  races: Race[];
}

/**
 * Two stacked bars: who holds the House today, and where the tracked race
 * ratings put it after November. The 218 line is the only thing that matters.
 */
export function HouseControlBar({ seats, races }: Props) {
  const now = countHouse(seats);
  const proj = projectHouse(seats, races);
  const nowSegments = [
    { key: "D", label: "Democrats", value: now.demCaucus, fill: "var(--c-d)" },
    { key: "V", label: "Vacant", value: now.V, fill: "var(--c-vacant)", outline: true },
    { key: "I", label: "Independent", value: now.I - (now.demCaucus - now.D) - (now.repCaucus - now.R), fill: "var(--c-i)" },
    { key: "R", label: "Republicans", value: now.repCaucus, fill: "var(--c-r)" },
  ].filter((s) => s.value > 0);
  const projSegments = [
    { key: "D", label: "Lean or better D", value: proj.D, fill: "var(--c-d)" },
    { key: "T", label: "Toss-up", value: proj.tossup, fill: "var(--c-tossup)" },
    { key: "R", label: "Lean or better R", value: proj.R, fill: "var(--c-r)" },
  ].filter((s) => s.value > 0);
  const needed = Math.max(0, HOUSE_MAJORITY - now.demCaucus);
  const projNeeded = Math.max(0, HOUSE_MAJORITY - proj.D);

  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 mb-3">
        <h2 className="text-sm font-semibold">House control</h2>
        <p className="text-sm text-text-2">
          Democrats hold <span className="font-semibold text-text">{now.demCaucus}</span> of {TOTAL_HOUSE_SEATS}. They need{" "}
          <span className="font-semibold text-text">{needed}</span> more for a majority.
        </p>
        <p className="text-sm text-text-2">
          Ratings put them at <span className="font-semibold text-text">{proj.D}</span> lean-or-better, {proj.tossup} toss-ups,{" "}
          {projNeeded === 0 ? "already past 218" : `${projNeeded} short of 218`}.
        </p>
      </div>
      <Bar title="Today" segments={nowSegments} />
      <Bar title="Projected" segments={projSegments} />
      <div className="flex flex-wrap gap-4 mt-2 text-xs text-text-2">
        <Key fill="var(--c-d)" label="Democratic" />
        <Key fill="var(--c-r)" label="Republican" />
        <Key fill="var(--c-tossup)" label="Toss-up" />
        <Key fill="var(--c-vacant)" label="Vacant" outline />
        <span className="ml-auto">Projection: each seat holds for its party unless a tracked race is rated otherwise.</span>
      </div>
    </section>
  );
}

function Bar({ title, segments }: { title: string; segments: Array<{ key: string; label: string; value: number; fill: string; outline?: boolean }> }) {
  const total = TOTAL_HOUSE_SEATS;
  const majorityPct = (HOUSE_MAJORITY / total) * 100;
  return (
    <div className="flex items-center gap-3 mb-2">
      <div className="w-20 text-xs text-text-2 text-right shrink-0">{title}</div>
      <div className="relative flex-1 h-6 rounded overflow-hidden bg-surface-2" role="img" aria-label={segments.map((s) => `${s.label} ${s.value}`).join(", ")}>
        <div className="absolute inset-0 flex">
          {segments.map((s, i) => (
            <div
              key={s.key}
              title={`${s.label}: ${s.value}`}
              style={{
                width: `${(s.value / total) * 100}%`,
                background: s.fill,
                marginLeft: i === 0 ? 0 : 2,
                boxShadow: s.outline ? "inset 0 0 0 1px var(--text-3)" : undefined,
              }}
              className="h-full flex items-center justify-center text-[11px] font-medium"
            >
              {s.value / total > 0.08 && <span className="text-white font-semibold drop-shadow-[0_0_1px_rgba(0,0,0,0.6)]">{s.value}</span>}
            </div>
          ))}
        </div>
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-text"
          style={{ left: `${majorityPct}%` }}
          aria-hidden
        />
      </div>
      <div className="w-10 text-xs text-text-2 shrink-0">218</div>
    </div>
  );
}

function Key({ fill, label, outline }: { fill: string; label: string; outline?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block w-3 h-3 rounded-sm" style={{ background: fill, boxShadow: outline ? "inset 0 0 0 1px var(--text-3)" : undefined }} />
      {label}
    </span>
  );
}
