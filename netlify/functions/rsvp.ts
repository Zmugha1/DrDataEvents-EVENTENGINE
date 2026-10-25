// POST /api/rsvp  {code, replies:[{slug,status,attending_count,attending_names,meal_choice,dietary}], dua}
// Validates, rate-limits per IP, then calls site_rsvp with the service role (ADR-02, ADR-03).
// Env (Netlify, functions scope): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SITE_ORIGINS (comma list).
import { createClient } from '@supabase/supabase-js'
import { validateRsvp } from '../../src/lib/rsvp'

const hits = new Map<string, number[]>()   // ip -> timestamps, per warm instance
const LIMIT = 10, WINDOW_MS = 60_000

function allowed(ip: string): boolean {
  const now = Date.now()
  const arr = (hits.get(ip) ?? []).filter(t => now - t < WINDOW_MS)
  arr.push(now); hits.set(ip, arr)
  return arr.length <= LIMIT
}

function cors(origin: string | null): Record<string, string> {
  const list = (process.env.SITE_ORIGINS ?? 'https://zakkiwedsyasmeen.netlify.app').split(',').map(s => s.trim())
  const ok = origin && list.includes(origin) ? origin : list[0]
  return { 'Access-Control-Allow-Origin': ok, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Content-Type': 'application/json' }
}

export default async (req: Request): Promise<Response> => {
  const h = cors(req.headers.get('origin'))
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: h })
  if (req.method !== 'POST') return new Response(JSON.stringify({ ok: false, error: 'method' }), { status: 405, headers: h })

  const ip = req.headers.get('x-nf-client-connection-ip') ?? req.headers.get('x-forwarded-for') ?? 'unknown'
  if (!allowed(ip)) return new Response(JSON.stringify({ ok: false, error: 'slow_down' }), { status: 429, headers: h })

  let input: unknown
  try { input = await req.json() } catch { return new Response(JSON.stringify({ ok: false, error: 'bad_json' }), { status: 400, headers: h }) }
  const v = validateRsvp(input)
  if (!v.ok) return new Response(JSON.stringify(v), { status: 400, headers: h })

  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return new Response(JSON.stringify({ ok: false, error: 'server_config' }), { status: 500, headers: h })
  const db = createClient(url, key, { auth: { persistSession: false } })
  const { data, error } = await db.rpc('site_rsvp', { p_code: v.body.code, p_replies: v.body.replies, p_dua: v.body.dua ?? null })
  if (error) return new Response(JSON.stringify({ ok: false, error: 'db' }), { status: 500, headers: h })
  const status = data?.ok ? 200 : 404
  return new Response(JSON.stringify(data), { status, headers: h })
}

export const config = { path: '/api/rsvp' }
