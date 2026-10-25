import type { Store } from './Shell'
import { Card } from './Shell'
import { money, fmtDate } from '../lib/types'
import { updateEvent } from '../lib/data'

export default function Events({ s }: { s: Store }) {
  const kids = s.events.filter(e => e.parent_event_id)
  const edit = async (id: string, field: 'venue_name' | 'start_time' | 'venue_city' | 'venue_map_url' | 'dress_code', cur: string | null) => {
    const v = prompt(field.replace('_', ' '), cur ?? ''); if (v === null) return; await updateEvent(id, { [field]: v || null }); s.refresh()
  }
  return (
    <>
      <div className="mb-4"><h2 className="text-xl font-semibold">Events</h2><p className="text-muted text-xs">Venue, date, host, budget, open work. Every field here is what the wedding site shows (ADR-EE-04).</p></div>
      <div className="grid md:grid-cols-2 gap-4">
        {kids.map(e => { const b = s.budget.find(x => x.event_id === e.id); return (
          <Card key={e.id} title={e.name} right={<span className="text-xs font-normal text-muted">{fmtDate(e.date)}</span>}>
            <div className="text-xs text-muted">{e.start_time || <button className="underline" onClick={() => edit(e.id, 'start_time', e.start_time)}>[time]</button>} · {e.venue_name || <button className="underline" onClick={() => edit(e.id, 'venue_name', e.venue_name)}>[venue]</button>}{e.venue_city ? ', ' + e.venue_city : ''}</div>
            <div className="text-xs text-muted mt-1">Paid by {e.paid_by ?? '—'} · {e.guest_list_note ?? ''}</div>
            <div className="text-xs mt-1">Dress: <button className="underline" onClick={() => edit(e.id, 'dress_code', e.dress_code)}>{e.dress_code || 'set'}</button></div>
            <div className="grid grid-cols-3 gap-2 mt-3 text-xs"><div>Open tasks<b className="block text-base">{b?.open_tasks ?? 0}</b></div><div>Committed<b className="block text-base">{money(b?.committed)}</b></div><div>Budget<b className="block text-base">{b?.budget_total ? money(b.budget_total) : '—'}</b></div></div>
            {b?.budget_total ? <div className="h-2 bg-paper rounded-full mt-2 overflow-hidden"><div className={`h-full ${b.committed > b.budget_total ? 'bg-bad' : b.committed > b.budget_total * .85 ? 'bg-warn' : 'bg-navy'}`} style={{ width: Math.min(100, Math.round(b.committed / b.budget_total * 100)) + '%' }} /></div> : null}
          </Card>) })}
      </div>
    </>
  )
}
