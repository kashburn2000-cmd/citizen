import type ExcelJS from "exceljs";
import { RATING_LABEL } from "./scoring";
import { OFFICE_LABEL, STATUS_LABEL } from "./view";

/**
 * Turns an edited copy of the /api/export workbook back into raw seed rows
 * (the shape data/seed/*.json holds, before parseSeed normalizes it).
 *
 * The workbook is the source of truth. Fields the export does not carry
 * (race seat_id and senate_class, candidate fec_id, photo_url and sort_order)
 * are taken from `previous` when the row already existed. Derived columns
 * (progressive score, issue columns, endorsement lists, candidate counts) are
 * ignored; the Scores and Endorsements sheets are what count.
 */

export type RawRow = Record<string, unknown>;
export interface RawSeed {
  seats: RawRow[];
  races: RawRow[];
  candidates: RawRow[];
  issues: RawRow[];
  scores: RawRow[];
  orgs: RawRow[];
  endorsements: RawRow[];
}

type Cell = string | number | boolean | null | undefined;

/** Plain value of a cell: formulas give their cached result, rich text and hyperlinks their text, dates an ISO day. */
function plain(v: ExcelJS.CellValue): Cell {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    if ("richText" in v) return v.richText.map((t) => t.text).join("");
    if ("text" in v) return plain(v.text as ExcelJS.CellValue);
    if ("result" in v) return plain((v.result ?? null) as ExcelJS.CellValue);
    if ("error" in v) return null;
    return null;
  }
  if (typeof v === "string") {
    const s = v.trim();
    return s === "" ? null : s;
  }
  return v;
}

type Row = Record<string, Cell>;

function sheetRows(wb: ExcelJS.Workbook, name: string): Row[] {
  const ws = wb.getWorksheet(name);
  if (!ws) throw new Error(`workbook has no "${name}" sheet`);
  const headers = (ws.getRow(1).values as ExcelJS.CellValue[]).map((h) => String(plain(h) ?? ""));
  const rows: Row[] = [];
  ws.eachRow((row, n) => {
    if (n === 1) return;
    const values = row.values as ExcelJS.CellValue[];
    const out: Row = {};
    let any = false;
    headers.forEach((h, i) => {
      if (!h) return;
      const v = plain(values[i]);
      out[h] = v;
      if (v !== null) any = true;
    });
    if (any) rows.push(out);
  });
  return rows;
}

const str = (v: Cell): string | null => (v === null || v === undefined ? null : String(v));
const num = (v: Cell): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[$,%\s]/g, ""));
  if (!Number.isFinite(n)) throw new Error(`expected a number, got ${JSON.stringify(v)}`);
  return n;
};
const int = (v: Cell): number | null => {
  const n = num(v);
  return n === null ? null : Math.round(n);
};
const yes = (v: Cell): boolean => {
  if (v === null || v === undefined) return false;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  return /^(yes|y|true|1|x)$/i.test(v);
};
const req = (row: Row, col: string, where: string): string => {
  const v = str(row[col]);
  if (!v) throw new Error(`${where}: "${col}" is empty`);
  return v;
};

/** Reverse a label map ("Won primary" -> won_primary). Accepts the id itself too, case-insensitively. */
function reverse<K extends string>(labels: Record<K, string>, what: string) {
  const byLabel = new Map<string, K>();
  for (const [id, label] of Object.entries(labels) as [K, string][]) {
    byLabel.set(label.toLowerCase(), id);
    byLabel.set(id.toLowerCase(), id);
  }
  return (v: Cell, where: string): K => {
    const s = str(v);
    const id = s ? byLabel.get(s.toLowerCase()) : undefined;
    if (!id) throw new Error(`${where}: unknown ${what} ${JSON.stringify(s)}`);
    return id;
  };
}
const toStatus = reverse(STATUS_LABEL, "status");
const toOffice = reverse(OFFICE_LABEL, "office");
const toRating = reverse(RATING_LABEL, "rating");

const partyOf = (v: Cell, where: string): string => {
  const s = str(v);
  if (!s) throw new Error(`${where}: party is empty`);
  const m: Record<string, string> = { democrat: "D", democratic: "D", republican: "R", independent: "I", green: "G", libertarian: "L", vacant: "V" };
  return m[s.toLowerCase()] ?? s;
};
const caucusOf = (v: Cell): "D" | "R" | null => {
  const s = str(v);
  if (!s) return null;
  const p = partyOf(s, "caucuses_with");
  if (p === "D" || p === "R") return p;
  throw new Error(`caucuses_with must be D or R, got ${JSON.stringify(s)}`);
};

export function workbookToSeed(wb: ExcelJS.Workbook, previous: Pick<RawSeed, "races" | "candidates">): RawSeed {
  const byId = (rows: RawRow[]) => new Map(rows.map((r) => [String(r.id), r]));
  const prevRaces = byId(previous.races);
  const prevCandidates = byId(previous.candidates);

  const seats = sheetRows(wb, "House Seats").map((r) => {
    const id = req(r, "Seat", "House Seats");
    return {
      id,
      state: req(r, "State", id),
      district: int(r.District) ?? 0,
      incumbent_name: str(r.Incumbent),
      incumbent_party: partyOf(r.Party ?? "Vacant", id),
      caucuses_with: caucusOf(r["Caucuses with"]),
      notes: str(r.Notes),
      needs_review: yes(r["Needs review"]),
    };
  });

  const races = sheetRows(wb, "Races").map((r) => {
    const id = req(r, "Race ID", "Races");
    const prev = prevRaces.get(id);
    const office = toOffice(r.Office, id);
    const district = office === "house" ? int(r.District) : null;
    return {
      id,
      office,
      state: req(r, "State", id),
      district,
      // the export does not carry these; keep what the seed had
      seat_id: prev?.seat_id ?? undefined,
      senate_class: prev?.senate_class ?? null,
      title: req(r, "Title", id),
      election_date: req(r, "Election date", id),
      election_type: str(r.Type) ?? "general",
      rating: str(r.Rating) === null ? null : toRating(r.Rating, id),
      incumbent_name: str(r.Incumbent),
      incumbent_party: str(r["Incumbent party"]) === null ? null : partyOf(r["Incumbent party"], id),
      is_open_seat: yes(r["Open seat"]),
      why_it_matters: str(r["Why it matters"]),
      notes: str(r.Notes),
      tracked: yes(r.Tracked),
      needs_review: yes(r["Needs review"]),
    };
  });

  // Sort order is not exported. Keep it for known candidates; new ones go after the last one in their race.
  const nextSort = new Map<string, number>();
  for (const c of previous.candidates) {
    const race = String(c.race_id);
    nextSort.set(race, Math.max(nextSort.get(race) ?? 0, Number(c.sort_order ?? 0)));
  }
  const candidates = sheetRows(wb, "Candidates").map((r) => {
    const id = req(r, "Candidate ID", "Candidates");
    const prev = prevCandidates.get(id);
    const race_id = req(r, "Race ID", id);
    let sort_order = prev && prev.race_id === race_id ? Number(prev.sort_order ?? 0) : NaN;
    if (!Number.isFinite(sort_order)) {
      sort_order = (nextSort.get(race_id) ?? 0) + 1;
      nextSort.set(race_id, sort_order);
    }
    return {
      id,
      race_id,
      name: req(r, "Name", id),
      party: partyOf(r.Party ?? "D", id),
      is_incumbent: yes(r.Incumbent),
      status: toStatus(r.Status ?? "Running", id),
      website: str(r.Website),
      bio: str(r.Bio),
      fec_id: (prev?.fec_id as string | undefined) ?? null,
      dw_nominate: num(r["DW-NOMINATE"]),
      photo_url: (prev?.photo_url as string | undefined) ?? null,
      notes: str(r.Notes),
      open_questions: str(r["Open questions"]),
      nonindividual_share: num(r["Non-individual receipt share (incl. ActBlue)"] ?? r["PAC share of receipts"]),
      outside_spending_for: num(r["Outside spending for"]),
      outside_spending_against: num(r["Outside spending against"]),
      top_outside_spenders: str(r["Top outside spenders"]),
      sort_order,
      needs_review: yes(r["Needs review"]),
    };
  });

  const issues = sheetRows(wb, "Issues").map((r, i) => {
    const id = req(r, "Issue ID", "Issues");
    const rubric: Record<string, string> = {};
    for (const level of ["0", "1", "2", "3", "4"]) {
      const v = str(r[`${level} means`]);
      if (v) rubric[level] = v;
    }
    return {
      id,
      name: req(r, "Name", id),
      description: str(r.Description),
      weight: num(r.Weight) ?? 1,
      sort_order: i + 1,
      rubric,
      active: yes(r.Active),
    };
  });

  const scores = sheetRows(wb, "Scores")
    .filter((r) => str(r["Score (0-4)"]) !== null)
    .map((r) => {
      const candidate_id = req(r, "Candidate ID", "Scores");
      const issue_id = req(r, "Issue ID", candidate_id);
      const score = int(r["Score (0-4)"]);
      if (score === null || score < 0 || score > 4) throw new Error(`${candidate_id}/${issue_id}: score must be 0-4`);
      return {
        candidate_id,
        issue_id,
        score,
        evidence: str(r.Evidence),
        source_url: str(r["Source URL"]),
        provisional: str(r.Provisional) === null ? true : yes(r.Provisional),
      };
    });

  const orgs = sheetRows(wb, "Orgs").map((r, i) => {
    const id = req(r, "Org ID", "Orgs");
    return {
      id,
      name: req(r, "Name", id),
      url: str(r.URL),
      kind: str(r.Kind) ?? "progressive",
      signal: int(r.Signal) ?? 1,
      sort_order: i + 1,
    };
  });

  const endorsements = sheetRows(wb, "Endorsements").map((r) => {
    const candidate_id = req(r, "Candidate ID", "Endorsements");
    return {
      candidate_id,
      org_id: req(r, "Org ID", candidate_id),
      note: str(r.Note),
      url: str(r.URL),
    };
  });

  return { seats, races, candidates, issues, scores, orgs, endorsements };
}
