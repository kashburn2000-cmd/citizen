# Setup: Supabase and Vercel

The app runs in two modes. With no Supabase keys it serves the JSON in `data/seed` read-only. With keys it reads and writes Supabase, and anyone you promote to editor can change scores from the browser.

## 1. Create the Supabase project

1. Go to supabase.com, create a project. Pick a region near you and save the database password somewhere.
2. Open the SQL editor and paste the whole of `supabase/migrations/0001_init.sql`. Run it. That creates every table, the `candidate_scores` view, row-level security, and the trigger that makes a `profiles` row for each new user.
3. Project Settings, then API. Copy the project URL and the publishable (anon) key.

## 2. Local env

```
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Restart `npm run dev`. The "Read-only preview" badge in the header goes away.

## 3. Load the seed data

You need the service role key for this one step (Project Settings, API, service_role). It bypasses row-level security, so keep it out of the browser and out of git.

```
SUPABASE_URL=https://xxxx.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=... \
npm run seed
```

Re-running upserts, so it's safe. Add `-- --reset` to wipe the data tables first (profiles are untouched).

## 4. Make yourself an editor

1. Open the site, click "Sign in to edit", enter your email, click the magic link.
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

Three options, pick whichever fits:

- Edit in the browser as an editor. Changes are live immediately.
- Edit the JSON in `data/seed` and run `npm run seed` again. This overwrites matching rows in Supabase with the file's values, so don't do this for rows you've since edited in the browser.
- Ask Claude to update the seed files and re-run the seed.

For the 435 House seats specifically, edit `scripts/house-seats.txt` (one line per seat) and run `npm run build:seats`, then `npm run seed`.

## Regenerating the maps

`npm run build:geo` rebuilds `public/geo/house-cartogram.json` (the hex layout) and `public/geo/states-albers.json` (state outlines) from the `us-atlas` package. You only need this if you change hex size or spacing in `scripts/build-cartogram.ts`.
