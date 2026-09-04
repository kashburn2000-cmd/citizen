# Progressive Races 2026

A dashboard for tracking the fight for the House and the progressive candidates running in 2026. It shows who holds every House seat, where the tracked races are, who's running, and a scoring matrix that rates each candidate on a rubric you control.

## What's here

- A hex cartogram of all 435 House seats shaded by current party, with a projected view driven by race ratings and a 218 line. A geographic view with real district boundaries is one click away.
- Geographic maps for Senate and governor races with a pin per tracked race.
- A race panel for each tracked contest: date, rating, incumbent, why it matters, and every candidate with bio, endorsements, and score.
- A scoring rubric (12 issues, each with a 0 to 4 scale and a weight) and a sortable matrix of every scored candidate.
- Edit mode for anyone you promote to editor: score candidates, change ratings and statuses, adjust weights. Everything else is public read-only.
- Editors can download the whole dataset as an Excel workbook (`/api/export`): candidates with a column per issue, scores with evidence, races, seats, rubric, endorsements. An edited workbook can be loaded back with `npm run import:workbook`.

## Stack

Next.js 16 (App Router), React 19, Tailwind 4, D3 for the maps, Supabase (Postgres, auth, row-level security) for data, Vercel for hosting. Tests run against an in-memory Postgres (PGlite) so the schema and RLS are checked without a live database.

## Run it

```
npm install
npm run dev
```

With no Supabase keys the site runs read-only from the JSON in `data/seed`. To enable editing, follow [docs/SETUP.md](docs/SETUP.md).

```
npm test          # schema, scoring, and seed validation
npm run typecheck
npm run lint
npm run build
```

## About the data

Seat holders come from the `unitedstates/congress-legislators` dataset and incumbent ideology scores (DW-NOMINATE, first dimension) from Voteview, both pulled Sept 2, 2026. Primary results and nominees for every tracked race were checked against Wikipedia's 2026 election pages the same day; each race's notes say so. The seed was then reworked over Sept 2 to 4, 2026 from an edited export: special election results filled in (CA-14, GA-13), Kiley (CA-3) recorded as an independent caucusing with Republicans, a candidate who died (GA-13) given a "died" status, and roughly 300 scores added or re-sourced from congress.gov cosponsorships, Senate roll calls, campaign platforms, and candidate questionnaires. Things still worth checking:

- Two House seats are still vacant (FL-20, TX-23); their notes say why.
- Candidates flagged `needs_review: true` either have a ballot status that was inferred rather than confirmed, or a score the notes say conflicts with the record.
- Race ratings are my own read, not Cook or Sabato.
- The geographic House map uses Census 119th Congress boundaries. States that redrew for 2026 (Texas, California, Missouri, North Carolina, Ohio, Utah) will not match the ballot. The hex map is unaffected.

Scores are marked provisional until an editor clears the flag. The evidence field on each score says why it got the number it did, so you can disagree with it. Scores anchored to a bill cosponsorship or a roll call are not provisional; scores read from campaign language are.

Each candidate also carries an `open_questions` field (rubric issues with no published position, for outreach) and four FEC fields: share of receipts from non-individual sources (ActBlue-style conduits included, so it is not a corporate PAC share), outside spending for and against from Schedule E, and the top outside spenders. Governors do not file with the FEC, so those are blank for them.

Refresh scripts: `npm run import:workbook -- file.xlsx` (from an edited `/api/export` workbook), `npm run build:seed-sql`, `npm run build:seats` (from `scripts/house-seats.txt`), `python3 scripts/enrich-voteview.py`, `bash scripts/build-districts.sh`, `npm run build:geo`.

## Layout

```
app/              pages and routes (map, matrix, rubric, race detail, login)
components/       map, panels, matrix, editors
lib/              types, scoring math, data loading, Supabase clients
data/seed/        the JSON that seeds the database (and serves static mode)
scripts/          builds the cartogram, state outlines, seat list; imports a workbook; seeds Supabase
supabase/         SQL migrations and the paste-able seed.sql
tests/            vitest suites
```
