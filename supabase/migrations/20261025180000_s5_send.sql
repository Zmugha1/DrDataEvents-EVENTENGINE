-- S5. Invite send and reminders. Additive only (ADR-06). ADR-07: sends run from a scheduled function over a queue table.

alter table public.parties add column if not exists invited_at timestamptz;
alter table public.parties add column if not exists last_reminded_at timestamptz;
alter table public.parties add column if not exists reminder_count int not null default 0;

create table if not exists public.send_queue (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  event_id uuid not null references public.events(id),      -- parent
  party_id uuid references public.parties(id),
  kind text not null check (kind in ('invite','reminder','digest')),
  side text,                                               -- groom | bride: picks the sender mailbox
  to_email text not null,
  subject text not null,
  body text not null,
  status text not null default 'queued' check (status in ('queued','sent','error','skipped')),
  sent_at timestamptz,
  error text
);
create trigger send_queue_updated before update on public.send_queue for each row execute function public.set_updated_at();
create index if not exists send_queue_status_idx on public.send_queue(status, created_at);
create index if not exists send_queue_party_idx on public.send_queue(party_id);

alter table public.send_queue enable row level security;
create policy send_queue_auth_select on public.send_queue for select to authenticated using (true);
create policy send_queue_auth_insert on public.send_queue for insert to authenticated with check (true);
create policy send_queue_auth_update on public.send_queue for update to authenticated using (true) with check (true);
create policy send_queue_auth_delete on public.send_queue for delete to authenticated using (true);
grant select, insert, update, delete on public.send_queue to authenticated;
revoke all on public.send_queue from anon;

-- Email templates live in site_content so the Website tab edits them. Placeholders: {family} {events} {link} {reply_by} {seats}
insert into public.site_content (event_id, key, body)
select e.id, k.key, k.body from public.events e
cross join (values
  ('invite_subject', 'You are invited: Zakki and Yasmeen''s wedding'),
  ('invite_body', E'Assalamu alaikum {family},\n\nWith hearts full of gratitude to Allah, we invite you to celebrate the marriage of Zakki and Yasmeen.\n\nYou are invited to:\n{events}\n\nYour personal page, with the details and your RSVP:\n{link}\n\nPlease reply by {reply_by}. Your link is for {seats} seats.\n\nAttending or not, we ask you for a dua for the couple.\n\nWith love,\nThe families of Zakki and Yasmeen'),
  ('reminder_subject', 'A gentle reminder: Zakki and Yasmeen''s wedding'),
  ('reminder_body', E'Assalamu alaikum {family},\n\nWe have not heard back yet and would love to know if you can join us.\n\n{events}\n\nReply here, it takes a minute:\n{link}\n\nPlease reply by {reply_by}.\n\nWith love,\nThe families of Zakki and Yasmeen')
) as k(key, body)
where e.event_type = 'private' and e.parent_event_id is null
on conflict (event_id, key) do nothing;

-- Check: expect 1
select count(*) from information_schema.tables where table_schema = 'public' and table_name = 'send_queue';
