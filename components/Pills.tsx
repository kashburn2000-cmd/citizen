import { RATING_LABEL } from "@/lib/scoring";
import { partyFill, ratingFill, totalScoreFill } from "@/lib/colors";
import type { Rating } from "@/lib/types";

export function PartyDot({ party, size = 10 }: { party: string; size?: number }) {
  return (
    <span
      aria-label={party}
      className="inline-block rounded-full shrink-0"
      style={{ width: size, height: size, background: partyFill(party), boxShadow: "0 0 0 2px var(--surface)" }}
    />
  );
}

export function RatingPill({ rating }: { rating: Rating | null }) {
  if (!rating) return <span className="text-xs text-text-3">Unrated</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border border-border bg-surface">
      <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: ratingFill(rating) }} />
      {RATING_LABEL[rating]}
    </span>
  );
}

export function ScoreBadge({ score, scored, total, provisional }: { score: number | null; scored: number; total: number; provisional?: boolean }) {
  if (score === null) return <span className="text-xs text-text-3">Not scored</span>;
  return (
    <span
      className="inline-flex items-baseline gap-1 text-xs px-2 py-0.5 rounded-md border border-border"
      style={{ background: totalScoreFill(score) }}
      title={`Weighted progressive score over ${scored} of ${total} issues${provisional ? " (provisional)" : ""}`}
    >
      <span className="font-semibold tabular-nums text-text">{Math.round(score)}</span>
      <span className="text-text-2">
        /100 · {scored}/{total}
        {provisional ? " · prov." : ""}
      </span>
    </span>
  );
}

export function Tag({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "pos" | "neg" | "accent" }) {
  const color =
    tone === "pos" ? "var(--signal-pos)" : tone === "neg" ? "var(--signal-neg)" : tone === "accent" ? "var(--accent)" : "var(--text-3)";
  return (
    <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded border border-border bg-surface text-text-2">
      <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {children}
    </span>
  );
}
