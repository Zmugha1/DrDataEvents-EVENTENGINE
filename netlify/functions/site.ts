// GET /api/site?i=CODE  ->  site_invite(code). The wedding site's only read. No key leaves the server.
import { createClient } from '@supabase/supabase-js'

const hits = new Map<string, number[]>()
function allowed(ip: string): boolean {
  const now = Date.now(); const arr = (hits.get(ip) ?? []).filter(t => now - t < 60_000); arr.push(now); hits.set(ip, arr); return arr.length <= 60
}
function cors(origin: string | null): Record<string, string> {
  const list = (process.env.SITE_ORIGINS ?? 'https://zakkiwedsyasmeen.netlify.app').split(',').map(s => s.trim())
  const ok = origin && list.includes(origin) ? origin : list[0]
  return { 'Access-Control-Allow-Origin': ok, 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
}

export default async (req: Request): Promise<Response> => {
  const h = cors(req.headers.get('origin'))
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: h })
  if (req.method !== 'GET') return new Response(JSON.stringify({ ok: false, error: 'method' }), { status: 405, headers: h })
  const ip = req.headers.get('x-nf-client-connection-ip') ?? 'unknown'
  if (!allowed(ip)) return new Response(JSON.stringify({ ok: false, error: 'slow_down' }), { status: 429, headers: h })
  const code = (new URL(req.url).searchParams.get('i') ?? '').trim().toUpperCase().slice(0, 32) || null
  if (code && !/^[A-Z0-9-]+$/.test(code)) return new Response(JSON.stringify({ ok: false, error: 'bad_code' }), { status: 400, headers: h })
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return new Response(JSON.stringify({ ok: false, error: 'server_config' }), { status: 500, headers: h })
  const db = createClient(url, key, { auth: { persistSession: false } })
  const { data, error } = await db.rpc('site_invite', { p_code: code })
  if (error) return new Response(JSON.stringify({ ok: false, error: 'db' }), { status: 500, headers: h })
  return new Response(JSON.stringify(data), { status: 200, headers: h })
}

export const config = { path: '/api/site' }
