import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseSeed } from "@/lib/data/seed-schema";
import { buildWorkbook, exportFilename } from "@/lib/export";
import type { Dataset } from "@/lib/types";

const dir = path.resolve(__dirname, "../data/seed");
const read = (f: string) => JSON.parse(readFileSync(path.join(dir, f), "utf8"));
const data: Dataset = {
  ...parseSeed({
    seats: read("house_seats.json"),
    races: read("races.json"),
    candidates: read("candidates.json"),
    issues: read("issues.json"),
    scores: read("scores.json"),
    orgs: read("orgs.json"),
    endorsements: read("endorsements.json"),
  }),
  source: "static",
};

describe("Excel export", () => {
  it("round-trips through a real xlsx file with one row per record", async () => {
    const wb = buildWorkbook(data, new Date("2026-09-02T12:00:00Z"));
    const buf = await wb.xlsx.writeBuffer();
    expect(buf.byteLength).toBeGreaterThan(20_000);

    const back = new ExcelJS.Workbook();
    await back.xlsx.load(buf as ArrayBuffer);
    const names = back.worksheets.map((w) => w.name);
    expect(names).toEqual(["README", "Candidates", "Scores", "Races", "House Seats", "Issues", "Endorsements", "Orgs"]);
    const rows = (n: string) => back.getWorksheet(n)!.rowCount - 1;
    expect(rows("Candidates")).toBe(data.candidates.length);
    expect(rows("Scores")).toBe(data.scores.length);
    expect(rows("Races")).toBe(data.races.length);
    expect(rows("House Seats")).toBe(data.seats.length);
    expect(rows("Issues")).toBe(data.issues.length);
    expect(rows("Endorsements")).toBe(data.endorsements.length);
    expect(rows("Orgs")).toBe(data.orgs.length);

    // Candidates sheet carries the weighted score and a column per active issue.
    const cand = back.getWorksheet("Candidates")!;
    const headers = (cand.getRow(1).values as unknown[]).slice(1) as string[];
    expect(headers).toContain("Progressive score");
    for (const i of data.issues.filter((i) => i.active)) expect(headers).toContain(i.name);
    const casar = cand.getSheetValues().find((r) => Array.isArray(r) && r.includes("Greg Casar")) as unknown[];
    expect(casar).toBeTruthy();
    const scoreIdx = headers.indexOf("Progressive score") + 1;
    expect(Number(casar[scoreIdx])).toBeGreaterThan(90);
  });

  it("names the file by date", () => {
    expect(exportFilename(new Date("2026-09-02T23:00:00Z"))).toBe("progressive-races-2026-09-02.xlsx");
  });
});
