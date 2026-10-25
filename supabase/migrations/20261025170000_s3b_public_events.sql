-- S3 part 1b. site_invite also returns public_events: every open child event, no guest data.
-- The wedding site shows all events to a visitor without a code; RSVP still needs the code.

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
  v_public  jsonb := '[]'::jsonb;
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

  -- every open child event, no guest data: the public view and the schedule page
  select coalesce(jsonb_agg(jsonb_build_object(
      'slug', e.slug, 'name', e.name, 'short_name', e.short_name, 'date', e.date,
      'start_time', e.start_time, 'end_time', e.end_time,
      'venue_name', e.venue_name, 'venue_address', e.venue_address, 'venue_city', e.venue_city, 'venue_map_url', e.venue_map_url,
      'host_line', e.host_line, 'names_line', e.names_line,
      'verse_ar', e.verse_ar, 'verse_en', e.verse_en, 'verse_ref', e.verse_ref,
      'dress_code', e.dress_code, 'theme', e.theme, 'photo_url', e.photo_url
    ) order by e.date), '[]'::jsonb)
    into v_public
    from public.events e where e.parent_event_id = v_parent.id and e.status = 'open';

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
    'public_events', v_public,
    'registrations', v_regs,
    'content', v_content);
end $$;


-- Check: expect 1 row
select proname from pg_proc where proname = 'site_invite';
