// Pure helpers for the guest list. No I/O.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'   // no 0/O, 1/I/L

export function makeCode(familyName: string, rand: () => number = Math.random): string {
  const stem = familyName.toUpperCase().replace(/^THE\s+/, '').replace(/\s+FAMILY$/, '').replace(/[^A-Z0-9]/g, '').slice(0, 10) || 'GUEST'
  let tail = ''
  for (let i = 0; i < 4; i++) tail += ALPHABET[Math.floor(rand() * ALPHABET.length)]
  return `${stem}-${tail}`
}

export type CsvRow = { name: string; email: string | null; phone: string | null; seats: number; side: 'groom' | 'bride' | 'both' | null; slugs: string[] }

// Columns: name, email, phone, seats, side, events. Header row optional. Events: slugs or short codes separated by ; or space.
// Short codes: YM = yasmeen-mehndi, ZM = zakki-mehndi, N = nikkah, V = valima.
const SHORT: Record<string, string> = { YM: 'yasmeen-mehndi', ZM: 'zakki-mehndi', N: 'nikkah', V: 'valima' }

export function parseCsv(text: string, knownSlugs: string[]): { rows: CsvRow[]; errors: string[] } {
  const rows: CsvRow[] = []; const errors: string[] = []
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  lines.forEach((line, i) => {
    const c = line.split(/\t|,/).map(x => x.trim())
    if (i === 0 && /^name$/i.test(c[0] ?? '')) return
    const name = c[0]; if (!name) { errors.push(`Line ${i + 1}: no name`); return }
    const email = c[1]?.toLowerCase() || null
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { errors.push(`Line ${i + 1}: bad email "${email}"`); return }
    const seats = Math.max(1, Math.min(20, parseInt(c[3] ?? '', 10) || 1))
    const sideRaw = (c[4] ?? '').toLowerCase()
    const side = sideRaw === 'groom' || sideRaw === 'bride' || sideRaw === 'both' ? sideRaw : null
    const slugs = (c[5] ?? '').split(/[;\s]+/).filter(Boolean).map(t => SHORT[t.toUpperCase()] ?? t.toLowerCase())
    const bad = slugs.filter(s => !knownSlugs.includes(s))
    if (bad.length) { errors.push(`Line ${i + 1}: unknown event "${bad.join(', ')}"`); return }
    rows.push({ name, email, phone: c[2] || null, seats, side, slugs })
  })
  return { rows, errors }
}

export const inviteLink = (base: string, code: string) => `${base.replace(/\/$/, '')}/?i=${encodeURIComponent(code)}`
