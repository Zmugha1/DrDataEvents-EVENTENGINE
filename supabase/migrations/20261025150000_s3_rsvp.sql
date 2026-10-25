-- S3 part 1. Guest site read by invite code, RSVP write, RSVP roll-up. Additive only (ADR-06).
-- Paste in the SQL Editor. Check query at the bottom.
--
-- Anon never gets a table grant. The site calls one function, site_invite(code), which returns only
-- the open events that party is invited to plus published site content. Writes go through a Netlify
-- function (service role) that calls site_rsvp (ADR-02).

alter table public.events add column if not exists reply_by date;      -- parent: RSVP deadline
alter table public.events add column if not exists photo_url text;     -- page photo, e.g. images/page-nikkah.jpg

-- ---------- read ----------
create or replace function public.site_invite(p_code text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_party   public.parties%rowtype;
  v_parent  public.events%rowtype;
  v_events  jsonb := '[]'::jsonb;
  v_regs    jsonb := '[]'::jsonb;
  v_content jsonb := '{}'::jsonb;
  v_pub     jsonb;
begin
  if p_code is not null and length(trim(p_code)) >= 4 then
    select * into v_party from public.parties where invite_code = upper(trim(p_code));
  end if;

  if v_party.id is not null then
    select * into v_parent from public.events where id = v_party.event_id;
    update public.parties set opened_at = coalesce(opened_at, now()) where id = v_party.id;
  else
    -- no code or unknown code: the parent event only, no child events, no RSVP
    select * into v_parent from public.events
      where event_type = 'private' and parent_event_id is null and status = 'open'
      order by date limit 1;
  end if;

  if v_parent.id is null then return jsonb_build_object('ok', false); end if;

  v_pub := jsonb_build_object(
    'slug', v_parent.slug, 'name', v_parent.name, 'date', v_parent.date,
    'venue_city', v_parent.venue_city, 'host_line', v_parent.host_line, 'names_line', v_parent.names_line,
    'verse_ar', v_parent.verse_ar, 'verse_en', v_parent.verse_en, 'verse_ref', v_parent.verse_ref,
    'hashtag', v_parent.hashtag, 'theme', v_parent.theme, 'photo_url', v_parent.photo_url,
    'reply_by', v_parent.reply_by);

  select coalesce(jsonb_object_agg(key, body), '{}'::jsonb) into v_content
    from public.site_content where event_id = v_parent.id and published;

  if v_party.id is not null then
    select coalesce(jsonb_agg(jsonb_build_object(
        'slug', e.slug, 'name', e.name, 'short_name', e.short_name, 'date', e.date,
        'start_time', e.start_time, 'end_time', e.end_time,
        'venue_name', e.venue_name, 'venue_address', e.venue_address, 'venue_city', e.venue_city, 'venue_map_url', e.venue_map_url,
        'host_line', e.host_line, 'names_line', e.names_line,
        'verse_ar', e.verse_ar, 'verse_en', e.verse_en, 'verse_ref', e.verse_ref,
        'dress_code', e.dress_code, 'theme', e.theme, 'photo_url', e.photo_url
      ) order by e.date), '[]'::jsonb)
      into v_events
      from public.events e
      join public.registrations r on r.event_id = e.id and r.party_id = v_party.id
      where e.parent_event_id = v_parent.id and e.status = 'open';

    select coalesce(jsonb_agg(jsonb_build_object(
        'slug', e.slug, 'status', r.status, 'attending_count', r.attending_count,
        'attending_names', r.attending_names, 'meal_choice', r.meal_choice, 'dietary', r.dietary, 'rsvp_at', r.rsvp_at
      )), '[]'::jsonb)
      into v_regs
      from public.registrations r join public.events e on e.id = r.event_id
      where r.party_id = v_party.id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'party', case when v_party.id is null then null else jsonb_build_object(
      'name', v_party.name, 'seats', v_party.seats, 'side', v_party.side, 'dua', v_party.dua) end,
    'parent', v_pub,
    'events', v_events,
    'registrations', v_regs,
    'content', v_content);
end $$;

revoke all on function public.site_invite(text) from public;
grant execute on function public.site_invite(text) to anon, authenticated, service_role;

-- ---------- write ----------
-- p_replies: [{slug, status: accepted|declined, attending_count, attending_names, meal_choice, dietary}]
create or replace function public.site_rsvp(p_code text, p_replies jsonb, p_dua text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_party public.parties%rowtype;
  v_reply jsonb;
  v_status text;
  v_count int;
  v_n int := 0;
begin
  select * into v_party from public.parties where invite_code = upper(trim(coalesce(p_code, '')));
  if v_party.id is null then return jsonb_build_object('ok', false, 'error', 'unknown_code'); end if;
  if p_replies is null or jsonb_typeof(p_replies) <> 'array' then
    return jsonb_build_object('ok', false, 'error', 'bad_replies');
  end if;

  for v_reply in select * from jsonb_array_elements(p_replies) loop
    v_status := v_reply->>'status';
    if v_status not in ('accepted','declined') then continue; end if;
    v_count := case when v_status = 'declined' then 0
                    else least(greatest(coalesce((v_reply->>'attending_count')::int, 1), 1), v_party.seats) end;

    update public.registrations r set
      status = v_status,
      attending_count = v_count,
      attending_names = left(v_reply->>'attending_names', 500),
      meal_choice = left(v_reply->>'meal_choice', 60),
      dietary = left(v_reply->>'dietary', 300),
      rsvp_at = now()
    from public.events e
    where e.id = r.event_id and e.slug = v_reply->>'slug' and r.party_id = v_party.id;
    if found then v_n := v_n + 1; end if;
  end loop;

  if p_dua is not null and length(trim(p_dua)) > 0 then
    update public.parties set dua = left(trim(p_dua), 1000) where id = v_party.id;
  end if;

  return jsonb_build_object('ok', true, 'updated', v_n);
end $$;

revoke all on function public.site_rsvp(text, jsonb, text) from public, anon;
grant execute on function public.site_rsvp(text, jsonb, text) to service_role, authenticated;

-- ---------- roll-up for the engine ----------
create or replace view public.v_rsvp as
select
  e.id as event_id, e.slug, e.name, e.date,
  count(r.id) as parties_invited,
  count(r.id) filter (where r.status = 'accepted') as parties_accepted,
  count(r.id) filter (where r.status = 'declined') as parties_declined,
  count(r.id) filter (where r.status = 'invited') as parties_waiting,
  coalesce(sum(p.seats), 0) as seats_invited,
  coalesce(sum(r.attending_count) filter (where r.status = 'accepted'), 0) as guests_coming
from public.events e
left join public.registrations r on r.event_id = e.id and r.type = 'guest'
left join public.parties p on p.id = r.party_id
where e.parent_event_id is not null
group by e.id;
grant select on public.v_rsvp to authenticated;

-- Check: expect 2 rows (site_invite, site_rsvp)
select proname from pg_proc where proname in ('site_invite','site_rsvp') order by 1;
