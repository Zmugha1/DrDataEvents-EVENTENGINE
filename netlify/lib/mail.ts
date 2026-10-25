// Server-side mail: Gmail API with a refresh token per sender, queue processing, reminder enqueue.
// Env (Functions scope): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET,
//   GMAIL_GROOM_FROM, GMAIL_GROOM_REFRESH_TOKEN, GMAIL_BRIDE_FROM, GMAIL_BRIDE_REFRESH_TOKEN, SITE_URL (optional)
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { renderTemplate, eventLines, reminderDue, buildRawEmail, fmtLongDate } from '../../src/lib/mail'

export const db = (): SupabaseClient => {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('server_config')
  return createClient(url, key, { auth: { persistSession: false } })
}
const SITE = () => (process.env.SITE_URL ?? 'https://zakkiwedsyasmeen.netlify.app').replace(/\/$/, '')

type Sender = { from: string; refresh: string }
function sender(side: string | null): Sender | null {
  const s = side === 'bride' ? 'BRIDE' : 'GROOM'
  const from = process.env[`GMAIL_${s}_FROM`], refresh = process.env[`GMAIL_${s}_REFRESH_TOKEN`]
  return from && refresh ? { from, refresh } : null
}

async function accessToken(refresh: string): Promise<string> {
  const id = process.env.GMAIL_CLIENT_ID, secret = process.env.GMAIL_CLIENT_SECRET
  if (!id || !secret) throw new Error('gmail_client_not_configured')
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: id, client_secret: secret, refresh_token: refresh, grant_type: 'refresh_token' }) })
  const j = await r.json() as { access_token?: string; error?: string }
  if (!j.access_token) throw new Error('gmail_token: ' + (j.error ?? r.status))
  return j.access_token
}

export async function gmailSend(side: string | null, to: string, subject: string, text: string): Promise<void> {
  const s = sender(side); if (!s) throw new Error('sender_not_configured')
  const tok = await accessToken(s.refresh)
  const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', { method: 'POST', headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ raw: buildRawEmail(s.from, to, subject, text) }) })
  if (!r.ok) throw new Error('gmail_send: ' + r.status + ' ' + (await r.text()).slice(0, 200))
}

// Build the invite or reminder text for a party from templates and rows.
export async function composeFor(c: SupabaseClient, partyId: string, kind: 'invite' | 'reminder') {
  const { data: p, error } = await c.from('parties').select('*, leads:primary_lead_id(email)').eq('id', partyId).single()
  if (error || !p) throw new Error('party_not_found')
  const { data: parent } = await c.from('events').select('id, reply_by').eq('id', p.event_id).single()
  const { data: regs } = await c.from('registrations').select('event_id, status').eq('party_id', partyId)
  const ids = (regs ?? []).map(r => r.event_id)
  const { data: evs } = ids.length ? await c.from('events').select('name, date, venue_name, start_time').in('id', ids).order('date') : { data: [] }
  const { data: content } = await c.from('site_content').select('key, body').eq('event_id', p.event_id).in('key', [`${kind}_subject`, `${kind}_body`])
  const t: Record<string, string> = {}; (content ?? []).forEach(r => { t[r.key] = r.body })
  const vars = { family: p.name, events: eventLines(evs ?? []), link: `${SITE()}/?i=${encodeURIComponent(p.invite_code)}`, reply_by: fmtLongDate(parent?.reply_by), seats: String(p.seats) }
  const email = (p.leads as { email: string | null } | null)?.email ?? null
  return { party: p, email, subject: renderTemplate(t[`${kind}_subject`] ?? '', vars), body: renderTemplate(t[`${kind}_body`] ?? '', vars), waiting: (regs ?? []).some(r => r.status === 'invited') }
}

export async function enqueue(c: SupabaseClient, partyId: string, kind: 'invite' | 'reminder') {
  const m = await composeFor(c, partyId, kind)
  if (!m.email) return { ok: false, error: 'no_email' }
  if (!m.subject || !m.body) return { ok: false, error: 'no_template' }
  const { error } = await c.from('send_queue').insert({ event_id: m.party.event_id, party_id: partyId, kind, side: m.party.side, to_email: m.email, subject: m.subject, body: m.body })
  if (error) throw error
  return { ok: true }
}

// Reminder pass: every party still waiting, inside a window, not reminded recently.
export async function enqueueReminders(c: SupabaseClient, now = new Date()): Promise<number> {
  const { data: parents } = await c.from('events').select('id, reply_by').eq('event_type', 'private').is('parent_event_id', null)
  let n = 0
  for (const parent of parents ?? []) {
    const { data: parties } = await c.from('parties').select('id, invited_at, last_reminded_at, reminder_count').eq('event_id', parent.id)
    for (const p of parties ?? []) {
      const { data: regs } = await c.from('registrations').select('status').eq('party_id', p.id)
      const waiting = (regs ?? []).some(r => r.status === 'invited')
      if (!reminderDue({ now, replyBy: parent.reply_by, invitedAt: p.invited_at, lastRemindedAt: p.last_reminded_at, reminderCount: p.reminder_count, waiting })) continue
      const { data: pending } = await c.from('send_queue').select('id').eq('party_id', p.id).eq('kind', 'reminder').eq('status', 'queued').limit(1)
      if (pending?.length) continue
      const r = await enqueue(c, p.id, 'reminder'); if (r.ok) n++
    }
  }
  return n
}

// Send everything queued. Stamps parties on success. Marks error with the reason, never throws for one bad row.
export async function processQueue(c: SupabaseClient, limit = 50): Promise<{ sent: number; failed: number; errors: string[] }> {
  const { data: rows } = await c.from('send_queue').select('*').eq('status', 'queued').order('created_at').limit(limit)
  let sent = 0, failed = 0; const errors: string[] = []
  for (const q of rows ?? []) {
    try {
      await gmailSend(q.side, q.to_email, q.subject, q.body)
      await c.from('send_queue').update({ status: 'sent', sent_at: new Date().toISOString(), error: null }).eq('id', q.id)
      if (q.party_id && q.kind === 'invite') await c.from('parties').update({ invited_at: new Date().toISOString() }).eq('id', q.party_id)
      if (q.party_id && q.kind === 'reminder') { const { data: p } = await c.from('parties').select('reminder_count').eq('id', q.party_id).single(); await c.from('parties').update({ last_reminded_at: new Date().toISOString(), reminder_count: (p?.reminder_count ?? 0) + 1 }).eq('id', q.party_id) }
      sent++
    } catch (e) {
      const msg = (e as Error).message.slice(0, 300); failed++; errors.push(msg)
      await c.from('send_queue').update({ status: 'error', error: msg }).eq('id', q.id)
    }
  }
  return { sent, failed, errors: [...new Set(errors)] }
}
