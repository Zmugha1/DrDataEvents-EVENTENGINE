import { useCallback, useEffect, useState } from 'react'
import type { Store } from './Shell'
import { Card, Kpi, Tag } from './Shell'
import type { Party, Registration, RsvpRow } from '../lib/types'
import { fmtDate } from '../lib/types'
import { loadParties, loadGuestRegs, loadRsvp, addParty, setInvited, updateParty, deleteParty, loadQueue, sendAction, type QueueRow } from '../lib/data'
import { parseCsv, inviteLink } from '../lib/guests'

const SITE = import.meta.env.VITE_SITE_URL ?? 'https://zakkiwedsyasmeen.netlify.app'
const inp = 'border border-line rounded-md px-2 py-1.5 w-full'

export default function Guests({ s }: { s: Store }) {
  const parent = s.events.find(e => !e.parent_event_id)
  const kids = s.events.filter(e => e.parent_event_id).sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
  const [parties, setParties] = useState<Party[]>([])
  const [regs, setRegs] = useState<Registration[]>([])
  const [rsvp, setRsvp] = useState<RsvpRow[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [side, setSide] = useState<'all' | 'groom' | 'bride' | 'waiting'>('all')
  const [f, setF] = useState({ name: '', email: '', phone: '', seats: '2', side: 'groom' as Party['side'], ids: kids.map(k => k.id) })
  const [csv, setCsv] = useState(''); const [csvMsg, setCsvMsg] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [queue, setQueue] = useState<QueueRow[]>([])
  const [sending, setSending] = useState<string | null>(null)
  const [sendMsg, setSendMsg] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try { const [p, r, v, q] = await Promise.all([loadParties(), loadGuestRegs(), loadRsvp(), loadQueue()]); setParties(p); setRegs(r); setRsvp(v); setQueue(q); setErr(null) }
    catch (e) { setErr((e as Error).message) }
  }, [])
  useEffect(() => { reload() }, [reload])

  if (!parent) return <p className="text-muted text-xs">No parent event.</p>

  const regOf = (p: Party, eid: string) => regs.find(r => r.party_id === p.id && r.event_id === eid)
  const waiting = (p: Party) => regs.some(r => r.party_id === p.id && r.status === 'invited')
  const list = parties.filter(p => side === 'all' || (side === 'waiting' ? waiting(p) : p.side === side))

  const add = async () => {
    if (!f.name.trim()) return
    try {
      await addParty({ parent_id: parent.id, name: f.name.trim(), email: f.email.trim() || null, phone: f.phone.trim() || null, seats: Math.max(1, +f.seats || 1), side: f.side, event_ids: f.ids })
      setF({ ...f, name: '', email: '', phone: '' }); await reload()
    } catch (e) { setErr((e as Error).message) }
  }
  const importCsv = async () => {
    const { rows, errors } = parseCsv(csv, kids.map(k => k.slug))
    if (errors.length) { setCsvMsg(errors.join(' · ')); return }
    let n = 0
    try {
      for (const r of rows) {
        await addParty({ parent_id: parent.id, name: r.name, email: r.email, phone: r.phone, seats: r.seats, side: r.side, event_ids: kids.filter(k => r.slugs.includes(k.slug)).map(k => k.id) }); n++
      }
      setCsvMsg(`${n} families added.`); setCsv(''); await reload()
    } catch (e) { setCsvMsg(`${n} added, then: ${(e as Error).message}`) }
  }
  const toggle = async (p: Party, eid: string) => {
    const r = regOf(p, eid)
    if (r && r.status !== 'invited') return   // replied already; do not uninvite
    try { await setInvited(p, eid, !r); await reload() } catch (e) { setErr((e as Error).message) }
  }
  const copy = async (p: Party) => { await navigator.clipboard.writeText(inviteLink(SITE, p.invite_code)); setCopied(p.id); setTimeout(() => setCopied(null), 1500) }
  const remove = async (p: Party) => { if (!confirm(`Remove ${p.name} and their invitations?`)) return; try { await deleteParty(p.id); await reload() } catch (e) { setErr((e as Error).message) } }

  const send = async (action: 'invite' | 'reminder' | 'process' | 'retry', p?: Party) => {
    setSending(p?.id ?? action); setSendMsg(null)
    try {
      const r = await sendAction({ action, party_id: p?.id })
      setSendMsg(`${r.sent ?? 0} sent${r.failed ? `, ${r.failed} failed: ${(r.errors ?? []).join('; ')}` : ''}`)
    } catch (e) { setSendMsg((e as Error).message) }
    setSending(null); await reload()
  }
  const sendAllUnsent = async () => {
    const todo = parties.filter(p => !p.invited_at && !queue.some(q => q.party_id === p.id && q.status === 'queued'))
    if (!todo.length || !confirm(`Send ${todo.length} invitation${todo.length === 1 ? '' : 's'} now?`)) return
    for (const p of todo) await send('invite', p)
  }
  const lastQ = (p: Party) => queue.filter(q => q.party_id === p.id).sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
  const totals = { families: parties.length, seats: parties.reduce((a, p) => a + p.seats, 0), waiting: parties.filter(waiting).length, opened: parties.filter(p => p.opened_at).length }

  return (
    <>
      <div className="mb-4"><h2 className="text-xl font-semibold">Guests</h2><p className="text-muted text-xs">One row per family. Tick the events they are invited to. Each family gets one link; the site shows them only those events.</p></div>
      {err && <div className="bg-bad/10 text-bad rounded-md p-3 mb-4 text-xs">{err}</div>}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Kpi l="Families" v={totals.families} /><Kpi l="Seats invited" v={totals.seats} /><Kpi l="Still waiting" v={totals.waiting} cls={totals.waiting ? 'text-warn' : ''} /><Kpi l="Opened their link" v={totals.opened} />
      </div>
      <div className="flex flex-wrap gap-2 items-center mb-4 text-xs">
        <button onClick={sendAllUnsent} disabled={!!sending} className="bg-orange text-white rounded-md px-3 py-1.5 disabled:opacity-50">Send all unsent invitations</button>
        <button onClick={() => send('process')} disabled={!!sending} className="bg-navy text-white rounded-md px-3 py-1.5 disabled:opacity-50">Send queued now</button>
        {queue.some(q => q.status === 'error') && <button onClick={() => send('retry')} disabled={!!sending} className="border border-bad text-bad rounded-md px-3 py-1.5">Retry {queue.filter(q => q.status === 'error').length} failed</button>}
        {sending && <span className="text-muted">Sending…</span>}
        {sendMsg && <span className={/failed|not_|error|config/i.test(sendMsg) ? 'text-bad' : 'text-ok'}>{sendMsg}</span>}
        <span className="text-muted ml-auto">Reminders go out on their own at 42, 21 and 7 days before reply-by.</span>
      </div>
      <Card title="Per event">
        <table className="w-full text-xs"><thead><tr className="text-muted text-left"><th className="py-1">Event</th><th>Families</th><th>Seats</th><th>Accepted</th><th>Declined</th><th>Waiting</th><th>Guests coming</th></tr></thead>
          <tbody>{rsvp.map(r => <tr key={r.event_id} className="border-t border-line"><td className="py-1.5 font-medium">{r.name} <span className="text-muted">{fmtDate(r.date)}</span></td><td>{r.parties_invited}</td><td>{r.seats_invited}</td><td className="text-ok">{r.parties_accepted}</td><td className="text-bad">{r.parties_declined}</td><td className="text-warn">{r.parties_waiting}</td><td className="font-semibold">{r.guests_coming}</td></tr>)}</tbody></table>
      </Card>
      <Card title="Add a family">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 items-end text-xs">
          <label className="col-span-2">Family<input className={inp} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="The Ahmed family" /></label>
          <label>Email<input className={inp} value={f.email} onChange={e => setF({ ...f, email: e.target.value })} placeholder="optional" /></label>
          <label>Phone<input className={inp} value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} placeholder="optional" /></label>
          <label>Seats<input type="number" min={1} className={inp} value={f.seats} onChange={e => setF({ ...f, seats: e.target.value })} /></label>
          <label>Side<select className={inp} value={f.side ?? ''} onChange={e => setF({ ...f, side: e.target.value as Party['side'] })}><option value="groom">Groom</option><option value="bride">Bride</option><option value="both">Both</option></select></label>
          <div className="col-span-2 md:col-span-5 flex flex-wrap gap-1">{kids.map(k => <Pill key={k.id} on={f.ids.includes(k.id)} onClick={() => setF({ ...f, ids: f.ids.includes(k.id) ? f.ids.filter(x => x !== k.id) : [...f.ids, k.id] })}>{k.short_name ?? k.name}</Pill>)}</div>
          <button onClick={add} className="bg-navy text-white rounded-md py-2">Add</button>
        </div>
      </Card>
      <Card title="Paste a list">
        <p className="text-muted text-xs mb-2">One family per line: <code>name, email, phone, seats, side, events</code>. Events: YM ZM N V, separated by ; or space. Example: <code>The Ahmed family, ahmed@x.com, 414 555 0100, 4, groom, N V</code></p>
        <textarea className={inp + ' h-24 font-mono'} value={csv} onChange={e => setCsv(e.target.value)} />
        <div className="flex gap-2 items-center mt-2 text-xs"><button onClick={importCsv} className="bg-navy text-white rounded-md px-3 py-1.5">Import</button>{csvMsg && <span className={csvMsg.includes('added.') ? 'text-ok' : 'text-bad'}>{csvMsg}</span>}</div>
      </Card>
      <div className="flex flex-wrap gap-1 mb-3 text-xs">{([['all', 'Everyone'], ['groom', 'Groom side'], ['bride', 'Bride side'], ['waiting', 'Still waiting']] as const).map(([id, l]) => <Pill key={id} on={side === id} onClick={() => setSide(id)}>{l}</Pill>)}</div>
      <Card>
        {!list.length ? <p className="text-muted text-xs">No families yet.</p> : list.map(p => (
          <div key={p.id} className="border-b border-line last:border-0 py-2.5 text-xs grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] gap-2 items-start">
            <div>
              <div className="font-medium text-[13px]">{p.name} <span className="text-muted font-normal">· {p.side ?? 'side?'} · {p.seats} seat{p.seats === 1 ? '' : 's'}</span></div>
              <div className="text-muted flex flex-wrap gap-x-2 items-center">
                <code className="bg-paper px-1 rounded">{p.invite_code}</code>
                <button className="underline" onClick={() => copy(p)}>{copied === p.id ? 'Copied' : 'Copy link'}</button>
                {p.opened_at ? <Tag tone="ok">opened {fmtDate(p.opened_at.slice(0, 10))}</Tag> : <Tag>not opened</Tag>}
                <button className="underline" onClick={() => { const n = prompt('Seats', String(p.seats)); if (n && +n > 0) updateParty(p.id, { seats: +n }).then(reload) }}>Seats</button>
                <button className="underline text-bad" onClick={() => remove(p)}>Remove</button>
              </div>
              <div className="flex flex-wrap gap-x-2 items-center mt-1">
                {p.invited_at ? <Tag tone="ok">invited {fmtDate(p.invited_at.slice(0, 10))}</Tag> : <Tag tone="warn">not sent</Tag>}
                {p.reminder_count > 0 && <Tag>{p.reminder_count} reminder{p.reminder_count === 1 ? '' : 's'}</Tag>}
                {(() => { const q = lastQ(p); return q && q.status !== 'sent' ? <Tag tone={q.status === 'error' ? 'bad' : ''}>{q.kind} {q.status}{q.error ? `: ${q.error}` : ''}</Tag> : null })()}
                {p.primary_lead_id ? <>
                  <button className="underline" disabled={!!sending} onClick={() => send('invite', p)}>{p.invited_at ? 'Resend invite' : 'Send invite'}</button>
                  {p.invited_at && waiting(p) && <button className="underline" disabled={!!sending} onClick={() => send('reminder', p)}>Remind now</button>}
                </> : <span className="text-muted">no email on file</span>}
              </div>
              {p.dua && <div className="italic text-ink mt-1">“{p.dua}”</div>}
            </div>
            <div className="flex flex-wrap gap-1">
              {kids.map(k => { const r = regOf(p, k.id); return (
                <button key={k.id} onClick={() => toggle(p, k.id)} title={r ? r.status : 'not invited'}
                  className={`px-2 py-1 rounded-full border ${!r ? 'bg-white border-line text-muted' : r.status === 'accepted' ? 'bg-ok/10 border-ok text-ok' : r.status === 'declined' ? 'bg-bad/10 border-bad text-bad' : 'bg-navy text-white border-navy'}`}>
                  {k.short_name ?? k.name}{r?.status === 'accepted' ? ` ✓ ${r.attending_count ?? ''}` : r?.status === 'declined' ? ' ✗' : ''}
                </button>) })}
            </div>
            <div className="text-muted">{regs.filter(r => r.party_id === p.id && r.attending_names).map(r => r.attending_names).filter((v, i, a) => a.indexOf(v) === i).join(' · ')}</div>
          </div>
        ))}
      </Card>
    </>
  )
}
const Pill = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button onClick={onClick} className={`px-3 py-1 rounded-full border ${on ? 'bg-navy text-white border-navy' : 'bg-white border-line'}`}>{children}</button>
)
