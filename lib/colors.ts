import type { Rating, SeatParty } from "./types";

export function seatFill(party: SeatParty | "tossup", caucus?: "D" | "R" | null): string {
  switch (party) {
    case "D":
      return "var(--c-d)";
    case "R":
      return "var(--c-r)";
    case "I":
      return caucus === "D" ? "var(--c-d-2)" : caucus === "R" ? "var(--c-r-2)" : "var(--c-i)";
    case "V":
      return "var(--c-vacant)";
    default:
      return "var(--c-tossup)";
  }
}

/** Fill for a race rating: safe = full hue, likely/lean = lighter steps, toss-up = neutral. */
export function ratingFill(rating: Rating | null | undefined): string {
  switch (rating) {
    case "safe_d":
      return "var(--c-d)";
    case "likely_d":
      return "var(--c-d-2)";
    case "lean_d":
      return "var(--c-d-3)";
    case "safe_r":
      return "var(--c-r)";
    case "likely_r":
      return "var(--c-r-2)";
    case "lean_r":
      return "var(--c-r-3)";
    case "tossup":
      return "var(--c-tossup)";
    default:
      return "var(--surface-2)";
  }
}

export function partyFill(party: string): string {
  if (party === "D" || party === "WFP") return "var(--c-d)";
  if (party === "R") return "var(--c-r)";
  if (party === "I" || party === "G" || party === "L") return "var(--c-i)";
  return "var(--c-tossup)";
}

export function scoreFill(score: number | null | undefined): string {
  if (score === null || score === undefined) return "transparent";
  return `var(--score-${Math.max(0, Math.min(4, Math.round(score)))})`;
}

/** Bucket a 0-100 weighted score onto the same 5-step ramp. */
export function totalScoreFill(total: number | null): string {
  if (total === null) return "transparent";
  return scoreFill(Math.round((total / 100) * 4));
}
