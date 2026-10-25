export type Event = {
  id: string; slug: string; name: string; short_name: string | null; event_type: 'public' | 'private'
  parent_event_id: string | null; status: string; date: string | null; start_time: string | null
  venue_name: string | null; venue_city: string | null; budget_total: number | null; paid_by: string | null
  guest_list_note: string | null; host_line: string | null; names_line: string | null
  verse_ar: string | null; verse_en: string | null; verse_ref: string | null; dress_code: string | null
  theme: Record<string, string>
}
export type Member = { id: string; auth_user_id: string | null; event_id: string; name: string; role: string | null; email: string; digest_day: string; digest_time: string }
export type Task = {
  id: string; event_id: string; title: string; owner_id: string | null; due: string | null; phase: string
  category: string | null; quoted_amount: number; fulfilled_by: 'vendor' | 'ourselves'; amount: number; paid: number
  paid_by: string | null; quote_source: string | null; vendor_name: string | null; notes: string | null
  done: boolean; remind_when_done: boolean
  // from v_member_tasks
  owner_name?: string | null; event_short?: string | null; event_name?: string | null
  remaining?: number; saved?: number; urgency?: 'done' | 'overdue' | 'soon' | 'open'
}
export type EventBudget = { event_id: string; parent_event_id: string | null; name: string; budget_total: number | null; committed: number; paid: number; saved: number; open_tasks: number }

export const money = (n: number | null | undefined) => '$' + Math.round(n ?? 0).toLocaleString()
export const fmtDate = (d: string | null | undefined) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''
