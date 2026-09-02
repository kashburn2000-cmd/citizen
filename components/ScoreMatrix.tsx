"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PartyDot } from "./Pills";
import { scoreFill, totalScoreFill } from "@/lib/colors";
import { OFFICE_LABEL, buildRaceViews, type CandidateView, type RaceView } from "@/lib/view";
import type { Dataset, Office } from "@/lib/types";

type SortKey = "total" | "name" | "race" | `issue:${string}`;

interface Row {
  candidate: CandidateView;
  race: RaceView;
}

export function ScoreMatrix({ data }: { data: Dataset }) {
  const [office, setOffice] = useState<Office | "all">("all");
  const [demOnly, setDemOnly] = useState(true);
  const [scoredOnly, setScoredOnly] = useState(true);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("total");
  const [desc, setDesc] = useState(true);

  const issues = useMemo(() => data.issues.filter((i) => i.active).sort((a, b) => a.sort_order - b.sort_order), [data.issues]);
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    for (const race of buildRaceViews(data)) {
      if (!race.tracked) continue;
      if (office !== "all" && race.office !== office) continue;
      for (const candidate of race.candidates) {
        if (demOnly && candidate.party === "R") continue;
        if (scoredOnly && candidate.summary.score === null) continue;
        if (query && !`${candidate.name} ${race.title} ${race.state}`.toLowerCase().includes(query.toLowerCase())) continue;
        out.push({ candidate, race });
      }
    }
    const scoreOf = (r: Row, key: SortKey): number | string => {
      if (key === "total") return r.candidate.summary.score ?? -1;
      if (key === "name") return r.candidate.name;
      if (key === "race") return `${r.race.office}-${r.race.state}-${r.race.district ?? ""}`;
      const issueId = key.slice("issue:".length);
      return r.candidate.scores.find((s) => s.issue_id === issueId)?.score ?? -1;
    };
    out.sort((a, b) => {
      const x = scoreOf(a, sort);
      const y = scoreOf(b, sort);
      const cmp = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
      return desc ? -cmp : cmp;
    });
    return out;
  }, [data, office, demOnly, scoredOnly, query, sort, desc]);

  const setSortKey = (key: SortKey) => {
    if (key === sort) setDesc((v) => !v);
    else {
      setSort(key);
      setDesc(key !== "name" && key !== "race");
    }
  };
  const arrow = (key: SortKey) => (sort === key ? (desc ? " ↓" : " ↑") : "");

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <select value={office} onChange={(e) => setOffice(e.target.value as Office | "all")} aria-label="Office">
          <option value="all">All offices</option>
          <option value="house">House</option>
          <option value="senate">Senate</option>
          <option value="governor">Governors</option>
        </select>
        <label className="inline-flex items-center gap-1.5 text-text-2">
          <input type="checkbox" checked={demOnly} onChange={(e) => setDemOnly(e.target.checked)} />
          Hide Republicans
        </label>
        <label className="inline-flex items-center gap-1.5 text-text-2">
          <input type="checkbox" checked={scoredOnly} onChange={(e) => setScoredOnly(e.target.checked)} />
          Scored only
        </label>
        <input type="text" placeholder="Search name, race, state" value={query} onChange={(e) => setQuery(e.target.value)} className="w-56" />
        <span className="ml-auto text-xs text-text-3">{rows.length} candidates · click a column to sort</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="text-sm border-collapse min-w-full">
          <thead className="sticky top-0 bg-surface">
            <tr className="text-left text-xs text-text-2">
              <th className="p-2 font-medium cursor-pointer whitespace-nowrap" onClick={() => setSortKey("name")}>
                Candidate{arrow("name")}
              </th>
              <th className="p-2 font-medium cursor-pointer whitespace-nowrap" onClick={() => setSortKey("race")}>
                Race{arrow("race")}
              </th>
              <th className="p-2 font-medium cursor-pointer whitespace-nowrap text-right" onClick={() => setSortKey("total")}>
                Score{arrow("total")}
              </th>
              {issues.map((i) => (
                <th
                  key={i.id}
                  className="p-1 font-medium cursor-pointer align-bottom"
                  onClick={() => setSortKey(`issue:${i.id}`)}
                  title={`${i.description ?? ""} (weight ${i.weight})`}
                >
                  <div className="w-16 leading-tight text-[11px]">
                    {i.name}
                    {arrow(`issue:${i.id}`)}
                    <div className="text-text-3 font-normal">w {i.weight}</div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ candidate, race }) => {
              const byIssue = new Map(candidate.scores.map((s) => [s.issue_id, s]));
              return (
                <tr key={candidate.id} className="border-t border-border hover:bg-surface-2">
                  <td className="p-2 whitespace-nowrap">
                    <span className="inline-flex items-center gap-2">
                      <PartyDot party={candidate.party} size={8} />
                      {candidate.name}
                      {candidate.is_incumbent && <span className="text-[10px] text-text-3">INC</span>}
                    </span>
                  </td>
                  <td className="p-2 whitespace-nowrap text-text-2">
                    <Link href={`/races/${race.id}`} className="hover:underline">
                      {OFFICE_LABEL[race.office]} · {race.title}
                    </Link>
                  </td>
                  <td className="p-2 text-right">
                    {candidate.summary.score === null ? (
                      <span className="text-text-3">–</span>
                    ) : (
                      <span
                        className="inline-block min-w-10 px-1.5 rounded tabular-nums font-semibold text-text"
                        style={{ background: totalScoreFill(candidate.summary.score) }}
                        title={`${candidate.summary.scored} of ${candidate.summary.total} issues scored`}
                      >
                        {Math.round(candidate.summary.score)}
                      </span>
                    )}
                  </td>
                  {issues.map((i) => {
                    const s = byIssue.get(i.id);
                    return (
                      <td key={i.id} className="p-1 text-center">
                        {s ? (
                          <span
                            className="inline-flex w-7 h-7 items-center justify-center rounded text-xs font-semibold tabular-nums text-text"
                            style={{ background: scoreFill(s.score) }}
                            title={s.evidence ?? i.rubric[String(s.score)] ?? ""}
                          >
                            {s.score}
                          </span>
                        ) : (
                          <span className="inline-block w-7 h-7 rounded border border-dashed border-border" aria-label="not scored" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td className="p-4 text-text-3" colSpan={3 + issues.length}>
                  Nothing matches. Turn off “Scored only” to see every candidate.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-text-2">
        <span>Cell scale</span>
        {[0, 1, 2, 3, 4].map((n) => (
          <span key={n} className="inline-flex items-center gap-1">
            <span className="inline-block w-4 h-4 rounded" style={{ background: scoreFill(n) }} />
            {n}
          </span>
        ))}
        <span className="ml-auto">Score = weighted average over scored issues, 0 to 100. Hover a cell for the evidence.</span>
      </div>
    </div>
  );
}
