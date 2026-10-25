// Pure validation for the RSVP endpoint. No I/O, so it is unit tested. The Netlify function calls this.
export type Reply = { slug: string; status: 'accepted' | 'declined'; attending_count?: number; attending_names?: string; meal_choice?: string; dietary?: string }
export type RsvpBody = { code: string; replies: Reply[]; dua?: string }

const CODE = /^[A-Z0-9]{2,20}-[A-Z0-9]{4}$/
const SLUG = /^[a-z0-9-]{2,40}$/

export function validateRsvp(input: unknown): { ok: true; body: RsvpBody } | { ok: false; error: string } {
  if (!input || typeof input !== 'object') return { ok: false, error: 'bad_body' }
  const o = input as Record<string, unknown>
  const code = String(o.code ?? '').trim().toUpperCase()
  if (!CODE.test(code)) return { ok: false, error: 'bad_code' }
  if (!Array.isArray(o.replies) || o.replies.length === 0 || o.replies.length > 10) return { ok: false, error: 'bad_replies' }
  const replies: Reply[] = []
  for (const r of o.replies as Record<string, unknown>[]) {
    if (!r || typeof r !== 'object') return { ok: false, error: 'bad_reply' }
    const slug = String(r.slug ?? '')
    const status = r.status === 'accepted' || r.status === 'declined' ? r.status : null
    if (!SLUG.test(slug) || !status) return { ok: false, error: 'bad_reply' }
    const n = Number(r.attending_count)
    replies.push({
      slug, status,
      attending_count: Number.isInteger(n) && n > 0 ? Math.min(n, 20) : 1,
      attending_names: clip(r.attending_names, 500),
      meal_choice: clip(r.meal_choice, 60),
      dietary: clip(r.dietary, 300),
    })
  }
  const dua = clip(o.dua, 1000)
  return { ok: true, body: { code, replies, dua } }
}

function clip(v: unknown, max: number): string | undefined {
  if (v === undefined || v === null) return undefined
  const s = String(v).trim()
  return s ? s.slice(0, max) : undefined
}
