"use client";

import { useState } from "react";
import { ScoreBadge, Tag } from "./Pills";
import { ScoreEditor } from "./edit/ScoreEditor";
import { useEditor, must } from "./edit/useEditor";
import { STATUS_LABEL, type CandidateView } from "@/lib/view";
import { partyFill, scoreFill } from "@/lib/colors";
import type { CandidateStatus, Issue } from "@/lib/types";

const STATUSES = Object.keys(STATUS_LABEL) as CandidateStatus[];

export function CandidateCard({ candidate, issues, canEdit }: { candidate: CandidateView; issues: Issue[]; canEdit: boolean }) {
  const [open, setOpen] = useState(false);
  const { save, saving, error } = useEditor();
  const scoreByIssue = new Map(candidate.scores.map((s) => [s.issue_id, s]));
  const activeIssues = issues.filter((i) => i.active).sort((a, b) => a.sort_order - b.sort_order);
  const out = candidate.status === "lost_primary" || candidate.status === "withdrew" || candidate.status === "lost";

  return (
    <article className={`grid gap-3 pt-4 ${out ? "opacity-60" : ""}`} style={{ borderTop: `4px solid ${partyFill(candidate.party)}` }}>
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1 grid gap-2">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h4 className="display text-[26px] leading-none">{candidate.name}</h4>
            <span className="label text-[11px]" style={{ color: partyFill(candidate.party) }}>
              {candidate.status === "running" ? candidate.party : `${STATUS_LABEL[candidate.status]} · ${candidate.party}`}
              {candidate.is_incumbent ? " · Incumbent" : ""}
            </span>
          </div>
          {candidate.bio && <p className="text-[14px] leading-relaxed text-text-2">{candidate.bio}</p>}
          {candidate.endorsements.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {candidate.endorsements.map((e) => (
                <Tag key={e.org_id} tone={e.org.signal > 0 ? "pos" : e.org.signal < 0 ? "neg" : "neutral"}>
                  <span title={e.note ?? undefined}>{e.org.name}</span>
                </Tag>
              ))}
            </div>
          )}
        </div>
        <div className="shrink-0 grid justify-items-end gap-1">
          <ScoreBadge score={candidate.summary.score} scored={candidate.summary.scored} total={candidate.summary.total} provisional={candidate.summary.anyProvisional} />
          <button className="label text-[11px] underline underline-offset-4 decoration-2" onClick={() => setOpen((v) => !v)}>
            {open ? "Hide" : canEdit ? "Score" : "Details"}
          </button>
        </div>
      </div>

      {open && (
        <div className="grid gap-3 pb-2">
          {candidate.dw_nominate !== null && (
            <p className="text-[13px] text-text-3">
              Voteview ideology score {candidate.dw_nominate.toFixed(2)} (negative is more liberal; House Democrats span about −0.7 to −0.1).
            </p>
          )}
          {canEdit ? (
            <ScoreEditor candidate={candidate} issues={activeIssues} />
          ) : (
            <ul className="grid gap-1.5">
              {activeIssues.map((issue) => {
                const s = scoreByIssue.get(issue.id);
                return (
                  <li key={issue.id} className="grid grid-cols-[1.75rem_1fr] gap-3 text-[14px] items-start">
                    <span
                      className="w-7 h-7 display text-[16px] flex items-center justify-center"
                      style={{ background: s ? scoreFill(s.score) : "transparent", color: s && s.score >= 3 ? "#f3ecdc" : "var(--text)", boxShadow: s ? "none" : "inset 0 0 0 2px var(--border-soft)" }}
                      title={s ? issue.rubric[String(s.score)] : "Not scored"}
                    >
                      {s ? s.score : ""}
                    </span>
                    <span className="leading-snug">
                      <span className="font-semibold">{issue.name}</span>
                      {s?.evidence && <span className="text-text-2"> · {s.evidence}</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {canEdit && (
            <div className="flex flex-wrap items-center gap-3 text-[13px]">
              <label className="label text-[11px]">Status</label>
              <select value={candidate.status} disabled={saving} onChange={(e) => save(async (sb) => must(await sb.from("candidates").update({ status: e.target.value }).eq("id", candidate.id)))}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 label text-[11px]">
                <input
                  type="checkbox"
                  checked={!candidate.needs_review}
                  disabled={saving}
                  onChange={(e) => save(async (sb) => must(await sb.from("candidates").update({ needs_review: !e.target.checked }).eq("id", candidate.id)))}
                />
                Verified
              </label>
              {error && <span className="text-[color:var(--signal-neg)]">{error}</span>}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
