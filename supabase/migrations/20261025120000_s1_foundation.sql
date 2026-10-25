-- Event Engine. S1 foundation.
-- Read before writing: project cxedgteczvlawjqzfvnc had no public tables (fresh project).
-- Additive only. Never edit this file after it is applied (ADR-06).
-- All timestamps timestamptz UTC (ADR-05). Display in America/Chicago.

create extension if not exists pgcrypto;

-- ---------- helpers ----------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------- events ----------
-- One row per event. A wedding is a parent row plus child rows per function (ADR-EE-14).
create table public.events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  slug text unique not null,
  name text not null,
  short_name text,
  tagline text,
  event_type text not null default 'public' check (event_type in ('public','private')),
  parent_event_id uuid references public.events(id),
  status text not null default 'draft' check (status in ('draft','open','closed','archived')),
  date date,
  start_time text,
  end_time text,
  venue_name text,
  venue_address text,
  venue_city text,
  venue_map_url text,
  capacity int,
  -- public events
  ticket_price int, table_price int, spotlight_price int,
  zelle_handle text, discount_code text, discount_pct int,
  -- private events
  access_code text unique,
  budget_total int,
  paid_by text,                 -- who funds this event, free text ("Both dads", "Asiya")
  guest_list_note text,         -- "very short list"
  host_line text,               -- "We request the pleasure of your company at the Mehndi of"
  names_line text,              -- "Yasmeen with Zakki"
  verse_ar text, verse_en text, verse_ref text,
  dress_code text,
  hashtag text,
  theme jsonb not null default '{}'::jsonb   -- {type1, type2, band, art_url}
);
create trigger events_updated before update on public.events for each row execute function public.set_updated_at();
create index events_parent_idx on public.events(parent_event_id);

-- ---------- people who log in ----------
-- Six family logins for tenant 1. auth.users holds the credential; this holds the display.
create table public.members (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  event_id uuid not null references public.events(id),   -- the parent event they belong to
  name text not null,
  role text,                    -- "Groom's mother"
  email text not null,
  digest_day text not null default 'Monday',
  digest_time text not null default '08:00',
  active boolean not null default true
);
create unique index members_event_email_idx on public.members(event_id, lower(email));
create trigger members_updated before update on public.members for each row execute function public.set_updated_at();

-- ---------- leads and parties ----------
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  email text unique,            -- lowercased; nullable for guests with phone only
  name text not null,
  phone text,
  business_name text,
  source text not null default 'guest',
  score int not null default 0,
  notes text
);
create trigger leads_updated before update on public.leads for each row execute function public.set_updated_at();

-- A party is a household that replies together (ADR-EE-15).
create table public.parties (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  event_id uuid not null references public.events(id),   -- parent event
  name text not null,           -- "The Ahmed family"
  primary_lead_id uuid references public.leads(id),
  side text check (side in ('groom','bride','both')),
  seats int not null default 1,
  invite_code text unique not null,
  opened_at timestamptz,
  dua text
);
create trigger parties_updated before update on public.parties for each row execute function public.set_updated_at();
create index parties_event_idx on public.parties(event_id);

-- ---------- registrations ----------
-- A row per party per child event is the invitation. No row, not invited.
create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  event_id uuid not null references public.events(id),   -- child event
  party_id uuid references public.parties(id),
  lead_id uuid references public.leads(id),
  type text not null default 'guest' check (type in ('attendee','exhibitor','spotlight','sponsor','guest')),
  status text not null default 'invited' check (status in ('invited','accepted','declined','pending','paid','checked_in','cancelled','expired')),
  code text unique,
  amount int not null default 0,
  party_size int not null default 1,
  attending_count int,
  attending_names text,
  meal_choice text,
  dietary text,
  rsvp_at timestamptz,
  invited_at timestamptz default now(),
  checked_in_at timestamptz
);
create unique index registrations_party_event_idx on public.registrations(party_id, event_id) where party_id is not null;
create trigger registrations_updated before update on public.registrations for each row execute function public.set_updated_at();
create index registrations_event_idx on public.registrations(event_id);

-- ---------- tasks (the project management core) ----------
-- Task = person + task + event, with money on it (ADR-EE-16).
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  event_id uuid not null references public.events(id),   -- child or parent event
  title text not null,
  owner_id uuid references public.members(id),
  due date,
  phase text not null default 'pre' check (phase in ('pre','day','post')),
  category text,                -- venue | catering | event management | flowers | decor | invites | guest reminders | photo and video | outfits | mehndi artist | other
  quoted_amount int not null default 0,     -- vendor quote, 0 if none
  fulfilled_by text not null default 'vendor' check (fulfilled_by in ('vendor','ourselves')),
  amount int not null default 0,            -- contract if vendor, materials if ourselves
  paid int not null default 0,
  paid_by text,
  quote_source text,
  vendor_name text,
  notes text,
  done boolean not null default false,
  done_at timestamptz,
  remind_when_done boolean not null default false,
  client_visible boolean not null default false
);
create trigger tasks_updated before update on public.tasks for each row execute function public.set_updated_at();
create index tasks_event_idx on public.tasks(event_id);
create index tasks_owner_idx on public.tasks(owner_id);

-- ---------- ledger (non-task costs) ----------
create table public.ledger (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  event_id uuid not null references public.events(id),
  kind text not null default 'cost' check (kind in ('revenue','cost','float')),
  line text not null,
  amount int not null,
  party text,                   -- who paid
  receipt_url text,
  task_id uuid references public.tasks(id)
);
create trigger ledger_updated before update on public.ledger for each row execute function public.set_updated_at();

-- ---------- site content ----------
create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  event_id uuid references public.events(id),   -- null = every page of the parent
  parent_event_id uuid not null references public.events(id),
  question text not null,
  answer text not null,
  sort int not null default 0,
  published boolean not null default true
);
create trigger faqs_updated before update on public.faqs for each row execute function public.set_updated_at();

create table public.site_content (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  event_id uuid not null references public.events(id),   -- parent
  key text not null,            -- home_welcome | registry_note | travel_airports | hotel_block | directions_<slug> | sadqa_causes | rsvp_contacts | reply_by
  body text not null default '',
  published boolean not null default true
);
create unique index site_content_key_idx on public.site_content(event_id, key);
create trigger site_content_updated before update on public.site_content for each row execute function public.set_updated_at();

-- ---------- RLS ----------
-- Team (authenticated) full CRUD. Anon nothing in S1; the site reads through views in S5.
alter table public.events enable row level security;
alter table public.members enable row level security;
alter table public.leads enable row level security;
alter table public.parties enable row level security;
alter table public.registrations enable row level security;
alter table public.tasks enable row level security;
alter table public.ledger enable row level security;
alter table public.faqs enable row level security;
alter table public.site_content enable row level security;

do $$
declare t text;
begin
  foreach t in array array['events','members','leads','parties','registrations','tasks','ledger','faqs','site_content'] loop
    execute format('create policy %I_auth_select on public.%I for select to authenticated using (true)', t, t);
    execute format('create policy %I_auth_insert on public.%I for insert to authenticated with check (true)', t, t);
    execute format('create policy %I_auth_update on public.%I for update to authenticated using (true) with check (true)', t, t);
    execute format('create policy %I_auth_delete on public.%I for delete to authenticated using (true)', t, t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

-- ---------- decision views ----------
-- Budget roll-up per event: committed = contract or materials, paid, saved = quote minus actual.
create or replace view public.v_event_budget as
select
  e.id as event_id,
  e.parent_event_id,
  e.name,
  e.budget_total,
  coalesce(sum(t.amount),0) + coalesce((select sum(l.amount) from public.ledger l where l.event_id = e.id and l.kind='cost'),0) as committed,
  coalesce(sum(t.paid),0) as paid,
  coalesce(sum(greatest(0, t.quoted_amount - t.amount)),0) as saved,
  count(*) filter (where not t.done) as open_tasks
from public.events e
left join public.tasks t on t.event_id = e.id
group by e.id;
grant select on public.v_event_budget to authenticated;

-- Per-member week: what is theirs, with urgency.
create or replace view public.v_member_tasks as
select
  t.*,
  m.name as owner_name,
  e.short_name as event_short,
  e.name as event_name,
  (t.amount - t.paid) as remaining,
  greatest(0, t.quoted_amount - t.amount) as saved,
  case
    when t.done then 'done'
    when t.due is null then 'open'
    when t.due < current_date then 'overdue'
    when t.due <= current_date + 7 then 'soon'
    else 'open'
  end as urgency
from public.tasks t
left join public.members m on m.id = t.owner_id
left join public.events e on e.id = t.event_id;
grant select on public.v_member_tasks to authenticated;
