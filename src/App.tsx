import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { currentMember } from './lib/data'
import type { Member } from './lib/types'
import Login from './screens/Login'
import Shell from './screens/Shell'

// ADR-01: auth first, then reads. Nothing renders until the session is confirmed.
export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [member, setMember] = useState<Member | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session?.access_token || !session.user.email) { setMember(null); return }
    currentMember(session.user.email).then(setMember)
  }, [session])

  if (session === undefined) return <Center>Checking session…</Center>
  if (!session) return <Login />
  if (member === null) return <Center>Signed in as {session.user.email}. No member row matches this email. Ask Zubia to add you.</Center>
  return <Shell member={member} onSignOut={() => supabase.auth.signOut()} />
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen grid place-items-center text-muted">{children}</div>
}
