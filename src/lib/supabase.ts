import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// ADR-03: anon key is browser-safe; RLS is the gate. Fail loud, not blank (Pulse lesson).
if (!url || !url.startsWith('https://') || !anon) {
  throw new Error('Supabase env missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then rebuild.')
}

export const supabase = createClient(url, anon)
