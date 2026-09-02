import { HOUSE_MAJORITY, countHouse, daysUntil, projectHouse } from "@/lib/scoring";
import { TOTAL_HOUSE_SEATS } from "@/lib/geo/states";
import type { HouseSeat, Race } from "@/lib/types";

interface Props {
  seats: HouseSeat[];
  races: Race[];
}

const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const word = (n: number) => WORDS[n] ?? String(n);

/**
 * The hero: the seat count as a poster number, the majority line, and
 * two stacked bars (today, projected). The 218 line is the point.
 */
export function HouseControlBar({ seats, races }: Props) {
  const now = countHouse(seats);
  const proj = projectHouse(seats, races);
  const needed = Math.max(0, HOUSE_MAJORITY - now.demCaucus);
  const projNeeded = HOUSE_MAJORITY - proj.D;
  const generalDate = races.filter((r) => r.election_type === "general").map((r) => r.election_date).sort()[0] ?? "2026-11-03";
  const days = daysUntil(generalDate);
  const otherI = now.I - (now.demCaucus - now.D) - (now.repCaucus - now.R);

  const nowSegments = [
    { key: "D", label: "Democrats", value: now.demCaucus, fill: "var(--c-d)" },
    { key: "V", label: "Vacant", value: now.V, fill: "var(--c-vacant)", outline: true },
    { key: "I", label: "Independent", value: otherI, fill: "var(--c-i)" },
    { key: "R", label: "Republicans", value: now.repCaucus, fill: "var(--c-r)" },
  ].filter((s) => s.value > 0);
  const projSegments = [
    { key: "D", label: "Lean or better D", value: proj.D, fill: "var(--c-d)" },
    { key: "T", label: "Toss-up", value: proj.tossup, fill: "var(--c-tossup)" },
    { key: "R", label: "Lean or better R", value: proj.R, fill: "var(--c-r)" },
  ].filter((s) => s.value > 0);

  return (
    <section className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-end pt-8 pb-6">
      <div className="grid gap-2">
        <div className="label text-rep text-[13px]">
          The House · {days > 0 ? `${days} days to Nov 3` : days === 0 ? "Election day" : "Election held"}
        </div>
        <div className="flex items-baseline gap-4 sm:gap-6 flex-wrap">
          <div className="display text-dem text-[120px] sm:text-[160px] lg:text-[200px]">{now.demCaucus}</div>
          <div className="display text-[44px] sm:text-[56px] lg:text-[64px]">of {TOTAL_HOUSE_SEATS}</div>
        </div>
        <h1 className="display text-[34px] sm:text-[44px]">
          {needed === 0 ? "Democrats hold the majority." : `${word(needed)} seat${needed === 1 ? "" : "s"} from a majority.`}
        </h1>
        <p className="text-[17px] sm:text-[18px] leading-relaxed max-w-[560px] text-text-2">
          Ratings put Democrats at {proj.D} lean-or-better with {proj.tossup} toss-ups
          {projNeeded > 0 ? `, ${projNeeded} short of 218` : ", past 218"}. Every one of those toss-ups is on this map.
        </p>
      </div>

      <div className="grid gap-3 pb-2">
        <Bar title="Today" right="218 to win" segments={nowSegments} />
        <Bar title="Projected" right={`${proj.D} D · ${proj.tossup} toss-up · ${proj.R} R`} segments={projSegments} />
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-[14px] font-semibold pt-1">
          <Key fill="var(--c-d)" label="Democratic" />
          <Key fill="var(--c-r)" label="Republican" />
          <Key fill="var(--c-tossup)" label="Toss-up" />
          <Key fill="var(--c-vacant)" label="Vacant" outline />
          <span className="text-text-3 font-normal basis-full sm:basis-auto sm:ml-auto">Seats hold for their party unless a tracked race is rated otherwise.</span>
        </div>
      </div>
    </section>
  );
}

function Bar({ title, right, segments }: { title: string; right: string; segments: Array<{ key: string; label: string; value: number; fill: string; outline?: boolean }> }) {
  const total = TOTAL_HOUSE_SEATS;
  const majorityPct = (HOUSE_MAJORITY / total) * 100;
  return (
    <div className="grid gap-2">
      <div className="flex justify-between label">
        <span>{title}</span>
        <span>{right}</span>
      </div>
      <div className="relative h-11 flex gap-[3px] bg-surface-2" role="img" aria-label={segments.map((s) => `${s.label} ${s.value}`).join(", ")}>
        {segments.map((s) => (
          <div
            key={s.key}
            title={`${s.label}: ${s.value}`}
            style={{ width: `${(s.value / total) * 100}%`, background: s.fill, boxShadow: s.outline ? "inset 0 0 0 2px var(--text)" : undefined }}
            className="h-full flex items-center justify-center"
          >
            {s.value / total > 0.09 && <span className="display text-[22px] text-[#f3ecdc]">{s.value}</span>}
          </div>
        ))}
        <div className="absolute -top-2 -bottom-2 w-1 bg-text" style={{ left: `${majorityPct}%` }} aria-hidden />
      </div>
    </div>
  );
}

function Key({ fill, label, outline }: { fill: string; label: string; outline?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-block w-3.5 h-3.5" style={{ background: fill, boxShadow: outline ? "inset 0 0 0 2px var(--text)" : undefined }} />
      {label}
    </span>
  );
}
