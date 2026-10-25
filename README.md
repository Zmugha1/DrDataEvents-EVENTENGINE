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
