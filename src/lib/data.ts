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
