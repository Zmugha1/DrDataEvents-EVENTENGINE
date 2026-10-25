import { describe, it, expect } from 'vitest'
import { makeCode, parseCsv, inviteLink } from './guests'

describe('makeCode', () => {
  it('uses the family stem and four safe characters', () => {
    const c = makeCode('The Ahmed family', () => 0)
    expect(c).toBe('AHMED-AAAA')
    expect(makeCode("O'Brien & Co", () => 0.5)).toMatch(/^OBRIENCO-[A-Z2-9]{4}$/)
    expect(makeCode('', () => 0)).toBe('GUEST-AAAA')
  })
})
describe('parseCsv', () => {
  const known = ['yasmeen-mehndi', 'zakki-mehndi', 'nikkah', 'valima']
  it('parses rows with short codes and skips a header', () => {
    const r = parseCsv('name,email,phone,seats,side,events\nThe Ahmed family,a@b.com,414,4,groom,N;V\nKhan family,,,2,bride,YM valima', known)
    expect(r.errors).toEqual([])
    expect(r.rows[0]).toMatchObject({ name: 'The Ahmed family', email: 'a@b.com', seats: 4, side: 'groom', slugs: ['nikkah', 'valima'] })
    expect(r.rows[1]).toMatchObject({ email: null, seats: 2, side: 'bride', slugs: ['yasmeen-mehndi', 'valima'] })
  })
  it('reports bad email and unknown event', () => {
    const r = parseCsv('X,notmail,,1,,N\nY,,,1,,party', known)
    expect(r.rows).toEqual([]); expect(r.errors.length).toBe(2)
  })
})
describe('inviteLink', () => {
  it('builds the link', () => { expect(inviteLink('https://x.com/', 'AHMED-7K2Q')).toBe('https://x.com/?i=AHMED-7K2Q') })
})
