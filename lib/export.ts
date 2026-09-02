import ExcelJS from "exceljs";
import { RATING_LABEL } from "./scoring";
import { OFFICE_LABEL, STATUS_LABEL, buildRaceViews } from "./view";
import type { Dataset } from "./types";

const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF13213B" } };
const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFF3ECDC" } };

function addSheet(wb: ExcelJS.Workbook, name: string, columns: Array<{ header: string; key: string; width?: number }>, rows: Record<string, unknown>[]) {
  const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 16 }));
  ws.getRow(1).fill = HEADER_FILL;
  ws.getRow(1).font = HEADER_FONT;
  for (const r of rows) ws.addRow(r);
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  return ws;
}

/** Everything in the dataset as one workbook. Pure; no I/O. */
export function buildWorkbook(data: Dataset, generatedAt = new Date()): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Progressive Races 2026";
  wb.created = generatedAt;
  const races = buildRaceViews(data);
  const issues = [...data.issues].sort((a, b) => a.sort_order - b.sort_order);
  const activeIssues = issues.filter((i) => i.active);
  const orgById = new Map(data.orgs.map((o) => [o.id, o]));

  // README
  const readme = wb.addWorksheet("README");
  readme.columns = [{ width: 110 }];
  for (const line of [
    "Progressive Races 2026 export",
    `Generated ${generatedAt.toISOString().slice(0, 19).replace("T", " ")} UTC from the ${data.source === "supabase" ? "live database" : "bundled seed data"}.`,
    "",
    "Sheets:",
    "  Candidates: one row per candidate with race, status, weighted progressive score, and a column per issue.",
    "  Scores: one row per candidate-issue score with the evidence text.",
    "  Races: every tracked race with rating, date, and notes.",
    "  House Seats: all 435 seats and who holds them.",
    "  Issues: the rubric, weights, and what each 0-4 level means.",
    "  Endorsements and Orgs: who endorsed whom, and how each org is treated (signal 1 = progressive, -1 = counter-signal).",
    "",
    "Progressive score = 100 * sum(score * weight) / sum(4 * weight), over the issues that have a score. Provisional = not yet verified by an editor.",
  ])
    readme.addRow([line]);
  readme.getRow(1).font = { bold: true, size: 14 };

  // Candidates
  const candidateCols = [
    { header: "Candidate ID", key: "id", width: 22 },
    { header: "Name", key: "name", width: 26 },
    { header: "Party", key: "party", width: 7 },
    { header: "Office", key: "office", width: 10 },
    { header: "State", key: "state", width: 7 },
    { header: "Race", key: "race", width: 34 },
    { header: "Race ID", key: "race_id", width: 24 },
    { header: "Status", key: "status", width: 14 },
    { header: "Incumbent", key: "incumbent", width: 10 },
    { header: "Race rating", key: "rating", width: 12 },
    { header: "Election date", key: "election_date", width: 13 },
    { header: "Progressive score", key: "score", width: 12 },
    { header: "Issues scored", key: "scored", width: 10 },
    { header: "Any provisional", key: "provisional", width: 10 },
    { header: "DW-NOMINATE", key: "dw", width: 12 },
    { header: "Endorsements", key: "endorsements", width: 40 },
    { header: "Counter-signals", key: "counter", width: 28 },
    ...activeIssues.map((i) => ({ header: i.name, key: `issue_${i.id}`, width: 12 })),
    { header: "Bio", key: "bio", width: 60 },
    { header: "Notes", key: "notes", width: 40 },
    { header: "Website", key: "website", width: 30 },
    { header: "Needs review", key: "needs_review", width: 10 },
  ];
  const candidateRows: Record<string, unknown>[] = [];
  const scoreRows: Record<string, unknown>[] = [];
  const issueById = new Map(issues.map((i) => [i.id, i]));
  for (const race of races) {
    for (const c of race.candidates) {
      const byIssue = new Map(c.scores.map((s) => [s.issue_id, s]));
      const row: Record<string, unknown> = {
        id: c.id,
        name: c.name,
        party: c.party,
        office: OFFICE_LABEL[race.office],
        state: race.state,
        race: race.title,
        race_id: race.id,
        status: STATUS_LABEL[c.status],
        incumbent: c.is_incumbent ? "Yes" : "",
        rating: race.rating ? RATING_LABEL[race.rating] : "",
        election_date: race.election_date,
        score: c.summary.score,
        scored: c.summary.scored,
        provisional: c.summary.scored > 0 ? (c.summary.anyProvisional ? "Yes" : "No") : "",
        dw: c.dw_nominate,
        endorsements: c.endorsements
          .filter((e) => e.org.signal >= 0)
          .map((e) => e.org.name)
          .join(", "),
        counter: c.endorsements
          .filter((e) => e.org.signal < 0)
          .map((e) => e.org.name)
          .join(", "),
        bio: c.bio,
        notes: c.notes,
        website: c.website,
        needs_review: c.needs_review ? "Yes" : "",
      };
      for (const i of activeIssues) row[`issue_${i.id}`] = byIssue.get(i.id)?.score ?? null;
      candidateRows.push(row);
      for (const s of c.scores) {
        scoreRows.push({
          candidate_id: c.id,
          name: c.name,
          race: race.title,
          issue_id: s.issue_id,
          issue: issueById.get(s.issue_id)?.name ?? s.issue_id,
          weight: issueById.get(s.issue_id)?.weight ?? null,
          score: s.score,
          evidence: s.evidence,
          source_url: s.source_url,
          provisional: s.provisional ? "Yes" : "No",
        });
      }
    }
  }
  addSheet(wb, "Candidates", candidateCols, candidateRows);

  addSheet(
    wb,
    "Scores",
    [
      { header: "Candidate ID", key: "candidate_id", width: 22 },
      { header: "Name", key: "name", width: 26 },
      { header: "Race", key: "race", width: 34 },
      { header: "Issue ID", key: "issue_id", width: 14 },
      { header: "Issue", key: "issue", width: 30 },
      { header: "Weight", key: "weight", width: 8 },
      { header: "Score (0-4)", key: "score", width: 10 },
      { header: "Evidence", key: "evidence", width: 70 },
      { header: "Source URL", key: "source_url", width: 30 },
      { header: "Provisional", key: "provisional", width: 10 },
    ],
    scoreRows,
  );

  addSheet(
    wb,
    "Races",
    [
      { header: "Race ID", key: "id", width: 24 },
      { header: "Office", key: "office", width: 10 },
      { header: "State", key: "state", width: 7 },
      { header: "District", key: "district", width: 8 },
      { header: "Title", key: "title", width: 40 },
      { header: "Election date", key: "election_date", width: 13 },
      { header: "Type", key: "election_type", width: 10 },
      { header: "Rating", key: "rating", width: 12 },
      { header: "Incumbent", key: "incumbent_name", width: 24 },
      { header: "Incumbent party", key: "incumbent_party", width: 8 },
      { header: "Open seat", key: "is_open_seat", width: 9 },
      { header: "Candidates", key: "candidate_count", width: 10 },
      { header: "Top progressive score", key: "top_score", width: 12 },
      { header: "Why it matters", key: "why_it_matters", width: 70 },
      { header: "Notes", key: "notes", width: 60 },
      { header: "Tracked", key: "tracked", width: 8 },
      { header: "Needs review", key: "needs_review", width: 10 },
    ],
    races.map((r) => ({
      ...r,
      office: OFFICE_LABEL[r.office],
      rating: r.rating ? RATING_LABEL[r.rating] : "",
      is_open_seat: r.is_open_seat ? "Yes" : "",
      candidate_count: r.candidates.length,
      top_score: r.topScore,
      tracked: r.tracked ? "Yes" : "",
      needs_review: r.needs_review ? "Yes" : "",
    })),
  );

  addSheet(
    wb,
    "House Seats",
    [
      { header: "Seat", key: "id", width: 9 },
      { header: "State", key: "state", width: 7 },
      { header: "District", key: "district", width: 8 },
      { header: "Incumbent", key: "incumbent_name", width: 28 },
      { header: "Party", key: "incumbent_party", width: 7 },
      { header: "Caucuses with", key: "caucuses_with", width: 10 },
      { header: "Notes", key: "notes", width: 70 },
      { header: "Needs review", key: "needs_review", width: 10 },
    ],
    data.seats.map((s) => ({ ...s, incumbent_party: s.incumbent_party === "V" ? "Vacant" : s.incumbent_party, needs_review: s.needs_review ? "Yes" : "" })),
  );

  addSheet(
    wb,
    "Issues",
    [
      { header: "Issue ID", key: "id", width: 14 },
      { header: "Name", key: "name", width: 30 },
      { header: "Weight", key: "weight", width: 8 },
      { header: "Active", key: "active", width: 8 },
      { header: "Description", key: "description", width: 70 },
      { header: "0 means", key: "r0", width: 40 },
      { header: "1 means", key: "r1", width: 40 },
      { header: "2 means", key: "r2", width: 40 },
      { header: "3 means", key: "r3", width: 40 },
      { header: "4 means", key: "r4", width: 40 },
    ],
    issues.map((i) => ({
      id: i.id,
      name: i.name,
      weight: i.weight,
      active: i.active ? "Yes" : "",
      description: i.description,
      r0: i.rubric["0"],
      r1: i.rubric["1"],
      r2: i.rubric["2"],
      r3: i.rubric["3"],
      r4: i.rubric["4"],
    })),
  );

  const candidateName = new Map(data.candidates.map((c) => [c.id, c.name]));
  addSheet(
    wb,
    "Endorsements",
    [
      { header: "Candidate ID", key: "candidate_id", width: 22 },
      { header: "Candidate", key: "candidate", width: 26 },
      { header: "Org ID", key: "org_id", width: 20 },
      { header: "Organization", key: "org", width: 34 },
      { header: "Kind", key: "kind", width: 12 },
      { header: "Signal", key: "signal", width: 7 },
      { header: "Note", key: "note", width: 50 },
      { header: "URL", key: "url", width: 30 },
    ],
    data.endorsements.map((e) => ({
      candidate_id: e.candidate_id,
      candidate: candidateName.get(e.candidate_id) ?? e.candidate_id,
      org_id: e.org_id,
      org: orgById.get(e.org_id)?.name ?? e.org_id,
      kind: orgById.get(e.org_id)?.kind ?? "",
      signal: orgById.get(e.org_id)?.signal ?? null,
      note: e.note,
      url: e.url,
    })),
  );

  addSheet(
    wb,
    "Orgs",
    [
      { header: "Org ID", key: "id", width: 20 },
      { header: "Name", key: "name", width: 36 },
      { header: "Kind", key: "kind", width: 12 },
      { header: "Signal", key: "signal", width: 7 },
      { header: "URL", key: "url", width: 36 },
    ],
    data.orgs.map((o) => ({ ...o })),
  );

  return wb;
}

export function exportFilename(generatedAt = new Date()): string {
  return `progressive-races-${generatedAt.toISOString().slice(0, 10)}.xlsx`;
}
