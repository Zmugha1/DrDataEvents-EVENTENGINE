-- Starter tasks for the six family logins. Data only, no schema change.
-- Paste in Supabase SQL Editor once. Safe to re-run: skips a task that already exists (same event + title).
-- Amounts stay 0 until a real quote lands. No invented figures.

with ev as (
  select id, slug from events where slug in ('zakki-weds-yasmeen','yasmeen-mehndi','zakki-mehndi','nikkah','shalima')
),
mem as (
  select m.id, split_part(m.name, ' ', 1) as first from members m
  join events p on p.id = m.event_id and p.slug = 'zakki-weds-yasmeen'
),
rows_in(slug, first, title, due, category) as (values
  -- Zakki
  ('nikkah',          'Zakki',   'Nikkah outfit for Zakki',                                     date '2027-02-15', 'outfits'),
  ('shalima',         'Zakki',   'Shalima outfit for Zakki',                                    date '2027-02-15', 'outfits'),
  ('shalima',         'Zakki',   'Photographer and videographer: get two quotes',               date '2026-12-31', 'photo and video'),
  ('shalima',         'Zakki',   'Groom side guest list for the Shalima, with Kamran',          date '2026-12-15', 'invites'),
  -- Yasmeen
  ('yasmeen-mehndi',  'Yasmeen', 'Mehndi artist for Yasmeen''s Mehndi',                         date '2027-01-31', 'mehndi artist'),
  ('nikkah',          'Yasmeen', 'Nikkah outfit for Yasmeen',                                   date '2027-02-15', 'outfits'),
  ('shalima',         'Yasmeen', 'Shalima outfit for Yasmeen',                                  date '2027-02-15', 'outfits'),
  ('shalima',         'Yasmeen', 'Bride side guest list for the Shalima, with Taqi',            date '2026-12-15', 'invites'),
  -- Asiya
  ('yasmeen-mehndi',  'Asiya',   'Guest list for Yasmeen''s Mehndi',                            date '2026-12-15', 'invites'),
  ('yasmeen-mehndi',  'Asiya',   'Catering for Yasmeen''s Mehndi: vendor or ourselves',         date '2027-01-15', 'catering'),
  ('yasmeen-mehndi',  'Asiya',   'Flowers and decor for Yasmeen''s Mehndi',                     date '2027-02-28', 'flowers'),
  -- Kamran
  ('zakki-mehndi',    'Kamran',  'Guest list for Zakki''s Mehndi',                              date '2026-12-15', 'invites'),
  ('shalima',         'Kamran',  'Shalima catering: get two quotes',                            date '2026-12-31', 'catering'),
  -- Taqi
  ('nikkah',          'Taqi',    'Nikkah catering: vendor or ourselves',                        date '2027-01-15', 'catering'),
  ('shalima',         'Taqi',    'Shalima decor and stage: get two quotes',                     date '2027-01-31', 'decor'),
  -- Zubia
  ('zakki-mehndi',    'Zubia',   'Catering for Zakki''s Mehndi: vendor or ourselves',           date '2027-01-15', 'catering'),
  ('zakki-mehndi',    'Zubia',   'Mehndi artist for Zakki''s Mehndi',                           date '2027-01-31', 'mehndi artist'),
  ('zakki-weds-yasmeen','Zubia', 'Event manager for the week: hire one or run it ourselves',    date '2026-12-31', 'event management')
)
insert into tasks (event_id, owner_id, title, due, category)
select ev.id, mem.id, r.title, r.due, r.category
from rows_in r
join ev on ev.slug = r.slug
join mem on mem.first = r.first
where not exists (select 1 from tasks t where t.event_id = ev.id and t.title = r.title);

-- Check: expect 25 (7 from seed + 18 here)
select count(*) as task_count from tasks;
