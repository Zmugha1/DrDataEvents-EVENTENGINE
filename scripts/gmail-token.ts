// One-time, per sender. Prints a refresh token for Netlify. Never paste the token anywhere but Netlify.
//   GMAIL_CLIENT_ID=... GMAIL_CLIENT_SECRET=... npx tsx scripts/gmail-token.ts
// Opens a Google sign-in URL. Sign in as the sender (Zubia for groom side, Asiya for bride side), approve "Send email on your behalf",
// paste the code Google shows back here. The script exchanges it and prints the refresh token once.
import { createInterface } from 'node:readline/promises'

const id = process.env.GMAIL_CLIENT_ID, secret = process.env.GMAIL_CLIENT_SECRET
if (!id || !secret) { console.error('Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in the shell for this run only.'); process.exit(1) }
const redirect = 'urn:ietf:wg:oauth:2.0:oob'
const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({ client_id: id, redirect_uri: redirect, response_type: 'code', access_type: 'offline', prompt: 'consent', scope: 'https://www.googleapis.com/auth/gmail.send' })
console.log('\n1. Open this in the browser, signed in as the SENDER:\n\n' + url + '\n')
const rl = createInterface({ input: process.stdin, output: process.stdout })
const code = (await rl.question('2. Paste the code Google shows: ')).trim(); rl.close()
const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: id, client_secret: secret, redirect_uri: redirect, grant_type: 'authorization_code' }) })
const j = await r.json() as { refresh_token?: string; error?: string; error_description?: string }
if (!j.refresh_token) { console.error('No refresh token:', j.error, j.error_description ?? ''); process.exit(1) }
console.log('\n3. Refresh token (copy into Netlify as GMAIL_GROOM_REFRESH_TOKEN or GMAIL_BRIDE_REFRESH_TOKEN, scope Functions, secret):\n')
console.log(j.refresh_token + '\n')
