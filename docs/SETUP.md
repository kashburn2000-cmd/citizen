# Setup: Supabase and Vercel

The app runs in two modes. With no Supabase keys it serves the JSON in `data/seed` read-only. With keys it reads and writes Supabase, and anyone you promote to editor can change scores from the browser.

## 1. Create the Supabase project

1. Go to supabase.com, create a project. Pick a region near you and save the database password somewhere.
2. Open the SQL editor and paste the whole of `supabase/migrations/0001_init.sql`. Run it. That creates every table, the `candidate_scores` view, row-level security, and the trigger that makes a `profiles` row for each new user. Then do the same with each later file in `supabase/migrations`, in order (`0002_candidate_fec_and_status.sql` adds the FEC columns, the "died" status, and the "politician" org kind).
3. Project Settings, then API. Copy the project URL and the publishable (anon) key.

## 2. Local env

```
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Restart `npm run dev`. The "Read-only preview" badge in the header goes away.

The app also accepts the names the Supabase Vercel integration sets (`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`), so using that integration instead of pasting keys works too. Visit `/api/health` on any deployment to see which variables it found and whether it can reach the database.

## 3. Load the seed data

Open `supabase/seed.sql` from the repo on GitHub (click the file, then the "Raw" button), select all, copy. Back in the Supabase SQL editor, paste it into a new query and run it. It loads every seat, race, candidate, score, and endorsement. It's safe to run again later: existing rows are updated, not duplicated, and rows that are no longer in the seed files are deleted, so the database ends up matching `data/seed` exactly.

If you'd rather use the terminal, `npm run seed` does the same thing from the JSON files but needs the service role key (Project Settings, API, service_role). That key bypasses row-level security, so keep it out of the browser and out of git.

## 4. Make yourself an editor

1. Open the site, click "Sign in to edit". Either create an account with a password (one confirmation email, then it's email and password from then on) or use the email-link option. If you signed in with a link, the same page lets you set a password afterward.
2. Back in the SQL editor:

```sql
select public.grant_editor('you@example.com', 'admin');
```

Reload. The header shows "· editor" and every race panel gets score buttons, a rating dropdown, and status controls.

Anyone else who signs in is a viewer until you run `grant_editor` for them. Public visitors never need to sign in.

## 5. Magic link redirect

In Supabase, Authentication, URL Configuration: set the Site URL to your deployed URL and add `https://your-site/auth/confirm` and `http://localhost:3000/auth/confirm` to the redirect allow list. Without this the emailed link bounces to Supabase's default page.

## 6. Deploy to Vercel

1. Push the repo to GitHub and import it in Vercel. Framework preset: Next.js. No build settings needed.
2. Add the two `NEXT_PUBLIC_SUPABASE_*` variables under Environment Variables.
3. Deploy. Then go back to step 5 and add the Vercel URL to the Supabase redirect list.

## Updating data later

Four options, pick whichever fits:

- Edit in the browser as an editor. Changes are live immediately.
- Edit the Excel export. Download the workbook from `/api/export` as an editor, change whatever you like in the Candidates, Scores, Races, House Seats, Issues, Endorsements, and Orgs sheets (add rows, delete rows, rename ids), then run `npm run import:workbook -- path/to/file.xlsx`. That rewrites `data/seed` from the workbook. Then `npm run build:seed-sql` and paste `supabase/seed.sql` as in step 3. The workbook is treated as the whole truth: a row you deleted from a sheet is deleted from the database, and an id you renamed becomes a new row with the old one removed. Calculated columns (progressive score, the issue columns on the Candidates sheet, the race score snapshots) are ignored; the Scores sheet is what counts.
- Edit the JSON in `data/seed` directly, then `npm run build:seed-sql` and paste, or run `npm run seed`.
- Ask Claude to update the seed files and re-run the seed.

Any of the file-based routes overwrites matching rows in Supabase with the file's values, so don't do this for rows you've since edited in the browser without exporting first.

If the schema changed since you set up the project (a new migration file appeared in `supabase/migrations`), run that migration in the SQL editor before pasting the new `seed.sql`, or the insert will fail on the missing column.

For the 435 House seats specifically, edit `scripts/house-seats.txt` (one line per seat) and run `npm run build:seats`, then `npm run seed`.

## Regenerating the maps

`npm run build:geo` rebuilds `public/geo/house-cartogram.json` (the hex layout) and `public/geo/states-albers.json` (state outlines) from the `us-atlas` package. You only need this if you change hex size or spacing in `scripts/build-cartogram.ts`.

`bash scripts/build-districts.sh` downloads the Census 119th Congress boundaries and writes `public/geo/districts-albers.json` for the geographic House view. Re-run it when the Census publishes 120th Congress shapes after the 2026 maps settle.
