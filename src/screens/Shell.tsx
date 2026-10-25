import { useCallback, useEffect, useState } from 'react'
import type { Member, Event, Task, EventBudget } from '../lib/types'
import { loadEvents, loadMembers, loadTasks, loadBudget } from '../lib/data'
import Week from './Week'
import Tasks from './Tasks'
import Budget from './Budget'
import Events from './Events'

export type Store = { me: Member; members: Member[]; events: Event[]; tasks: Task[]; budget: EventBudget[]; refresh: () => Promise<void> }
type Page = 'week' | 'tasks' | 'budget' | 'events'

const NAV: { id: Page; label: string }[] = [
  { id: 'week', label: 'My week' }, { id: 'tasks', label: 'All tasks' }, { id: 'budget', label: 'Budget' }, { id: 'events', label: 'Events' },
]

export default function Shell({ member, onSignOut }: { member: Member; onSignOut: () => void }) {
  const [page, setPage] = useState<Page>('week')
  const [store, setStore] = useState<Omit<Store, 'me' | 'refresh'> | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const [members, events, tasks, budget] = await Promise.all([loadMembers(), loadEvents(), loadTasks(), loadBudget()])
      setStore({ members, events, tasks, budget }); setErr(null)
    } catch (e) { setErr((e as Error).message) }
  }, [])
  useEffect(() => { refresh() }, [refresh])

  const s: Store | null = store ? { ...store, me: member, refresh } : null
  const mine = store?.tasks.filter(t => t.owner_id === member.id && !t.done).length ?? 0
  const open = store?.tasks.filter(t => !t.done).length ?? 0

  return (
    <div className="min-h-screen md:grid md:grid-cols-[230px_minmax(0,1fr)]">
      <aside className="bg-navy text-white p-4 md:sticky md:top-0 md:h-screen">
        <div className="font-bold">Event Engine<div className="text-steel text-[11px] font-normal">by Dr. Data Decision Intelligence</div></div>
        <div className="bg-navy2 rounded-lg px-3 py-2 my-3 text-xs"><b className="block text-[13px]">{member.name}</b><span className="text-steel">{member.role}</span> · <button onClick={onSignOut} className="underline text-steel">Sign out</button></div>
        <nav className="flex md:flex-col gap-1 flex-wrap">
          {NAV.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)} className={`text-left px-3 py-2 rounded-md text-[13px] flex justify-between ${page === n.id ? 'bg-orange text-white' : 'text-[#cfdbe8] hover:bg-white/10'}`}>
              {n.label}
              {n.id === 'week' && <span className="text-[11px] bg-white/20 rounded-full px-2">{mine}</span>}
              {n.id === 'tasks' && <span className="text-[11px] bg-white/20 rounded-full px-2">{open}</span>}
            </button>
          ))}
        </nav>
      </aside>
      <main className="p-5 md:p-7 pb-16">
        {err && <div className="bg-bad/10 text-bad rounded-md p-3 mb-4 text-xs">{err}</div>}
        {!s ? <p className="text-muted">Loading…</p> : (
          page === 'week' ? <Week s={s} /> : page === 'tasks' ? <Tasks s={s} /> : page === 'budget' ? <Budget s={s} /> : <Events s={s} />
        )}
      </main>
      <footer className="md:col-span-2 bg-navy text-steel text-center text-xs p-4"><b className="text-white">Event Engine</b> · Need an event management system like this? <a className="text-orange" href="https://drdatadecisionintelligence.com">Call Dr. Data.</a></footer>
    </div>
  )
}

export const Card = ({ title, children, right }: { title?: string; children: React.ReactNode; right?: React.ReactNode }) => (
  <div className="bg-white border border-line rounded-xl p-4 mb-4">
    {title && <h3 className="text-[13.5px] font-semibold mb-3 flex justify-between items-center">{title}{right}</h3>}
    {children}
  </div>
)
export const Kpi = ({ l, v, cls = '' }: { l: string; v: string | number; cls?: string }) => (
  <div className="bg-white border border-line rounded-xl px-4 py-3"><div className="text-[11px] text-muted uppercase tracking-wider">{l}</div><div className={`text-2xl font-semibold ${cls}`}>{v}</div></div>
)
export const Tag = ({ children, tone = '' }: { children: React.ReactNode; tone?: string }) => {
  const t: Record<string, string> = { ok: 'bg-ok/10 text-ok', warn: 'bg-warn/10 text-warn', bad: 'bg-bad/10 text-bad', navy: 'bg-navy/10 text-navy' }
  return <span className={`inline-block text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap ${t[tone] ?? 'bg-paper text-ink'}`}>{children}</span>
}
