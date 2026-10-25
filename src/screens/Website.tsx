import { useCallback, useEffect, useState } from 'react'
import type { Store } from './Shell'
import { Card, Tag } from './Shell'
import type { Event } from '../lib/types'
import { loadSiteContent, saveSiteContent, updateEvent, type SiteContent } from '../lib/data'

const SITE = import.meta.env.VITE_SITE_URL ?? 'https://zakkiwedsyasmeen.netlify.app'

// Every field the site reads (ADR-EE-04, ADR-EE-17). Label, where it shows, hint.
type EvField = { col: keyof Event; label: string; hint?: string; type?: 'date' | 'text' }
const EVENT_FIELDS: EvField[] = [
  { col: 'start_time', label: 'Start time', hint: '5:00 pm' },
  { col: 'end_time', label: 'End time', hint: '10:00 pm' },
  { col: 'venue_name', label: 'Venue', hint: 'Islamic Society of Milwaukee' },
  { col: 'venue_address', label: 'Address', hint: '4707 S 13th St, Milwaukee, WI 53221' },
  { col: 'venue_city', label: 'City on the page', hint: 'Milwaukee, WI' },
  { col: 'venue_map_url', label: 'Map link', hint: 'Paste from Google Maps, Share' },
  { col: 'dress_code', label: 'Dress', hint: 'Modest formal. White and ivory.' },
]
type CField = { key: string; label: string; where: string; hint?: string; rows?: number }
const PARENT_CONTENT: CField[] = [
  { key: 'home_welcome', label: 'From our families', where: 'Home', hint: 'A few warm lines about the week.', rows: 4 },
  { key: 'rsvp_contacts', label: 'RSVP contacts', where: 'Every page', hint: 'One per line: Name · phone', rows: 3 },
  { key: 'hotel_block', label: 'Hotel block', where: 'Travel', hint: 'Hotel, address, rate, book-by date, link or phone.', rows: 3 },
  { key: 'hotel_second', label: 'Second hotel', where: 'Travel', rows: 2 },
  { key: 'shuttle', label: 'Shuttle', where: 'Travel', hint: 'Leave blank if none.', rows: 2 },
  { key: 'registry_note', label: 'Gifts line', where: 'Duas and Sadqa', rows: 2 },
  { key: 'sadqa_causes', label: 'Sadqa causes', where: 'Duas and Sadqa', hint: 'One per line: Cause · link', rows: 3 },
]
const MAIL_CONTENT: CField[] = [
  { key: 'invite_subject', label: 'Invitation email: subject', where: 'Email', rows: 1 },
  { key: 'invite_body', label: 'Invitation email: body', where: 'Email', hint: 'Placeholders: {family} {events} {link} {reply_by} {seats}', rows: 10 },
  { key: 'reminder_subject', label: 'Reminder email: subject', where: 'Email', rows: 1 },
  { key: 'reminder_body', label: 'Reminder email: body', where: 'Email', hint: 'Same placeholders.', rows: 7 },
]
const EVENT_CONTENT = (slug: string): CField[] => [
  { key: `times_${slug}`, label: 'Timeline', where: 'Event page, three rows', hint: 'One per line: Label | time. First row is Arrival.', rows: 3 },
  { key: `note_${slug}`, label: 'A note for our guests', where: 'Event page', rows: 3 },
  { key: `parking_${slug}`, label: 'Parking', where: 'Event page', rows: 2 },
  { key: `directions_${slug}`, label: 'Directions', where: 'Travel', rows: 3 },
]

export default function Website({ s }: { s: Store }) {
  const parent = s.events.find(e => !e.parent_event_id)
  const kids = s.events.filter(e => e.parent_event_id).sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
  const [content, setContent] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const reload = useCallback(async () => {
    try { const rows = await loadSiteContent(); const m: Record<string, string> = {}; rows.forEach((r: SiteContent) => { m[r.key] = r.body }); setContent(m) } catch (e) { setErr((e as Error).message) }
  }, [])
  useEffect(() => { reload() }, [reload])
  if (!parent) return <p className="text-muted text-xs">No parent event.</p>

  const flash = (k: string) => { setSaved(k); setTimeout(() => setSaved(null), 1200) }
  const saveC = async (key: string, body: string) => { if ((content[key] ?? '') === body) return; try { await saveSiteContent(parent.id, key, body); setContent({ ...content, [key]: body }); flash(key) } catch (e) { setErr((e as Error).message) } }
  const saveE = async (ev: Event, col: keyof Event, v: string) => { if (((ev[col] as string | null) ?? '') === v) return; try { await updateEvent(ev.id, { [col]: v || null } as Partial<Event>); flash(ev.id + col); await s.refresh() } catch (e) { setErr((e as Error).message) } }

  // What is missing
  const missing: string[] = []
  if (!parent.reply_by) missing.push('Reply-by date')
  if (!(content.home_welcome ?? '').trim()) missing.push('From our families')
  if (/\[phone\]/.test(content.rsvp_contacts ?? '') || !(content.rsvp_contacts ?? '').trim()) missing.push('RSVP phone numbers')
  if (!(content.hotel_block ?? '').trim()) missing.push('Hotel block')
  kids.forEach(k => { EVENT_FIELDS.filter(f => f.col !== 'end_time' && f.col !== 'venue_map_url').forEach(f => { if (!k[f.col]) missing.push(`${k.short_name ?? k.name}: ${f.label.toLowerCase()}`) }) })

  const inp = 'border border-line rounded-md px-2 py-1.5 w-full'

  return (
    <>
      <div className="mb-4 flex flex-wrap justify-between items-end gap-2">
        <div><h2 className="text-xl font-semibold">Website</h2><p className="text-muted text-xs">Every word on the site is a field here. Change it, click away, it is live on the next page load.</p></div>
        <a className="text-xs underline text-navy" href={SITE} target="_blank" rel="noopener">Open the site</a>
      </div>
      {err && <div className="bg-bad/10 text-bad rounded-md p-3 mb-4 text-xs">{err}</div>}
      <Card title={missing.length ? `Still missing on the site (${missing.length})` : 'Nothing missing'}>
        {missing.length ? <ul className="text-xs grid md:grid-cols-2 gap-x-4">{missing.map(m => <li key={m} className="py-0.5 text-warn">{m}</li>)}</ul> : <p className="text-xs text-ok">Every field the site reads has a value.</p>}
      </Card>
      <Card title="The wedding">
        <div className="grid md:grid-cols-3 gap-3 text-xs">
          <label>Reply by <SavedTag on={saved === parent.id + 'reply_by'} /><input type="date" className={inp} defaultValue={parent.reply_by ?? ''} onBlur={e => saveE(parent, 'reply_by', e.target.value)} /></label>
          <label>Hashtag <SavedTag on={saved === parent.id + 'hashtag'} /><input className={inp} defaultValue={parent.hashtag ?? ''} onBlur={e => saveE(parent, 'hashtag', e.target.value)} /></label>
          <label>City on the home page <SavedTag on={saved === parent.id + 'venue_city'} /><input className={inp} defaultValue={parent.venue_city ?? ''} onBlur={e => saveE(parent, 'venue_city', e.target.value)} /></label>
        </div>
        <div className="grid md:grid-cols-2 gap-3 text-xs mt-3">
          {PARENT_CONTENT.map(f => <ContentField key={f.key} f={f} value={content[f.key] ?? ''} onSave={saveC} saved={saved} />)}
        </div>
      </Card>
      <Card title="Emails">
        <p className="text-muted text-xs mb-2">Sent from your Gmail for groom-side families and Asiya's for bride-side. Placeholders fill per family.</p>
        <div className="grid md:grid-cols-2 gap-3 text-xs">
          {MAIL_CONTENT.map(f => <ContentField key={f.key} f={f} value={content[f.key] ?? ''} onSave={saveC} saved={saved} />)}
        </div>
      </Card>
      {kids.map(k => (
        <Card key={k.id} title={`${k.name} · ${k.date ?? ''}`}>
          <div className="grid md:grid-cols-3 gap-3 text-xs">
            {EVENT_FIELDS.map(f => (
              <label key={f.col}>{f.label} <SavedTag on={saved === k.id + f.col} /><input className={inp} defaultValue={(k[f.col] as string | null) ?? ''} placeholder={f.hint} onBlur={e => saveE(k, f.col, e.target.value)} /></label>
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-3 text-xs mt-3">
            {EVENT_CONTENT(k.slug).map(f => <ContentField key={f.key} f={f} value={content[f.key] ?? ''} onSave={saveC} saved={saved} />)}
          </div>
        </Card>
      ))}
    </>
  )
}

function ContentField({ f, value, onSave, saved }: { f: CField; value: string; onSave: (k: string, v: string) => void; saved: string | null }) {
  return (
    <label>{f.label} <span className="text-muted">· {f.where}</span> {saved === f.key && <Tag tone="ok">saved</Tag>}
      <textarea className="border border-line rounded-md px-2 py-1.5 w-full" rows={f.rows ?? 2} defaultValue={value} placeholder={f.hint} onBlur={e => onSave(f.key, e.target.value)} />
    </label>
  )
}

const SavedTag = ({ on }: { on: boolean }) => on ? <Tag tone="ok">saved</Tag> : null
