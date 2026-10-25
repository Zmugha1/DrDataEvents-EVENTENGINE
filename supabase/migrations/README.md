-- check: select count(*) from information_schema.tables where table_schema='public'; -- expect 9

## 20261025150000_s3_rsvp.sql

Guest site read by invite code (`site_invite`), RSVP write (`site_rsvp`, service role only), `v_rsvp` roll-up, `events.reply_by`, `events.photo_url`. Run after S1.

Check: `select proname from pg_proc where proname in ('site_invite','site_rsvp');` expect 2 rows.

Also `/api/site?i=CODE` (GET) returns `site_invite` for the wedding site.

Netlify env for the engine site, scope Functions, marked secret: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Optional `SITE_ORIGINS` (comma list; default https://zakkiwedsyasmeen.netlify.app).

## 20261025170000_s3b_public_events.sql

`site_invite` also returns `public_events` (all open child events, no guest data) so the public view shows every event. Check: `select proname from pg_proc where proname = 'site_invite';` expect 1 row.

## 20261025180000_s5_send.sql

`send_queue` table, `parties.invited_at / last_reminded_at / reminder_count`, default email templates in `site_content`. Check: `select count(*) from information_schema.tables where table_schema='public' and table_name='send_queue';` expect 1.
