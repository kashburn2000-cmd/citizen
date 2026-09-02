-- Progressive Races Dashboard: initial schema
-- Run this in the Supabase SQL editor (or `supabase db push`).
-- Everything is publicly readable. Writes require a profile with role editor or admin.


-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Profiles (one row per auth user; role gates writes)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'viewer' check (role in ('viewer', 'editor', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_editor()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('editor', 'admin')
  );
$$;

-- Promote a user by email. Run once after your first magic-link login:
--   select public.grant_editor('you@example.com', 'admin');
create or replace function public.grant_editor(target_email text, new_role text default 'editor')
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set role = new_role where lower(email) = lower(target_email);
  if not found then
    raise exception 'No profile with email %. Log in once first so the profile exists.', target_email;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- House seats: all 435, drives the map shading and the 218 count
-- ---------------------------------------------------------------------------
create table public.house_seats (
  id text primary key,                      -- 'NY-14', 'AK-00' for at-large
  state char(2) not null,
  district smallint not null,               -- 0 = at-large
  incumbent_name text,
  incumbent_party text not null default 'V' check (incumbent_party in ('D', 'R', 'I', 'V')),  -- V = vacant
  caucuses_with text check (caucuses_with in ('D', 'R')),  -- for independents
  notes text,
  needs_review boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (state, district)
);
create trigger house_seats_updated before update on public.house_seats
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Races
-- ---------------------------------------------------------------------------
create table public.races (
  id text primary key,                      -- 'house-ny-14-2026-general'
  office text not null check (office in ('house', 'senate', 'governor')),
  state char(2) not null,
  district smallint,                        -- house only
  seat_id text references public.house_seats(id) on delete set null,
  senate_class smallint check (senate_class in (1, 2, 3)),
  title text not null,
  election_date date not null,
  election_type text not null default 'general'
    check (election_type in ('general', 'primary', 'runoff', 'special', 'top_two')),
  rating text check (rating in ('safe_d', 'likely_d', 'lean_d', 'tossup', 'lean_r', 'likely_r', 'safe_r')),
  incumbent_name text,
  incumbent_party text check (incumbent_party in ('D', 'R', 'I')),
  is_open_seat boolean not null default false,
  why_it_matters text,
  notes text,
  tracked boolean not null default true,
  needs_review boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index races_office_state on public.races (office, state);
create index races_election_date on public.races (election_date);
create trigger races_updated before update on public.races
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Candidates
-- ---------------------------------------------------------------------------
create table public.candidates (
  id text primary key,                      -- slug
  race_id text not null references public.races(id) on delete cascade,
  name text not null,
  party text not null default 'D' check (party in ('D', 'R', 'I', 'G', 'L', 'WFP', 'other')),
  is_incumbent boolean not null default false,
  status text not null default 'running'
    check (status in ('running', 'won_primary', 'lost_primary', 'advanced', 'withdrew', 'won', 'lost')),
  website text,
  bio text,
  fec_id text,
  dw_nominate numeric(5, 3),                -- Voteview first dimension, incumbents only
  photo_url text,
  notes text,
  sort_order smallint not null default 0,
  needs_review boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index candidates_race on public.candidates (race_id);
create trigger candidates_updated before update on public.candidates
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Issues (the scoring rubric) and scores
-- ---------------------------------------------------------------------------
create table public.issues (
  id text primary key,                      -- 'm4a'
  name text not null,
  description text,
  weight numeric(4, 2) not null default 1 check (weight >= 0),
  sort_order smallint not null default 0,
  rubric jsonb not null default '{}'::jsonb, -- {"0": "...", "2": "...", "4": "..."}
  active boolean not null default true,
  updated_at timestamptz not null default now()
);
create trigger issues_updated before update on public.issues
  for each row execute function public.set_updated_at();

create table public.scores (
  candidate_id text not null references public.candidates(id) on delete cascade,
  issue_id text not null references public.issues(id) on delete cascade,
  score smallint not null check (score between 0 and 4),
  evidence text,
  source_url text,
  provisional boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (candidate_id, issue_id)
);
create trigger scores_updated before update on public.scores
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Endorsing organizations and endorsements
-- ---------------------------------------------------------------------------
create table public.orgs (
  id text primary key,
  name text not null,
  url text,
  kind text not null default 'progressive'
    check (kind in ('progressive', 'labor', 'establishment', 'issue', 'other')),
  signal smallint not null default 1 check (signal in (-1, 0, 1)),  -- 1 = progressive signal, -1 = counter-signal
  sort_order smallint not null default 0
);

create table public.endorsements (
  id bigint generated always as identity primary key,
  candidate_id text not null references public.candidates(id) on delete cascade,
  org_id text not null references public.orgs(id) on delete cascade,
  note text,
  url text,
  created_at timestamptz not null default now(),
  unique (candidate_id, org_id)
);

-- ---------------------------------------------------------------------------
-- Weighted progressive score per candidate (0-100, over scored issues only)
-- ---------------------------------------------------------------------------
create or replace view public.candidate_scores as
select
  c.id as candidate_id,
  c.race_id,
  round(100 * sum(s.score * i.weight) / nullif(4 * sum(i.weight), 0), 1) as progressive_score,
  count(s.score)::int as issues_scored,
  (select count(*) from public.issues where active)::int as issues_total,
  bool_or(s.provisional) as any_provisional
from public.candidates c
left join public.scores s on s.candidate_id = c.id
left join public.issues i on i.id = s.issue_id and i.active
group by c.id, c.race_id;

-- ---------------------------------------------------------------------------
-- Row level security: public read, editor write
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.house_seats enable row level security;
alter table public.races enable row level security;
alter table public.candidates enable row level security;
alter table public.issues enable row level security;
alter table public.scores enable row level security;
alter table public.orgs enable row level security;
alter table public.endorsements enable row level security;

-- profiles: you can see your own row; admins can see and change all rows
create policy profiles_self_read on public.profiles for select using (id = auth.uid() or public.is_editor());
create policy profiles_admin_write on public.profiles for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (true);

do $$
declare t text;
begin
  foreach t in array array['house_seats', 'races', 'candidates', 'issues', 'scores', 'orgs', 'endorsements'] loop
    execute format('create policy %I_public_read on public.%I for select using (true)', t, t);
    execute format('create policy %I_editor_insert on public.%I for insert with check (public.is_editor())', t, t);
    execute format('create policy %I_editor_update on public.%I for update using (public.is_editor()) with check (public.is_editor())', t, t);
    execute format('create policy %I_editor_delete on public.%I for delete using (public.is_editor())', t, t);
  end loop;
end $$;

grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on public.house_seats, public.races, public.candidates,
  public.issues, public.scores, public.orgs, public.endorsements to authenticated;
grant update on public.profiles to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on function public.is_editor() to anon, authenticated;
