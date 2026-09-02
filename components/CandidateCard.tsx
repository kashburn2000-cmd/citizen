"use client";

import { useState } from "react";
import { PartyDot, ScoreBadge, Tag } from "./Pills";
import { ScoreEditor } from "./edit/ScoreEditor";
import { useEditor, must } from "./edit/useEditor";
import { STATUS_LABEL, type CandidateView } from "@/lib/view";
import { scoreFill } from "@/lib/colors";
import type { CandidateStatus, Issue } from "@/lib/types";

const STATUSES = Object.keys(STATUS_LABEL) as CandidateStatus[];

export function CandidateCard({ candidate, issues, canEdit }: { candidate: CandidateView; issues: Issue[]; canEdit: boolean }) {
  const [open, setOpen] = useState(false);
  const { save, saving, error } = useEditor();
  const scoreByIssue = new Map(candidate.scores.map((s) => [s.issue_id, s]));
  const activeIssues = issues.filter((i) => i.active).sort((a, b) => a.sort_order - b.sort_order);

  return (
    <article className="rounded-md border border-border bg-surface p-3">
      <div className="flex items-start gap-2">
        <PartyDot party={candidate.party} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h4 className="font-medium leading-tight">{candidate.name}</h4>
            <span className="text-xs text-text-3">{candidate.party}</span>
            {candidate.is_incumbent && <Tag tone="accent">Incumbent</Tag>}
            {candidate.status !== "running" && <Tag>{STATUS_LABEL[candidate.status]}</Tag>}
            {candidate.needs_review && <Tag>Unverified</Tag>}
          </div>
          {candidate.bio && <p className="text-sm text-text-2 mt-1">{candidate.bio}</p>}
          {candidate.endorsements.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {candidate.endorsements.map((e) => (
                <Tag key={e.org_id} tone={e.org.signal > 0 ? "pos" : e.org.signal < 0 ? "neg" : "neutral"}>
                  <span title={e.note ?? undefined}>{e.org.name}</span>
                </Tag>
              ))}
            </div>
          )}
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1">
          <ScoreBadge
            score={candidate.summary.score}
            scored={candidate.summary.scored}
            total={candidate.summary.total}
            provisional={candidate.summary.anyProvisional}
          />
          <button className="text-xs text-text-2 underline" onClick={() => setOpen((v) => !v)}>
            {open ? "Hide scores" : canEdit ? "Score" : "Scores"}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-3 border-t border-border pt-3">
          {canEdit ? (
            <ScoreEditor candidate={candidate} issues={activeIssues} />
          ) : (
            <ul className="grid gap-1">
              {activeIssues.map((issue) => {
                const s = scoreByIssue.get(issue.id);
                return (
                  <li key={issue.id} className="grid grid-cols-[1.25rem_1fr] gap-2 text-sm items-start">
                    <span
                      className="w-5 h-5 rounded text-[11px] font-semibold flex items-center justify-center tabular-nums"
                      style={{ background: s ? scoreFill(s.score) : "transparent", border: s ? "none" : "1px dashed var(--border)" }}
                      title={s ? issue.rubric[String(s.score)] : "Not scored"}
                    >
                      {s ? s.score : ""}
                    </span>
                    <span>
                      <span className="text-text">{issue.name}</span>
                      {s?.evidence && <span className="text-text-2"> · {s.evidence}</span>}
                      {s?.provisional && <span className="text-text-3"> (provisional)</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {canEdit && (
            <div className="mt-3 flex items-center gap-2 text-xs">
              <label className="text-text-2">Status</label>
              <select
                value={candidate.status}
                disabled={saving}
                onChange={(e) =>
                  save(async (sb) => must(await sb.from("candidates").update({ status: e.target.value }).eq("id", candidate.id)))
                }
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1 text-text-2">
                <input
                  type="checkbox"
                  checked={!candidate.needs_review}
                  disabled={saving}
                  onChange={(e) =>
                    save(async (sb) => must(await sb.from("candidates").update({ needs_review: !e.target.checked }).eq("id", candidate.id)))
                  }
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
