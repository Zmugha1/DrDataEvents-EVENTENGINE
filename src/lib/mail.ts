// Pure helpers shared by the app and the Netlify functions. No I/O.
export type TemplateVars = { family: string; events: string; link: string; reply_by: string; seats: string }

export function renderTemplate(t: string, v: TemplateVars): string {
  return t.replace(/\{(family|events|link|reply_by|seats)\}/g, (_, k: keyof TemplateVars) => v[k] ?? '')
}

export const fmtLongDate = (d: string | null | undefined) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'the date on your invitation'

export function eventLines(events: { name: string; date: string | null; venue_name?: string | null; start_time?: string | null }[]): string {
  return events.map(e => `• ${e.name} · ${fmtLongDate(e.date)}${e.start_time ? ' · ' + e.start_time : ''}${e.venue_name ? ' · ' + e.venue_name : ''}`).join('\n')
}

// Reminder cadence: 42, 21 and 7 days before reply-by. A party is due when a window has opened,
// they have not replied, and they were not reminded inside that window.
export const REMINDER_DAYS = [42, 21, 7]
export function reminderDue(opts: { now: Date; replyBy: string | null; invitedAt: string | null; lastRemindedAt: string | null; reminderCount: number; waiting: boolean }): boolean {
  if (!opts.waiting || !opts.replyBy || !opts.invitedAt) return false
  const rb = new Date(opts.replyBy + 'T12:00:00Z').getTime()
  const daysLeft = Math.ceil((rb - opts.now.getTime()) / 86_400_000)
  if (daysLeft < 0) return false
  const opened = REMINDER_DAYS.filter(d => daysLeft <= d).length   // how many windows have opened
  if (opened === 0 || opts.reminderCount >= opened) return false
  // never two reminders inside 5 days, and never within 5 days of the invite itself
  const last = opts.lastRemindedAt ? new Date(opts.lastRemindedAt).getTime() : new Date(opts.invitedAt).getTime()
  return opts.now.getTime() - last >= 5 * 86_400_000
}

// RFC 2822 message, base64url, for the Gmail API. Runs in Node (functions) and in tests; no Buffer in the browser bundle.
export function buildRawEmail(from: string, to: string, subject: string, text: string): string {
  const b64 = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s)))
  const msg = [`From: ${from}`, `To: ${to}`, `Subject: =?UTF-8?B?${b64(subject)}?=`, 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', b64(text)].join('\r\n')
  return b64(msg).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
