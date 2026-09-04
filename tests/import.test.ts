import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseSeed } from "@/lib/data/seed-schema";
import { buildWorkbook } from "@/lib/export";
import { workbookToSeed, type RawRow } from "@/lib/import";
import type { Dataset } from "@/lib/types";

const dir = path.resolve(__dirname, "../data/seed");
const read = (f: string): RawRow[] => JSON.parse(readFileSync(path.join(dir, f), "utf8"));
const raw = {
  seats: read("house_seats.json"),
  races: read("races.json"),
  candidates: read("candidates.json"),
  issues: read("issues.json"),
  scores: read("scores.json"),
  orgs: read("orgs.json"),
  endorsements: read("endorsements.json"),
};
const data: Dataset = { ...parseSeed(raw), source: "static" };

async function roundTrip(edit?: (wb: ExcelJS.Workbook) => void) {
  const buf = await buildWorkbook(data, new Date("2026-09-04T12:00:00Z")).xlsx.writeBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as ArrayBuffer);
  edit?.(wb);
  return parseSeed(workbookToSeed(wb, raw));
}

describe("workbook import", () => {
  it("reproduces the seed exactly from its own export", async () => {
    const back = await roundTrip();
    // Order differs (the export groups candidates by race), so compare as sorted sets.
    const byKey = <T>(rows: T[], key: (r: T) => string) => [...rows].sort((a, b) => key(a).localeCompare(key(b)));
    expect(byKey(back.seats, (s) => s.id)).toEqual(byKey(data.seats, (s) => s.id));
    expect(byKey(back.races, (r) => r.id)).toEqual(byKey(data.races, (r) => r.id));
    expect(byKey(back.candidates, (c) => c.id)).toEqual(byKey(data.candidates, (c) => c.id));
    expect(byKey(back.issues, (i) => i.id)).toEqual(byKey(data.issues, (i) => i.id));
    expect(byKey(back.orgs, (o) => o.id)).toEqual(byKey(data.orgs, (o) => o.id));
    expect(byKey(back.scores, (s) => `${s.candidate_id}|${s.issue_id}`)).toEqual(byKey(data.scores, (s) => `${s.candidate_id}|${s.issue_id}`));
    expect(byKey(back.endorsements, (e) => `${e.candidate_id}|${e.org_id}`)).toEqual(byKey(data.endorsements, (e) => `${e.candidate_id}|${e.org_id}`));
  });

  it("applies edits made in the sheets and drops rows that were removed", async () => {
    const back = await roundTrip((wb) => {
      const cand = wb.getWorksheet("Candidates")!;
      const headers = (cand.getRow(1).values as unknown[]).slice(1) as string[];
      const col = (h: string) => headers.indexOf(h) + 1;
      const row = cand.getRow(2);
      row.getCell(col("Status")).value = "Died";
      row.getCell(col("Outside spending for")).value = "$1,234.50";
      row.getCell(col("Needs review")).value = "Yes";
      // Delete a candidate; the sheet is the source of truth.
      const victim = String(cand.getRow(3).getCell(col("Candidate ID")).value);
      cand.spliceRows(3, 1);
      const scores = wb.getWorksheet("Scores")!;
      for (let r = scores.rowCount; r >= 2; r--) {
        if (String(scores.getRow(r).getCell(1).value) === victim) scores.spliceRows(r, 1);
      }
      const endorsements = wb.getWorksheet("Endorsements")!;
      for (let r = endorsements.rowCount; r >= 2; r--) {
        if (String(endorsements.getRow(r).getCell(1).value) === victim) endorsements.spliceRows(r, 1);
      }
      const seats = wb.getWorksheet("House Seats")!;
      seats.getRow(2).getCell(6).value = "Democratic";
    });
    const edited = back.candidates.find((c) => c.status === "died" && c.outside_spending_for === 1234.5);
    expect(edited).toBeTruthy();
    expect(edited!.needs_review).toBe(true);
    expect(back.candidates).toHaveLength(data.candidates.length - 1);
    expect(back.seats[0].caucuses_with).toBe("D");
  });

  it("rejects a status label it does not know", async () => {
    await expect(
      roundTrip((wb) => {
        wb.getWorksheet("Candidates")!.getRow(2).getCell(8).value = "Retired";
      }),
    ).rejects.toThrow(/unknown status/);
  });
});
