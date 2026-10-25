import type { Task } from './types'
import { money, fmtDate } from './types'

// Pure. The weekly email body for one member. Same text on screen (Week) and in the send (S4).
export function buildDigest(opts: { email: string; firstName: string; tasks: Task[]; totalSaved: number }) {
  const mine = opts.tasks.filter(t => !t.done)
  const soon = mine.filter(t => t.urgency === 'overdue' || t.urgency === 'soon')
  const rest = mine.filter(t => t.urgency === 'open')
  const line = (t: Task) => `• ${t.title} (${t.event_short ?? t.event_name ?? ''}) · ${t.urgency === 'overdue' ? 'OVERDUE, was due ' : 'due '}${fmtDate(t.due)}${t.remaining ? ' · ' + money(t.remaining) + ' still to pay' : ''}`
  return [
    `To: ${opts.email}`, 'Subject: Your wedding week', '',
    `Assalamu alaikum ${opts.firstName},`, '',
    soon.length ? 'DUE THIS WEEK OR OVERDUE\n' + soon.map(line).join('\n') : 'Nothing due this week.', '',
    rest.length ? 'COMING UP\n' + rest.slice(0, 5).map(t => `• ${t.title} · ${fmtDate(t.due)}`).join('\n') + '\n' : '',
    `Saved so far vs quotes: ${money(opts.totalSaved)}`, '',
    'Open Event Engine to tick, note, or move a date.',
  ].join('\n')
}
