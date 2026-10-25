# Event Engine

Private, team-only web app that runs an event end to end. Product of Dr. Data Decision Intelligence LLC.
Tenant 1: ZakkiWedsYasmeen (private event, four functions). Tenant 2: MKE Biz Expo (public event).

Stack: Vite + React + TypeScript + Tailwind v4. Supabase (Postgres, Auth, RLS). Netlify (hosting, functions). No payment processor.

## Run locally
1. `cp .env.example .env` and fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the Supabase project settings. Never commit `.env`.
2. `npm install`
3. `npm run dev`

## Database
Migrations live in `supabase/migrations/`. Claude cannot run them. Paste each file into the Supabase SQL Editor in order, then run the check query in `supabase/migrations/README.md`. Migration before deploy, always. Never edit an applied migration.

## Seed
`SUPABASE_SERVICE_ROLE_KEY=<key> npm run seed` once, from your shell. Creates the wedding parent event, four child events, six members, starter tasks, site content. Aborts if already seeded. The service role key never goes in `.env.example`, Netlify, or chat.

## Logins
Create the six users in Supabase Auth (Authentication → Users → Add user, email + password, auto confirm). The email must match a `members` row; the app links them on sign in. No public signup.

## Checks before every commit
`npx tsc -b --noEmit` · `npm run lint` · `npm test` · `npm run build` then grep `dist/assets` for `service_role` (must be empty).

## Deploy
Git-linked Netlify site. Push to main is the deploy. Env vars `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set in Netlify before the first build; VITE_ vars are inlined at build time, so change them and then Clear cache and deploy.

Need an event management system like this? Call Dr. Data. https://drdatadecisionintelligence.com

## Local build note

`npm run build` needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`. Without them the bundler sees the startup throw as unconditional and drops the app, so the output looks empty. Netlify has them, so production builds are unaffected.

## Sending email (S5)

Invites and reminders go out through the Gmail API from two mailboxes: groom-side families from Zubia's, bride-side from Asiya's. Queue table `send_queue`; `/api/send` sends on demand from the Guests screen; `send-scheduled` runs daily at 14:00 UTC, queues reminders at 42, 21 and 7 days before reply-by, and sends everything queued. Templates are `site_content` keys `invite_subject`, `invite_body`, `reminder_subject`, `reminder_body`, edited on the Website tab.

One-time setup, Zubia:
1. Google Cloud Console → a project → APIs and Services → Enable "Gmail API".
2. OAuth consent screen: External, app name "Event Engine", add both sender emails as test users. Scope `gmail.send`.
3. Credentials → Create OAuth client ID → Desktop app. Copy the client ID and secret into Netlify (engine site) as `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET`, scope Functions, secret.
4. In PowerShell, in the repo: set the two values for the shell only, run `npx tsx scripts/gmail-token.ts`, sign in as yourself, paste the code, copy the printed refresh token into Netlify as `GMAIL_GROOM_REFRESH_TOKEN`. Add `GMAIL_GROOM_FROM` = your Gmail address.
5. Repeat step 4 signed in as Asiya for `GMAIL_BRIDE_REFRESH_TOKEN` and `GMAIL_BRIDE_FROM`.
6. Trigger a deploy. Guests → Send invite on a test family with your own email.

Until the env is in, sends land in `send_queue` as `error: sender_not_configured` and the Retry button resends them later.
