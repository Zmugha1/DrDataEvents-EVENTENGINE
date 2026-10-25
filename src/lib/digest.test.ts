import { describe, it, expect } from 'vitest'
import { buildDigest } from './digest'
import type { Task } from './types'

const t = (p: Partial<Task>): Task => ({ id: 'x', event_id: 'e', title: 'T', owner_id: 'm', due: null, phase: 'pre', category: null, quoted_amount: 0, fulfilled_by: 'vendor', amount: 0, paid: 0, paid_by: null, quote_source: null, vendor_name: null, notes: null, done: false, remind_when_done: false, urgency: 'open', remaining: 0, saved: 0, ...p })

describe('buildDigest', () => {
  it('lists overdue and soon first, with money still to pay', () => {
    const out = buildDigest({ email: 'k@example.com', firstName: 'Kamran', totalSaved: 1560, tasks: [
      t({ title: 'Masjid', event_short: 'Nikkah', due: '2026-10-01', urgency: 'overdue', amount: 800, paid: 0, remaining: 800 }),
      t({ title: 'Venue', event_short: 'Shalima', due: '2027-03-01', urgency: 'open' }),
      t({ title: 'Done thing', done: true, urgency: 'done' }),
    ] })
    expect(out).toContain('DUE THIS WEEK OR OVERDUE')
    expect(out).toContain('• Masjid (Nikkah) · OVERDUE, was due Oct 1, 2026 · $800 still to pay')
    expect(out).toContain('COMING UP\n• Venue · Mar 1, 2027')
    expect(out).not.toContain('Done thing')
    expect(out).toContain('Saved so far vs quotes: $1,560')
  })
  it('says nothing due when the week is clear', () => {
    expect(buildDigest({ email: 'a', firstName: 'A', totalSaved: 0, tasks: [] })).toContain('Nothing due this week.')
  })
})
