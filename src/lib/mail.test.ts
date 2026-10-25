import { describe, it, expect } from 'vitest'
import { renderTemplate, reminderDue, eventLines, buildRawEmail } from './mail'

describe('renderTemplate', () => {
  it('fills placeholders and leaves unknown braces', () => {
    expect(renderTemplate('Hi {family}, {link} {nope}', { family: 'Ahmed', events: '', link: 'L', reply_by: '', seats: '2' })).toBe('Hi Ahmed, L {nope}')
  })
})
describe('eventLines', () => {
  it('lists events with date, time, venue', () => {
    expect(eventLines([{ name: 'Nikkah', date: '2027-05-29', start_time: '5 pm', venue_name: 'ISM' }])).toBe('• Nikkah · Saturday, May 29, 2027 · 5 pm · ISM')
  })
})
describe('reminderDue', () => {
  const base = { replyBy: '2027-03-15', invitedAt: '2026-11-01T00:00:00Z', lastRemindedAt: null, reminderCount: 0, waiting: true }
  const at = (d: string) => new Date(d + 'T14:00:00Z')
  it('not before the first window', () => { expect(reminderDue({ ...base, now: at('2027-01-15') })).toBe(false) })
  it('due once 42 days out', () => { expect(reminderDue({ ...base, now: at('2027-02-02') })).toBe(true) })
  it('not twice in the same window', () => { expect(reminderDue({ ...base, now: at('2027-02-10'), reminderCount: 1, lastRemindedAt: '2027-02-02T14:00:00Z' })).toBe(false) })
  it('due again at 21 days', () => { expect(reminderDue({ ...base, now: at('2027-02-23'), reminderCount: 1, lastRemindedAt: '2027-02-02T14:00:00Z' })).toBe(true) })
  it('final at 7 days, then stops', () => {
    expect(reminderDue({ ...base, now: at('2027-03-09'), reminderCount: 2, lastRemindedAt: '2027-02-23T14:00:00Z' })).toBe(true)
    expect(reminderDue({ ...base, now: at('2027-03-12'), reminderCount: 3, lastRemindedAt: '2027-03-09T14:00:00Z' })).toBe(false)
  })
  it('never after reply-by, never when replied, never without an invite', () => {
    expect(reminderDue({ ...base, now: at('2027-03-20') })).toBe(false)
    expect(reminderDue({ ...base, now: at('2027-02-02'), waiting: false })).toBe(false)
    expect(reminderDue({ ...base, now: at('2027-02-02'), invitedAt: null })).toBe(false)
  })
})
describe('buildRawEmail', () => {
  it('is base64url', () => { expect(buildRawEmail('a@x.com', 'b@y.com', 'Hi', 'Body')).toMatch(/^[A-Za-z0-9_-]+$/) })
})
