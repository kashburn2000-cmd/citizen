import { RATING_LABEL } from "@/lib/scoring";
import { partyFill, ratingFill } from "@/lib/colors";
import type { Rating } from "@/lib/types";

export function PartyDot({ party, size = 12 }: { party: string; size?: number }) {
  return (
    <span
      aria-label={party}
      className="inline-block shrink-0"
      style={{ width: size, height: size, background: partyFill(party), boxShadow: "0 0 0 2px var(--text)" }}
    />
  );
}

/** Solid color block, poster-style. */
export function RatingPill({ rating }: { rating: Rating | null }) {
  if (!rating) return <span className="label text-text-3">Unrated</span>;
  const dark = rating === "safe_d" || rating === "likely_d" || rating === "safe_r" || rating === "likely_r";
  return (
    <span className="label inline-flex items-center px-2.5 py-1" style={{ background: ratingFill(rating), color: dark ? "#f3ecdc" : "#13213b" }}>
      {RATING_LABEL[rating]}
    </span>
  );
}

/** Big display number with the coverage under it. */
export function ScoreBadge({ score, scored, total, provisional }: { score: number | null; scored: number; total: number; provisional?: boolean }) {
  if (score === null) return <span className="label text-text-3">Not scored</span>;
  return (
    <span
      className="inline-flex flex-col items-end leading-none"
      title={`Weighted progressive score over ${scored} of ${total} issues${provisional ? " (provisional)" : ""}`}
    >
      <span className="display text-[34px] text-dem">{Math.round(score)}</span>
      <span className="label text-text-3 text-[10px]">
        {scored}/{total} issues{provisional ? " · draft" : ""}
      </span>
    </span>
  );
}

export function Tag({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "pos" | "neg" | "accent" }) {
  const style =
    tone === "pos"
      ? { background: "#ffb703", color: "#13213b" }
      : tone === "neg"
        ? { background: "transparent", color: "var(--signal-neg)", boxShadow: "inset 0 0 0 2px var(--signal-neg)" }
        : tone === "accent"
          ? { background: "var(--text)", color: "var(--bg)" }
          : { background: "transparent", color: "var(--text-3)", boxShadow: "inset 0 0 0 2px var(--border-soft)" };
  return (
    <span className="label inline-flex items-center px-2 py-1 text-[11px]" style={style}>
      {children}
    </span>
  );
}
