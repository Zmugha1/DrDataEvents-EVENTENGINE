import { describe, it, expect } from 'vitest'
import { validateRsvp } from './rsvp'

describe('validateRsvp', () => {
  it('normalizes a good body', () => {
    const r = validateRsvp({ code: ' ahmed-7k2q ', replies: [{ slug: 'valima', status: 'accepted', attending_count: 2, attending_names: ' A, B ' }], dua: 'x' })
    expect(r.ok).toBe(true)
    if (r.ok) { expect(r.body.code).toBe('AHMED-7K2Q'); expect(r.body.replies[0].attending_count).toBe(2); expect(r.body.replies[0].attending_names).toBe('A, B') }
  })
  it('rejects a bad code, empty replies, bad status', () => {
    expect(validateRsvp({ code: 'x', replies: [{ slug: 'valima', status: 'accepted' }] })).toMatchObject({ ok: false, error: 'bad_code' })
    expect(validateRsvp({ code: 'AHMED-7K2Q', replies: [] })).toMatchObject({ ok: false, error: 'bad_replies' })
    expect(validateRsvp({ code: 'AHMED-7K2Q', replies: [{ slug: 'valima', status: 'maybe' }] })).toMatchObject({ ok: false, error: 'bad_reply' })
    expect(validateRsvp(null)).toMatchObject({ ok: false })
  })
  it('defaults and caps counts', () => {
    const r = validateRsvp({ code: 'AHMED-7K2Q', replies: [{ slug: 'valima', status: 'accepted', attending_count: 99 }, { slug: 'nikkah', status: 'declined', attending_count: -3 }] })
    if (r.ok) { expect(r.body.replies[0].attending_count).toBe(20); expect(r.body.replies[1].attending_count).toBe(1) }
  })
})
