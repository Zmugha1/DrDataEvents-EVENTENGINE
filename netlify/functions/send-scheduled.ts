// Daily at 14:00 UTC (9 am Chicago in summer, 8 am in winter): queue due reminders, then send everything queued.
import { db, enqueueReminders, processQueue } from '../lib/mail'

export default async (): Promise<Response> => {
  const c = db()
  const queued = await enqueueReminders(c)
  const r = await processQueue(c)
  console.log(JSON.stringify({ queued, ...r }))
  return new Response(JSON.stringify({ ok: true, queued, ...r }), { headers: { 'Content-Type': 'application/json' } })
}

export const config = { schedule: '0 14 * * *' }
