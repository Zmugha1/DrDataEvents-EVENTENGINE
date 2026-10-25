// POST /api/send  { action: 'invite' | 'reminder', party_id }  -> enqueue one
// POST /api/send  { action: 'process' }                         -> send everything queued now
// POST /api/send  { action: 'retry' }                           -> requeue errors, then send
// Requires a signed-in team member: Authorization: Bearer <supabase access token>.
import { db, enqueue, processQueue } from '../lib/mail'

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } })

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405)
  let c; try { c = db() } catch { return json({ ok: false, error: 'server_config' }, 500) }
  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  const { data: u } = jwt ? await c.auth.getUser(jwt) : { data: { user: null } }
  if (!u?.user?.email) return json({ ok: false, error: 'unauthorized' }, 401)
  const { data: member } = await c.from('members').select('id').ilike('email', u.user.email).eq('active', true).maybeSingle()
  if (!member) return json({ ok: false, error: 'not_a_member' }, 403)

  let body: { action?: string; party_id?: string }
  try { body = await req.json() } catch { return json({ ok: false, error: 'bad_json' }, 400) }
  try {
    if ((body.action === 'invite' || body.action === 'reminder') && body.party_id) {
      const r = await enqueue(c, body.party_id, body.action); if (!r.ok) return json(r, 400)
      return json({ ok: true, ...(await processQueue(c)) })
    }
    if (body.action === 'retry') { await c.from('send_queue').update({ status: 'queued', error: null }).eq('status', 'error'); return json({ ok: true, ...(await processQueue(c)) }) }
    if (body.action === 'process') return json({ ok: true, ...(await processQueue(c)) })
    return json({ ok: false, error: 'bad_action' }, 400)
  } catch (e) { return json({ ok: false, error: (e as Error).message }, 500) }
}

export const config = { path: '/api/send' }
