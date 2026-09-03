"use client";

import { useState } from "react";
import { useEditor, must } from "./useEditor";
import { scoreFill } from "@/lib/colors";
import type { CandidateView } from "@/lib/view";
import type { Issue } from "@/lib/types";

/** One row per issue: five score buttons, an evidence field, a provisional toggle. */
export function ScoreEditor({ candidate, issues }: { candidate: CandidateView; issues: Issue[] }) {
  const { save, saving, error } = useEditor();
  const existing = new Map(candidate.scores.map((s) => [s.issue_id, s]));
  const [evidence, setEvidence] = useState<Record<string, string>>(
    Object.fromEntries(candidate.scores.map((s) => [s.issue_id, s.evidence ?? ""])),
  );

  const setScore = (issueId: string, score: number) =>
    save(async (sb) =>
      must(
        await sb.from("scores").upsert(
          {
            candidate_id: candidate.id,
            issue_id: issueId,
            score,
            evidence: evidence[issueId] || null,
            provisional: existing.get(issueId)?.provisional ?? true,
          },
          { onConflict: "candidate_id,issue_id" },
        ),
      ),
    );

  const clearScore = (issueId: string) =>
    save(async (sb) => must(await sb.from("scores").delete().eq("candidate_id", candidate.id).eq("issue_id", issueId)));

  const saveEvidence = (issueId: string) => {
    if (!existing.has(issueId)) return;
    return save(async (sb) =>
      must(
        await sb
          .from("scores")
          .update({ evidence: evidence[issueId] || null })
          .eq("candidate_id", candidate.id)
          .eq("issue_id", issueId),
      ),
    );
  };

  const toggleProvisional = (issueId: string, provisional: boolean) =>
    save(async (sb) =>
      must(await sb.from("scores").update({ provisional }).eq("candidate_id", candidate.id).eq("issue_id", issueId)),
    );

  return (
    <div className="grid gap-2">
      {issues.map((issue) => {
        const s = existing.get(issue.id);
        return (
          <div key={issue.id} className="grid gap-1 text-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-44 shrink-0 text-text">{issue.name}</span>
              <div className="flex gap-1" role="radiogroup" aria-label={`${issue.name} score`}>
                {[0, 1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    type="button"
                    disabled={saving}
                    onClick={() => setScore(issue.id, n)}
                    title={issue.rubric[String(n)] ?? ""}
                    aria-pressed={s?.score === n}
                    className="w-8 h-8 rounded text-xs font-semibold tabular-nums border"
                    style={{
                      background: scoreFill(n),
                      borderColor: s?.score === n ? "var(--text)" : "var(--border)",
                      opacity: s && s.score !== n ? 0.55 : 1,
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
              {s && (
                <>
                  <label className="text-xs text-text-2 flex items-center gap-1">
                    <input type="checkbox" checked={!s.provisional} disabled={saving} onChange={(e) => toggleProvisional(issue.id, !e.target.checked)} />
                    Verified
                  </label>
                  <button type="button" className="text-xs text-text-3 underline" disabled={saving} onClick={() => clearScore(issue.id)}>
                    Clear
                  </button>
                </>
              )}
            </div>
            <input
              type="text"
              placeholder={s ? "Evidence: a vote, a quote, a pledge" : "Pick a score first"}
              className="text-[16px] sm:text-xs"
              value={evidence[issue.id] ?? ""}
              disabled={!s || saving}
              onChange={(e) => setEvidence((v) => ({ ...v, [issue.id]: e.target.value }))}
              onBlur={() => saveEvidence(issue.id)}
            />
          </div>
        );
      })}
      {error && <p className="text-xs text-[color:var(--signal-neg)]">{error}</p>}
    </div>
  );
}
