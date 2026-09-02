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
    <div className="grid gap-5">
      {error && <p className="text-[13px] text-[color:var(--signal-neg)]">{error}</p>}
      {sorted.map((issue, idx) => (
        <section key={issue.id} className={`grid gap-3 border-[3px] border-border p-5 ${issue.active ? "" : "opacity-50"}`}>
          <div className="flex flex-wrap items-baseline gap-4">
            <span className="display text-[22px] text-text-3">{String(idx + 1).padStart(2, "0")}</span>
            <h2 className="display text-[30px]">{issue.name}</h2>
            <label className="ml-auto flex items-center gap-2 label text-[11px]">
              Weight
              {canEdit ? (
                <input type="number" step="0.25" min="0" className="w-24" value={weights[issue.id] ?? ""} disabled={saving} onChange={(e) => setWeights((v) => ({ ...v, [issue.id]: e.target.value }))} onBlur={() => commitWeight(issue.id)} />
              ) : (
                <span className="display text-[24px] text-dem">{issue.weight}</span>
              )}
            </label>
            {canEdit && (
              <label className="label text-[11px] flex items-center gap-2">
                <input type="checkbox" checked={issue.active} disabled={saving} onChange={(e) => save(async (sb) => must(await sb.from("issues").update({ active: e.target.checked }).eq("id", issue.id)))} />
                Active
              </label>
            )}
          </div>
          {issue.description && <p className="text-[15px] leading-relaxed text-text-2 max-w-[760px]">{issue.description}</p>}
          <ol className="grid gap-2 sm:grid-cols-5">
            {[0, 1, 2, 3, 4].map((n) => (
              <li key={n} className="grid gap-2 border-2 border-border-soft p-3">
                <span className="display text-[20px] w-8 h-8 flex items-center justify-center" style={{ background: scoreFill(n), color: n >= 3 ? "#f3ecdc" : "#13213b" }}>
                  {n}
                </span>
                <span className="text-[13px] leading-snug text-text-2">{issue.rubric[String(n)] ?? "—"}</span>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
