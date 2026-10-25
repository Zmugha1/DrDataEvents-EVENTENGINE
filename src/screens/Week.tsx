import type { Store } from './Shell'
import { Card, Kpi } from './Shell'
import TaskRow from './TaskRow'
import { money } from '../lib/types'
import { buildDigest } from '../lib/digest'

export default function Week({ s }: { s: Store }) {
  const mine = s.tasks.filter(t => t.owner_id === s.me.id && !t.done)
  const soon = mine.filter(t => t.urgency === 'overdue' || t.urgency === 'soon')
  const rest = mine.filter(t => t.urgency === 'open')
  const due = mine.reduce((a, t) => a + (t.remaining ?? 0), 0)
  const paid = s.tasks.filter(t => t.owner_id === s.me.id).reduce((a, t) => a + t.paid, 0)
  const totSaved = s.budget.reduce((a, b) => a + b.saved, 0)
  const first = s.me.name.split(' ')[0]
  const digest = buildDigest({ email: s.me.email, firstName: first, tasks: mine, totalSaved: totSaved })

  return (
    <>
      <div className="mb-4"><h2 className="text-xl font-semibold">{first}'s week</h2><p className="text-muted text-xs">What is yours, what is due, what is paid. This is the email you get every {s.me.digest_day ?? 'Monday'}.</p></div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <Kpi l="Mine, open" v={mine.length} /><Kpi l="Overdue" v={mine.filter(t => t.urgency === 'overdue').length} cls={mine.some(t => t.urgency === 'overdue') ? 'text-bad' : ''} />
        <Kpi l="Due this week" v={mine.filter(t => t.urgency === 'soon').length} /><Kpi l="Still to pay on mine" v={money(due)} /><Kpi l="Paid on mine" v={money(paid)} />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Card title="Due this week and overdue">{soon.length ? soon.map(t => <TaskRow key={t.id} t={t} owners={s.members} showOwner={false} onChange={s.refresh} />) : <p className="text-muted text-xs">Nothing due this week.</p>}</Card>
        <Card title="Everything else that is mine">{rest.length ? rest.map(t => <TaskRow key={t.id} t={t} owners={s.members} showOwner={false} onChange={s.refresh} />) : <p className="text-muted text-xs">Nothing else.</p>}</Card>
      </div>
      <Card title="Weekly digest, as it will arrive by email"><pre className="bg-paper rounded-md p-3 text-xs whitespace-pre-wrap font-mono">{digest}</pre><p className="text-muted text-[11px] mt-2">Sending is S4: scheduled Netlify function, Gmail API, from the family mailbox.</p></Card>
    </>
  )
}
