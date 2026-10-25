import type { Store } from './Shell'
import { Card, Kpi } from './Shell'
import { money } from '../lib/types'
import { updateEvent } from '../lib/data'

export default function Budget({ s }: { s: Store }) {
  const parent = s.events.find(e => !e.parent_event_id)
  const kids = s.budget.filter(b => b.parent_event_id === parent?.id)
  const grand = parent?.budget_total ?? 0
  const committed = s.budget.reduce((a, b) => a + b.committed, 0)
  const paid = s.budget.reduce((a, b) => a + b.paid, 0)
  const saved = s.budget.reduce((a, b) => a + b.saved, 0)
  const cats: Record<string, { c: number; p: number; s: number }> = {}
  s.tasks.forEach(t => { if (!t.category) return; const c = cats[t.category] ??= { c: 0, p: 0, s: 0 }; c.c += t.amount; c.p += t.paid; c.s += t.saved ?? 0 })
  const who: Record<string, number> = {}
  s.tasks.forEach(t => { if (t.paid) who[t.paid_by || 'Unrecorded'] = (who[t.paid_by || 'Unrecorded'] ?? 0) + t.paid })
  const setBudget = async (id: string, cur: number | null) => { const v = prompt('Budget $', String(cur ?? '')); if (v === null) return; await updateEvent(id, { budget_total: +v || null }); s.refresh() }

  return (
    <>
      <div className="mb-4 flex flex-wrap justify-between items-end gap-3">
        <div><h2 className="text-xl font-semibold">Budget</h2><p className="text-muted text-xs">Grand budget at the top. Each event has its own. Every dollar is a task with money on it. What is not spent goes to the honeymoon.</p></div>
        {parent && <button onClick={() => setBudget(parent.id, parent.budget_total)} className="text-xs border border-line bg-white rounded-md px-3 py-2">Grand budget: <b>{grand ? money(grand) : 'not set'}</b></button>}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
        <Kpi l="Grand budget" v={grand ? money(grand) : '—'} /><Kpi l="Committed" v={money(committed)} /><Kpi l="Paid" v={money(paid)} /><Kpi l="Still to pay" v={money(committed - paid)} />
        <Kpi l="Left in budget" v={grand ? money(grand - committed) : '—'} cls={grand && grand - committed < 0 ? 'text-bad' : ''} /><Kpi l="Saved vs quotes" v={money(saved)} cls="text-ok" />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Card title="By event" right={<span className="text-muted font-normal text-xs">click a budget to edit</span>}>
          <table className="w-full text-xs"><thead><tr className="text-muted text-left uppercase tracking-wider text-[10px]"><th className="py-1">Event</th><th className="text-right">Budget</th><th className="text-right">Committed</th><th className="text-right">Paid</th><th className="text-right">Left</th><th className="text-right">Saved</th></tr></thead>
            <tbody>{kids.map(b => { const ev = s.events.find(e => e.id === b.event_id); const left = (b.budget_total ?? 0) - b.committed; return (
              <tr key={b.event_id} className="border-t border-paper"><td className="py-2">{b.name}<div className="text-muted text-[11px]">paid by {ev?.paid_by ?? '—'}</div></td>
                <td className="text-right"><button className="underline" onClick={() => setBudget(b.event_id, b.budget_total)}>{b.budget_total ? money(b.budget_total) : 'set'}</button></td>
                <td className="text-right">{money(b.committed)}</td><td className="text-right">{money(b.paid)}</td><td className={`text-right ${b.budget_total && left < 0 ? 'text-bad font-semibold' : ''}`}>{b.budget_total ? money(left) : '—'}</td><td className="text-right text-ok font-semibold">{b.saved ? money(b.saved) : '—'}</td></tr>) })}</tbody></table>
        </Card>
        <Card title="By category">
          <table className="w-full text-xs"><thead><tr className="text-muted text-left uppercase tracking-wider text-[10px]"><th className="py-1">Category</th><th className="text-right">Committed</th><th className="text-right">Paid</th><th className="text-right">Saved</th></tr></thead>
            <tbody>{Object.entries(cats).sort((a, b) => b[1].c - a[1].c).map(([k, v]) => <tr key={k} className="border-t border-paper"><td className="py-2">{k}</td><td className="text-right">{money(v.c)}</td><td className="text-right">{money(v.p)}</td><td className="text-right text-ok font-semibold">{v.s ? money(v.s) : '—'}</td></tr>)}
              {!Object.keys(cats).length && <tr><td className="text-muted py-2" colSpan={4}>No money on any task yet.</td></tr>}</tbody></table>
        </Card>
      </div>
      <Card title="Who paid" right={<span className="text-muted font-normal text-xs">all expenses are the dads'; this is the split so far</span>}>
        <table className="w-full text-xs"><tbody>{Object.entries(who).map(([k, v]) => <tr key={k} className="border-t border-paper"><td className="py-2">{k}</td><td className="text-right">{money(v)}</td></tr>)}{!Object.keys(who).length && <tr><td className="text-muted py-2">Nothing paid yet.</td></tr>}</tbody></table>
      </Card>
    </>
  )
}
