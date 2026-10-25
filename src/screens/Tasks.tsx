import { useState } from 'react'
import type { Store } from './Shell'
import { Card } from './Shell'
import TaskRow from './TaskRow'
import { insertTask } from '../lib/data'

const CATS = ['', 'venue', 'catering', 'event management', 'flowers', 'decor', 'invites', 'guest reminders', 'photo and video', 'outfits', 'mehndi artist', 'other']

export default function Tasks({ s }: { s: Store }) {
  const [owner, setOwner] = useState('all'); const [ev, setEv] = useState('all')
  const [f, setF] = useState({ title: '', owner_id: s.me.id, event_id: s.events[0]?.id ?? '', due: '', category: '', amount: '', quoted_amount: '' })
  const list = s.tasks.filter(t => (owner === 'all' || t.owner_id === owner) && (ev === 'all' || t.event_id === ev)).sort((a, b) => Number(a.done) - Number(b.done) || (a.due ?? '9').localeCompare(b.due ?? '9'))
  const add = async () => {
    if (!f.title.trim()) return
    await insertTask({ title: f.title.trim(), owner_id: f.owner_id || null, event_id: f.event_id, due: f.due || null, category: f.category || null, amount: +f.amount || 0, quoted_amount: +f.quoted_amount || 0 })
    setF({ ...f, title: '', amount: '', quoted_amount: '' }); s.refresh()
  }
  const inp = 'border border-line rounded-md px-2 py-1.5 w-full'
  return (
    <>
      <div className="mb-4"><h2 className="text-xl font-semibold">All tasks</h2><p className="text-muted text-xs">Every task, whose it is, which event, and the money on it.</p></div>
      <Card title="Add task">
        <div className="grid grid-cols-2 md:grid-cols-7 gap-2 items-end text-xs">
          <label className="col-span-2">Task<input className={inp} value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="Book the masjid hall" /></label>
          <label>Whose<select className={inp} value={f.owner_id} onChange={e => setF({ ...f, owner_id: e.target.value })}>{s.members.map(m => <option key={m.id} value={m.id}>{m.name.split(' ')[0]}</option>)}</select></label>
          <label>Event<select className={inp} value={f.event_id} onChange={e => setF({ ...f, event_id: e.target.value })}>{s.events.map(e => <option key={e.id} value={e.id}>{e.short_name ?? e.name}</option>)}</select></label>
          <label>Due<input type="date" className={inp} value={f.due} onChange={e => setF({ ...f, due: e.target.value })} /></label>
          <label>Category<select className={inp} value={f.category} onChange={e => setF({ ...f, category: e.target.value })}>{CATS.map(c => <option key={c} value={c}>{c || 'None'}</option>)}</select></label>
          <button onClick={add} className="bg-navy text-white rounded-md py-2">Add</button>
        </div>
      </Card>
      <div className="flex flex-wrap gap-1 mb-2 text-xs">{[['all', 'Everyone'], ...s.members.map(m => [m.id, m.name.split(' ')[0]])].map(([id, l]) => <Pill key={id} on={owner === id} onClick={() => setOwner(id)}>{l}</Pill>)}</div>
      <div className="flex flex-wrap gap-1 mb-3 text-xs">{[['all', 'All events'], ...s.events.map(e => [e.id, e.short_name ?? e.name])].map(([id, l]) => <Pill key={id} on={ev === id} onClick={() => setEv(id)}>{l}</Pill>)}</div>
      <Card>{list.length ? list.map(t => <TaskRow key={t.id} t={t} owners={s.members} showOwner onChange={s.refresh} />) : <p className="text-muted text-xs">No tasks match.</p>}</Card>
    </>
  )
}
const Pill = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button onClick={onClick} className={`px-3 py-1 rounded-full border ${on ? 'bg-navy text-white border-navy' : 'bg-white border-line'}`}>{children}</button>
)
