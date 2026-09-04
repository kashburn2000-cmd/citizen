/**
 * Loads an edited copy of the /api/export workbook back into data/seed/*.json.
 *
 *   npm run import:workbook -- path/to/progressive-races-YYYY-MM-DD.xlsx
 *
 * The workbook is the source of truth: rows missing from it are dropped from
 * the seed, and rows present in it are rewritten. See lib/import.ts for what
 * is read from which sheet. Follow with `npm run build:seed-sql` and paste
 * supabase/seed.sql into the Supabase SQL editor, or run `npm run seed`.
 */
import ExcelJS from "exceljs";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseSeed } from "../lib/data/seed-schema";
import { workbookToSeed, type RawRow } from "../lib/import";

const file = process.argv[2];
if (!file || !existsSync(file)) {
  console.error("Usage: npm run import:workbook -- path/to/export.xlsx");
  process.exit(1);
}

const dir = path.resolve(__dirname, "../data/seed");
const readJson = (f: string): RawRow[] => JSON.parse(readFileSync(path.join(dir, f), "utf8"));
const existing = {
  seats: readJson("house_seats.json"),
  races: readJson("races.json"),
  candidates: readJson("candidates.json"),
  issues: readJson("issues.json"),
  scores: readJson("scores.json"),
  orgs: readJson("orgs.json"),
  endorsements: readJson("endorsements.json"),
};

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const raw = workbookToSeed(wb, existing);

  // Validate the way the app and the seed script do before writing anything.
  const seed = parseSeed(raw);

  const write = (name: string, rows: unknown[]) => writeFileSync(path.join(dir, name), JSON.stringify(rows, null, 2) + "\n");
  write("house_seats.json", raw.seats);
  write("races.json", raw.races);
  write("candidates.json", raw.candidates);
  write("issues.json", raw.issues);
  write("scores.json", raw.scores);
  write("orgs.json", raw.orgs);
  write("endorsements.json", raw.endorsements);

  const delta = (label: string, before: unknown[], after: unknown[]) => `${label} ${before.length} -> ${after.length}`;
  console.log(
    [
      `imported ${path.relative(process.cwd(), file)}:`,
      delta("seats", existing.seats, seed.seats),
      delta("races", existing.races, seed.races),
      delta("candidates", existing.candidates, seed.candidates),
      delta("issues", existing.issues, seed.issues),
      delta("scores", existing.scores, seed.scores),
      delta("orgs", existing.orgs, seed.orgs),
      delta("endorsements", existing.endorsements, seed.endorsements),
    ].join("\n  "),
  );
  const gone = (label: string, before: RawRow[], after: { id: string }[]) => {
    const ids = new Set(after.map((a) => a.id));
    const removed = before.map((b) => String(b.id)).filter((id) => !ids.has(id));
    if (removed.length) console.log(`  removed ${label}: ${removed.join(", ")}`);
  };
  gone("races", existing.races, seed.races);
  gone("candidates", existing.candidates, seed.candidates);
  gone("orgs", existing.orgs, seed.orgs);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
