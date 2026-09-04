-- Progressive Races Dashboard: candidate FEC columns, "died" status, "politician" org kind
-- Run this in the Supabase SQL editor after 0001_init.sql and before loading a seed.sql built on or after 2026-09-04.

-- A candidate can die between filing and the primary (GA-13, April 2026).
alter table public.candidates drop constraint if exists candidates_status_check;
alter table public.candidates add constraint candidates_status_check
  check (status in ('running', 'won_primary', 'lost_primary', 'advanced', 'withdrew', 'won', 'lost', 'died'));

-- Individual politicians (Sanders, AOC, Warren) endorse too.
alter table public.orgs drop constraint if exists orgs_kind_check;
alter table public.orgs add constraint orgs_kind_check
  check (kind in ('progressive', 'labor', 'establishment', 'issue', 'politician', 'other'));

-- Outreach and FEC data per candidate. Governors do not file with the FEC, so their FEC columns stay null.
alter table public.candidates
  add column if not exists open_questions text,                       -- rubric issues with no published position found
  add column if not exists nonindividual_share numeric(5, 1)          -- percent of receipts from non-individual sources (ActBlue-style conduits included)
    check (nonindividual_share is null or (nonindividual_share >= 0 and nonindividual_share <= 100)),
  add column if not exists outside_spending_for numeric(14, 2)        -- FEC Schedule E, dollars supporting
    check (outside_spending_for is null or outside_spending_for >= 0),
  add column if not exists outside_spending_against numeric(14, 2)    -- FEC Schedule E, dollars opposing
    check (outside_spending_against is null or outside_spending_against >= 0),
  add column if not exists top_outside_spenders text;                 -- largest outside spenders, as text
