"use client";

import { useState } from "react";
import { useEditor, must } from "./edit/useEditor";
import { scoreFill } from "@/lib/colors";
import type { Issue } from "@/lib/types";

export function IssueList({ issues, canEdit }: { issues: Issue[]; canEdit: boolean }) {
  const { save, saving, error } = useEditor();
  const [weights, setWeights] = useState<Record<string, string>>(Object.fromEntries(issues.map((i) => [i.id, String(i.weight)])));
  const sorted = [...issues].sort((a, b) => a.sort_order - b.sort_order);

  const commitWeight = (id: string) => {
    const w = Number(weights[id]);
    if (!Number.isFinite(w) || w < 0) return;
    return save(async (sb) => must(await sb.from("issues").update({ weight: w }).eq("id", id)));
  };

  return (
    <div className="grid gap-3">
      {error && <p className="text-xs text-[color:var(--signal-neg)]">{error}</p>}
      {sorted.map((issue) => (
        <section key={issue.id} className={`rounded-lg border border-border bg-surface p-3 ${issue.active ? "" : "opacity-60"}`}>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-semibold">{issue.name}</h2>
            <span className="text-xs text-text-3">{issue.id}</span>
            <label className="ml-auto text-xs text-text-2 inline-flex items-center gap-1">
              Weight
              {canEdit ? (
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  className="w-20"
                  value={weights[issue.id] ?? ""}
                  disabled={saving}
                  onChange={(e) => setWeights((v) => ({ ...v, [issue.id]: e.target.value }))}
                  onBlur={() => commitWeight(issue.id)}
                />
              ) : (
                <span className="font-semibold text-text">{issue.weight}</span>
              )}
            </label>
            {canEdit && (
              <label className="text-xs text-text-2 inline-flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={issue.active}
                  disabled={saving}
                  onChange={(e) => save(async (sb) => must(await sb.from("issues").update({ active: e.target.checked }).eq("id", issue.id)))}
                />
                Active
              </label>
            )}
          </div>
          {issue.description && <p className="text-sm text-text-2 mt-1">{issue.description}</p>}
          <ol className="mt-2 grid gap-1 sm:grid-cols-5 text-xs">
            {[0, 1, 2, 3, 4].map((n) => (
              <li key={n} className="rounded border border-border p-2 grid gap-1">
                <span className="inline-flex w-6 h-6 items-center justify-center rounded font-semibold text-text" style={{ background: scoreFill(n) }}>
                  {n}
                </span>
                <span className="text-text-2">{issue.rubric[String(n)] ?? "—"}</span>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
