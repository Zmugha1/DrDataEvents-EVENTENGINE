import type { Task } from '../lib/types'
import { money, fmtDate } from '../lib/types'
import { updateTask } from '../lib/data'
import { Tag } from './Shell'

export default function TaskRow({ t, owners, showOwner, onChange }: { t: Task; owners: { id: string; name: string }[]; showOwner: boolean; onChange: () => void }) {
  const act = async (patch: Partial<Task>) => { await updateTask(t.id, patch); onChange() }
  const due = t.done ? <Tag tone="ok">done</Tag>
    : t.urgency === 'overdue' ? <span className="text-bad font-semibold">overdue, due {fmtDate(t.due)}</span>
    : t.urgency === 'soon' ? <span className="text-warn font-semibold">due {fmtDate(t.due)}</span>
    : <span className="text-muted">{t.due ? 'due ' + fmtDate(t.due) : 'no date'}</span>
  const hasMoney = t.amount || t.quoted_amount
  return (
    <div className={`grid grid-cols-[auto_1fr] md:grid-cols-[auto_1fr_auto] gap-3 py-3 border-b border-paper last:border-0 ${t.done ? 'opacity-50' : ''}`}>
      <input type="checkbox" checked={t.done} onChange={e => act({ done: e.target.checked, done_at: e.target.checked ? new Date().toISOString() : null } as Partial<Task>)} className="mt-1" />
      <div>
        <div className="font-medium">{t.title}</div>
        <div className="text-xs text-muted mt-0.5 flex flex-wrap gap-x-2 gap-y-1 items-center">
          <Tag tone="navy">{t.event_short ?? t.event_name}</Tag>{showOwner && <span>{t.owner_name ?? 'unassigned'}</span>}<span>·</span>{due}{t.category && <Tag>{t.category}</Tag>}
        </div>
        {hasMoney ? <div className="text-xs mt-1">{t.quoted_amount ? `Quoted ${money(t.quoted_amount)} · ` : ''}{t.fulfilled_by === 'ourselves' ? 'Ourselves' : 'Vendor'} {money(t.amount)} · Paid {money(t.paid)}{t.paid_by ? ' by ' + t.paid_by : ''} · Remaining <b>{money(t.remaining)}</b>{t.saved ? <span className="text-ok font-semibold"> · Saved {money(t.saved)}</span> : null}</div> : null}
        {t.notes && <div className="text-xs bg-paper rounded-md px-2 py-1 mt-1 whitespace-pre-wrap">{t.notes}</div>}
      </div>
      <div className="col-start-2 md:col-start-3 flex flex-wrap gap-1 justify-start md:justify-end">
        <Btn onClick={() => { const n = prompt('Note', t.notes ?? ''); if (n !== null) act({ notes: n }) }}>Note</Btn>
        <Btn onClick={() => { const d = prompt('Due date (YYYY-MM-DD)', t.due ?? ''); if (d) act({ due: d }) }}>Date</Btn>
        <Btn onClick={() => { const a = prompt('Amount (contract, or materials if ourselves)', String(t.amount)); if (a === null) return; const q = prompt('Vendor quote, blank for none', String(t.quoted_amount || '')); act({ amount: +a || 0, quoted_amount: +(q ?? 0) || 0 }) }}>Money</Btn>
        {t.amount > t.paid && <Btn tone="ok" onClick={() => { const a = +(prompt(`Paid now? Remaining ${money(t.remaining)}`, String(t.remaining)) ?? 0); if (!a) return; const by = prompt('Paid by', t.paid_by ?? '') ?? t.paid_by; act({ paid: Math.min(t.amount, t.paid + a), paid_by: by }) }}>Paid</Btn>}
        <Btn onClick={() => act({ fulfilled_by: t.fulfilled_by === 'vendor' ? 'ourselves' : 'vendor' })}>{t.fulfilled_by === 'vendor' ? 'Ourselves' : 'Hire'}</Btn>
        <select className="text-xs border border-line rounded-md px-1" value={t.owner_id ?? ''} onChange={e => act({ owner_id: e.target.value || null })}>
          <option value="">Unassigned</option>{owners.map(o => <option key={o.id} value={o.id}>{o.name.split(' ')[0]}</option>)}
        </select>
      </div>
    </div>
  )
}
const Btn = ({ children, onClick, tone }: { children: React.ReactNode; onClick: () => void; tone?: 'ok' }) => (
  <button onClick={onClick} className={`text-xs px-2 py-1 rounded-md border ${tone === 'ok' ? 'bg-ok text-white border-ok' : 'bg-white border-line text-navy'}`}>{children}</button>
)
