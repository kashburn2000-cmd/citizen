# Progressive Races 2026

A dashboard for tracking the fight for the House and the progressive candidates running in 2026. It shows who holds every House seat, where the tracked races are, who's running, and a scoring matrix that rates each candidate on a rubric you control.

## What's here

- A hex cartogram of all 435 House seats shaded by current party, with a projected view driven by race ratings and a 218 line. A geographic view with real district boundaries is one click away.
- Geographic maps for Senate and governor races with a pin per tracked race.
- A race panel for each tracked contest: date, rating, incumbent, why it matters, and every candidate with bio, endorsements, and score.
- A scoring rubric (12 issues, each with a 0 to 4 scale and a weight) and a sortable matrix of every scored candidate.
- Edit mode for anyone you promote to editor: score candidates, change ratings and statuses, adjust weights. Everything else is public read-only.

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

Seat holders come from the `unitedstates/congress-legislators` dataset and incumbent ideology scores (DW-NOMINATE, first dimension) from Voteview, both pulled Sept 2, 2026. Primary results and nominees for every tracked race were checked against Wikipedia's 2026 election pages the same day; each race's notes say so. Things still worth checking:

- Four House seats emptied in April 2026 (CA-14, FL-20, GA-13, TX-23). The dataset shows the dates but not the reasons or special election status.
- Kevin Kiley (CA-3) is listed as an independent. Which party he caucuses with is not recorded.
- A handful of candidates are marked "withdrew" or "lost primary" only because they no longer appear on the ballot; those keep `needs_review: true`.
- Race ratings are my own read, not Cook or Sabato.
- The geographic House map uses Census 119th Congress boundaries. States that redrew for 2026 (Texas, California, Missouri, North Carolina, Ohio, Utah) will not match the ballot. The hex map is unaffected.

Scores are marked provisional until an editor clears the flag. The evidence field on each score says why it got the number it did, so you can disagree with it.

Refresh scripts: `npm run build:seats` (from `scripts/house-seats.txt`), `python3 scripts/enrich-voteview.py`, `bash scripts/build-districts.sh`, `npm run build:geo`.

## Layout

```
app/              pages and routes (map, matrix, rubric, race detail, login)
components/       map, panels, matrix, editors
lib/              types, scoring math, data loading, Supabase clients
data/seed/        the JSON that seeds the database (and serves static mode)
scripts/          builds the cartogram, state outlines, seat list; seeds Supabase
supabase/         SQL migration
tests/            vitest suites
```
