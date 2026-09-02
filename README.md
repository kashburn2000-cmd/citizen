# Progressive Races 2026

A dashboard for tracking the fight for the House and the progressive candidates running in 2026. It shows who holds every House seat, where the tracked races are, who's running, and a scoring matrix that rates each candidate on a rubric you control.

## What's here

- A hex cartogram of all 435 House seats shaded by current party, with a projected view driven by race ratings and a 218 line.
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

Everything in `data/seed` was authored from information available through mid-2026 and has not been checked against a live source. Every row starts with `needs_review: true`. Things most likely to be stale:

- Results of primaries held after early June 2026. Candidates in those races are listed with status `running` and a note on the race saying which primary to check.
- The GA-14 special election winner and the CA-1 vacancy.
- District numbering in states that redrew maps for 2026 (Texas, California, Missouri, North Carolina, Ohio, Utah). Seats keep their old numbers on the map.
- Race ratings, which are my own read as of the seed date, not Cook or Sabato.

Scores are marked provisional until an editor clears the flag. The evidence field on each score says why it got the number it did, so you can disagree with it.

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
