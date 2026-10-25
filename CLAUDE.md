# Event Engine. Project context and build instructions

Owner: Dr. Zubia Mughal, Dr. Data Decision Intelligence LLC
Tenant 1: MKE Biz Expo (for-profit LLC, Zubia + Faiza + Saira of The Artisan Aisle)
Status: demos approved. Build at owner's pace. No timelines in this document.

Paste this file into the first message of every build session, or keep it as CLAUDE.md in the repo root.

---

## 1. What this is

Event Engine is a private, team-only web app that runs a recurring event end to end: registration, payments recorded by hand, door check-in, seat inventory, spotlight interviews, ledger and split, tasks, email campaigns, and the public website that reads from the same database.

It replaces the SaaS middlemen (Eventbrite, Mailchimp, Trello, Linktree, Typeform). It keeps the rails: Supabase for data and auth, Netlify for hosting and scheduled functions, Gmail API for sending. No payment processor. Ever.

Event Engine is the product. MKE Biz Expo is the first tenant. Design every table with an `event_id` so a second event brand is a config row, not a rebuild.

---

## 2. Entities and who touches what

| Entity | People | Owns | Pays for |
|---|---|---|---|
| Dr. Data Decision Intelligence LLC | Zubia | Event Engine code, license | Nothing here |
| MKE Biz Expo LLC (joint venture) | Zubia, Faiza, Saira | mkebizexpo.com, mkebizspotlight.com, brand, email list, sponsor contracts, the Supabase project | Engine license from Dr. Data at market rate |
| Wisconsin Small Business Institute (nonprofit, wisbi.org) | Zubia, Marcos Ramos, two independent directors | Education programs, grant applications | Runs the keynote and education track at the expo under a written agreement |

Rules that come from this:
- One Supabase project named `event-engine`, owned by the expo LLC's account, not DrData_Pulse.
- Team logins only. No public signup. Zubia, Faiza, Saira. Add a read-only role later for WiSBI reporting.
- The nonprofit's name and .org never appear on expo payment or sponsor assets.
- Every contract between the three entities is written, market-rate, and Zubia recuses on the WiSBI side. Not a code concern, but the ledger must make it auditable.

---

## 3. Stack (carried from Pulse and AgentPulse)

- Vite + React + TypeScript
- Supabase: Postgres, Auth (email + password, no signup), RLS on every table, Storage for headshots, logos, video
- Netlify: hosting, functions (timeout 300s), scheduled functions for sends
- Gmail API for outbound email (send from the expo LLC's Google Workspace, not Dr. Data's)
- Tailwind. Lakefront palette below.
- No Stripe. No Square. No PayPal. Payments are recorded, not processed.

---

## 4. ADRs carried over. Do not relitigate.

- ADR-01. Auth first, then reads. Nothing renders before session is confirmed.
- ADR-02. Public site uses anon key with SELECT only on published rows of `events`, `orgs`, `spotlights`, `sponsorships`. Anon INSERT only on `registrations` and `orgs` through a Netlify function that validates and rate-limits. Everything else authenticated.
- ADR-03. Secrets server-side. No `VITE_` prefix on anything sensitive.
- ADR-04. Seed by script, never SQL-editor paste. `scripts/seed-event.ts` creates a full demo event.
- ADR-05. Every timestamp is `timestamptz` UTC. Display in America/Chicago.
- ADR-06. Additive migrations only. Never drop or rename a column once the site is live.
- ADR-07. Netlify function timeout 300. Long jobs (video, bulk send) go to a scheduled function with a queue table, not a request.
- ADR-08. Dark mode not built. Light only. The white palette is the brand.
- ADR-09. Every page and generated artifact carries the two footer CTAs (section 10).
- ADR-10. Session hygiene: start prompt and end prompt every session (section 11).

New for this project:

- ADR-EE-01. Payments are recorded, not processed. `payments` table with `method` (zelle, cash, check, ach). Every row is confirmed by a human tap that writes `confirmed_by` and `confirmed_at`. A processor is added later as a new `method`, never a new flow.
- ADR-EE-02. One person, one lead. `registrations` reference `leads`; a person who attends four quarters is one lead with four registrations. Matching key is lowercased email.
- ADR-EE-03. One seat per category per event. Enforced by a unique index on `(event_id, category)` where `type = 'exhibitor'` and `status in ('pending','paid')`. Pending holds expire after 72 hours by scheduled function.
- ADR-EE-04. The public site never hand-edits content. If it is on the site, it is a row.
- ADR-EE-05. Cash has a float. Every event has `float_in` and `float_out` in the ledger. Door cash reconciles against `payments where method = 'cash'` the same night.
- ADR-EE-06. The spotlight is a page before it is a video. `spotlights` row is created at registration; the video URL is filled in after the event. The page publishes when `published_at` is set.

- ADR-EE-07. `events.event_type` is `public` or `private`. Screens, RLS, and public pages branch on it. No separate wedding app.
- ADR-EE-08. Private events have a client. `clients` table, one per private event. The client gets a read-only login scoped to their event. Nothing else.
- ADR-EE-09. Guests are leads with a different source. A wedding guest is a `leads` row with `source = 'guest'` and a `registrations` row with `type = 'guest'`, `amount = 0`. RSVP status lives in `registrations.status` (invited, accepted, declined, checked_in).
- ADR-EE-10. Private event pages are unlisted. Reachable only by `events.access_code` in the URL, `noindex`, never in the sitemap, never in the past-events archive.
- ADR-EE-11. Vendors are orgs. A caterer is an `orgs` row with `org_role = 'vendor'`, linked through `event_vendors` with contract, deposit, balance, and due dates.
- ADR-EE-12. Budget is the ledger with a ceiling. Private events set `events.budget_total`. Ledger `kind = 'cost'` rows roll up against it.
- ADR-EE-13. Private-event tenant #1 is a family wedding (ZakkiWedsYasmeen), not a planner client. No planner credit, no client portal for this event. Event Engine owns guests, per-event invitations, RSVP, vendors, budget with savings, tasks, timeline, calendar, and message drafting. No third-party guest tool.
- ADR-EE-14. One wedding = one parent `events` row plus four child `events` rows (Haldi/Mayon, Mehndi, Nikkah, Shaadi/Valima) linked by `parent_event_id`. Each child has its own venue, tasks, ledger, timeline, reminders. Budget rolls up to the parent.
- ADR-EE-15. Per-guest visibility. Each party gets a unique invite code in its link. The site shows only the events that party is invited to; a `registrations` row per event is the invitation. RSVP accepts only names already on the list.
- ADR-EE-16. Budget lines carry `quoted_amount`, `fulfilled_by` (vendor | ourselves), `actual_cost`, `quote_source`. Savings = quote minus actual. Budget screen shows Budget, Spent, Committed, Remaining, Saved.
- ADR-EE-17. Site content is rows, not code (ADR-EE-04 applied): dates, venues, host lines, verses, dress notes, FAQs, links, floral art, per-page type colors. Edited from the Website tab.
- ADR-EE-18. Wedding site layout (approved Sep 5 2026): masthead (Bismillah motif, ZAKKI & YASMEEN in spaced caps, date · place, countdown, centered menu), then the page photo as a contained rectangle, then invitation lines, verse, details, note, RSVP. One image per page. Palette: burgundy #4A1B24, wine #7A2A36, blush #E8C4C0, ivory #F3ECE4, olive #4F5B3F. Per page: Home peach/mauve roses; Mayon ivory ranunculus + yellow orchids; Mehndi white baby's breath, eucalyptus-green type; Nikkah white roses on a white ground, leaf-green type; Valima full-palette bouquet. Spelling is Valima. Verses: Home Ar-Rum 30:21, Mayon Ya-Sin 36:36, Mehndi Al-A'raf 7:189, Nikkah Al-Baqarah 2:187, Valima Al-Furqan 25:74.

---

## 5. Schema

All tables have `id uuid pk default gen_random_uuid()`, `created_at timestamptz default now()`, `updated_at timestamptz`.

```
events
  slug text unique, name, tagline, date date, start_time, end_time,
  venue_name, venue_address, venue_map_url, capacity int,
  ticket_price int, table_price int, spotlight_price int,
  status text  -- draft | open | closed | archived
  keynote_name, keynote_title, keynote_bio, keynote_headshot_url, keynote_topic
  zelle_handle, discount_code, discount_pct int
  next_event_id uuid null

leads                      -- shared shape with Pulse leads, separate table
  email text unique (lowercased), name, phone, business_name,
  source text, score int default 0, notes text

orgs                       -- the bio page source
  lead_id -> leads, business_name, category, bio text (150 words),
  headshot_url, logo_url, website, gbp_url, socials jsonb,
  photo_release_at timestamptz, published boolean default false, slug text unique

registrations
  event_id -> events, lead_id -> leads, org_id -> orgs null,
  type text  -- attendee | exhibitor | spotlight | sponsor
  category text null  -- required when type = exhibitor
  code text unique  -- REG-0417
  amount int, discount_code text null,
  status text  -- pending | paid | checked_in | cancelled | expired
  qr_token text unique, paid_at, checked_in_at, cancelled_at
  questions jsonb  -- three interview questions from the form

payments
  registration_id -> registrations null, sponsorship_id -> sponsorships null,
  event_id -> events, amount int, method text  -- zelle | cash | check | ach
  memo text, received_at timestamptz, confirmed_by uuid -> auth.users, confirmed_at

sponsorships
  event_id -> events, org_id -> orgs, slot text  -- keynote | spotlight | grazing | silver
  amount int, perks jsonb, status text  -- proposed | invoiced | paid | delivered
  invoice_url, report_url

spotlights
  event_id -> events, org_id -> orgs, registration_id -> registrations,
  slot_number int, questions jsonb, video_url, transcript text,
  published_at timestamptz null, slug text unique

tasks
  event_id -> events, title, owner text, due date, phase text  -- pre | day | post
  done boolean default false, done_at

ledger
  event_id -> events, kind text  -- revenue | cost | float
  line text, amount int, party text  -- drdata | artisan | shared
  receipt_url, payment_id -> payments null

campaigns
  event_id -> events, audience text  -- attendees | exhibitors | sponsors | checked_in | all
  send_at timestamptz, subject, body_md, status text  -- draft | approved | scheduled | sent
  sent_count int, opened_count int

send_queue
  campaign_id -> campaigns, lead_id -> leads, status, sent_at, error text
```

RLS summary:
- anon: SELECT `events` where status = open; `orgs` where published; `spotlights` where published_at not null; `sponsorships` where status in (paid, delivered). INSERT nothing directly; the registration function uses the service role.
- authenticated (team): full CRUD on everything. One role for now.

---

## 6. Workflows. Eight loops, every event runs all eight.

1. Event setup. Insert `events` row, seed `tasks` from template, seed `campaigns` from template. Site goes live on `status = open`.
2. Registration. Public form -> Netlify function -> upsert `leads` by email -> insert `registrations` (pending) -> return code -> email instructions (Zelle to handle, code in memo, or cash at door).
3. Confirmation. Team sees Pending queue. Matches Zelle memo to code. Taps Mark paid -> insert `payments`, set `registrations.status = paid`, generate `qr_token`, email QR ticket, insert `ledger` revenue row.
4. Exhibitor onboarding. Same form, more fields. Writes `orgs`. Enforces one seat per category. Creates the `spotlights` row with slot number. Bio page publishes when `orgs.published = true`.
5. Website. Public pages read the DB: next event, exhibitor grid (16 seats, filled or open), keynote, agenda, sponsors by named slot, spotlight archive, FAQ, past events. Schema.org markup: BusinessEvent, Organization, Person on every page.
6. Event day. Door scan flips `checked_in`. Walk-in form creates lead + registration + payment (cash) + ledger in one call. Spotlight station logs interview start per slot. Raffle draws from checked-in.
7. Post-event. Scheduled sends: T+2h thank-you and survey, T+48h photos and spotlight link, T+7d next date and early-bird code, then monthly newsletter. Sponsor report generated from attendance, page views, link clicks.
8. Money. Ledger per event: Zelle, cash, sponsors invoiced, float in and out, costs. Net, then split by the operating agreement percentage stored in `events` config, not in code.

---

## 7. Screens (match the approved dashboard demo one for one)

Login (no signup) -> Overview (KPIs, needs attention) -> Pending payments -> Door check-in -> Seats -> Spotlight -> Ledger -> Tasks -> Campaigns -> Website (what is live, what is missing, event settings)

Public site (match the approved Lakefront demo): hero with facts and register box, stats bar, keynote, who should attend + agenda, exhibitor grid, spotlight, sponsors by named slot, register with Zelle code flow, FAQ, past events, footer.

---

## 8. Build order (order, not dates)

1. Supabase project, migrations for `events`, `leads`, `orgs`, `registrations`, `payments`. RLS. Seed script.
2. Auth and app shell. Login, sidebar, Overview.
3. Registration function + public form + Pending payments screen + Mark paid. This is the minimum that sells a ticket.
4. Exhibitor form, `orgs`, seat enforcement, Seats screen, public exhibitor grid.
5. QR ticket email, Door check-in, walk-in.
6. Ledger with float and split. Costs entry.
7. Tasks with template seed.
8. Campaigns, send_queue, scheduled function, Gmail API send.
9. Spotlight rows, bio pages, video embed, publish toggle.
10. Sponsorships, named slots on the site, invoice and report fields.
11. Website tab: what is live, what is missing.
12. Second tenant test: seed a second `events` row for a different brand and confirm nothing breaks.

Anything not done by the first event runs by hand and gets built after.

---

## 9. Brand

Lakefront palette. Deep navy #0B2545, navy-2 #123463, steel #8DA9C4, white #F3F6F8, signal orange #F26419, ink #13233A, muted #5A6B80, line #D5DEE8.
Font: Archivo.
Fact-first hero. No slogans. Sponsorships named by what they buy, not tier names.
Dr. Data logo on every produced artifact (site footer, PDFs, sponsor reports, emails).

---

## 10. Footer, every page and every generated document

Need an event management system like this? Call Dr. Data. -> https://drdatadecisionintelligence.com
Need an event planner? Call The Artisan Aisle. -> [URL pending]

---

## 11. Session prompts

Start of every session, paste:

> Start session. Project: Event Engine. Read this context file. Review ADRs from Pulse, AgentPulse, and Event Engine (section 4). State what is live in the repo right now, what the goal of this session is, and which ADRs apply. Do not begin coding until I confirm the goal.

End of every session, paste:

> End session. List what shipped, file by file. List any new ADR with a one-line rationale. List what is unproven or untested. Write a resume-here note of five lines or fewer. Update this context file with the new ADRs and the resume note.

---

## 12. Open items (owner supplies)

- The Artisan Aisle website URL
- Dr. Data logo file (SVG)
- Zelle handle on the expo LLC's account
- Keynote name, title, headshot, topic
- Event time window (demo assumes 4 to 7 pm)
- Split percentage from the operating agreement
- Google Workspace account for the expo LLC (Gmail API sender)
- Domains registered: mkebizexpo.com, mkebizspotlight.com

---

## 13. Resume-here note

Oct 25 2026. S1 foundation on branch feat/s1-foundation (this repo). Supabase project cxedgteczvlawjqzfvnc. Migration, seed, auth, My week / Tasks / Budget / Events screens. Next: S2 decision layer polish, S3 guests and RSVP function, S4 digests via Gmail, S5 Website tab and wire zakkiwedsyasmeen.netlify.app to rows, S6 second tenant config test. Six family logins (ADR-EE-13); the client portal role is not used for tenant 1.

Earlier, Sep 5 2026. Wedding site (ZakkiWedsYasmeen) is on origin/main of Zmugha1/ZakkiWedsYasmeen as eleven static HTML pages, commit a5737ee; connect the repo in Netlify to publish. It is a mockup with bracketed placeholders. No Event Engine code written yet. Next session goal: wedding tenant part 1. Supabase migrations for `events` (+ `parent_event_id`, `event_type`), `parties`, `leads`, `registrations` (guest type, invite code), `faqs`, `site_links`, `content`; RLS; seed script for the wedding and four child events; then the event pages rendering from rows using the approved layout. Also self-host the Google Fonts and wire the RSVP forms.