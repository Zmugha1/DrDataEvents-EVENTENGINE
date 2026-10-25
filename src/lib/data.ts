import { supabase } from './supabase'
import type { Event, Member, Task, EventBudget } from './types'

// Supabase caps at 1000 rows per request. Page by id (repo rule 5).
async function all<T>(table: string, order = 'id', filter?: (q: any) => any): Promise<T[]> {
  const out: T[] = []
  let from = 0
  for (;;) {
    let q = supabase.from(table).select('*').order(order).range(from, from + 999)
    if (filter) q = filter(q)
    const { data, error } = await q
    if (error) throw error
    out.push(...(data as T[]))
    if (!data || data.length < 1000) return out
    from += 1000
  }
}

export const loadEvents = () => all<Event>('events', 'date')
export const loadMembers = () => all<Member>('members', 'name')
export const loadTasks = () => all<Task>('v_member_tasks', 'due')
export const loadBudget = () => all<EventBudget>('v_event_budget', 'name')

export async function currentMember(email: string): Promise<Member | null> {
  const { data } = await supabase.from('members').select('*').ilike('email', email).maybeSingle()
  return data as Member | null
}

export async function updateTask(id: string, patch: Partial<Task>) {
  const { error } = await supabase.from('tasks').update(patch).eq('id', id)
  if (error) throw error
}
export async function insertTask(row: Partial<Task>) {
  const { error } = await supabase.from('tasks').insert(row)
  if (error) throw error
}
export async function updateEvent(id: string, patch: Partial<Event>) {
  const { error } = await supabase.from('events').update(patch).eq('id', id)
  if (error) throw error
}

// ---------- guests ----------
import type { Party, Registration, RsvpRow } from './types'
import { makeCode } from './guests'

export const loadParties = () => all<Party>('parties', 'name')
export const loadGuestRegs = () => all<Registration>('registrations', 'id', q => q.eq('type', 'guest'))
export const loadRsvp = () => all<RsvpRow>('v_rsvp', 'date')

export async function addParty(input: { parent_id: string; name: string; email: string | null; phone: string | null; seats: number; side: Party['side']; event_ids: string[] }) {
  let lead_id: string | null = null
  if (input.email) {
    const { data, error } = await supabase.from('leads').upsert({ email: input.email.toLowerCase(), name: input.name, phone: input.phone, source: 'guest' }, { onConflict: 'email' }).select('id').single()
    if (error) throw error; lead_id = data.id
  }
  let party: Party | null = null
  for (let i = 0; i < 5 && !party; i++) {
    const { data, error } = await supabase.from('parties').insert({ event_id: input.parent_id, name: input.name, primary_lead_id: lead_id, side: input.side, seats: input.seats, invite_code: makeCode(input.name) }).select().single()
    if (error && error.code !== '23505') throw error
    if (data) party = data as Party
  }
  if (!party) throw new Error('Could not make a unique code')
  if (input.event_ids.length) {
    const { error } = await supabase.from('registrations').insert(input.event_ids.map(event_id => ({ event_id, party_id: party!.id, lead_id, type: 'guest', status: 'invited', party_size: input.seats })))
    if (error) throw error
  }
  return party
}

export async function setInvited(party: Party, event_id: string, on: boolean) {
  if (on) {
    const { error } = await supabase.from('registrations').insert({ event_id, party_id: party.id, lead_id: party.primary_lead_id, type: 'guest', status: 'invited', party_size: party.seats })
    if (error) throw error
  } else {
    const { error } = await supabase.from('registrations').delete().eq('party_id', party.id).eq('event_id', event_id).eq('status', 'invited')
    if (error) throw error
  }
}
export async function updateParty(id: string, patch: Partial<Party>) {
  const { error } = await supabase.from('parties').update(patch).eq('id', id)
  if (error) throw error
}
export async function deleteParty(id: string) {
  const r = await supabase.from('registrations').delete().eq('party_id', id); if (r.error) throw r.error
  const p = await supabase.from('parties').delete().eq('id', id); if (p.error) throw p.error
}

// ---------- site content ----------
export type SiteContent = { id: string; event_id: string; key: string; body: string; published: boolean }
export const loadSiteContent = () => all<SiteContent>('site_content', 'key')
export async function saveSiteContent(event_id: string, key: string, body: string) {
  const { error } = await supabase.from('site_content').upsert({ event_id, key, body, published: true }, { onConflict: 'event_id,key' })
  if (error) throw error
}

// ---------- sending ----------
export type QueueRow = { id: string; party_id: string | null; kind: string; status: string; sent_at: string | null; error: string | null; created_at: string; to_email: string }
export const loadQueue = () => all<QueueRow>('send_queue', 'created_at')
export async function sendAction(body: { action: 'invite' | 'reminder' | 'process' | 'retry'; party_id?: string }) {
  const { data: { session } } = await supabase.auth.getSession()
  const r = await fetch('/api/send', { method: 'POST', headers: { Authorization: `Bearer ${session?.access_token ?? ''}` }, body: JSON.stringify(body) })
  const j = await r.json() as { ok: boolean; error?: string; sent?: number; failed?: number; errors?: string[] }
  if (!j.ok) throw new Error(j.error ?? 'send failed')
  return j
}
