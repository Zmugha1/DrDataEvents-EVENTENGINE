import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
    if (error) setErr(error.message)
    setBusy(false)
  }

  return (
    <div className="min-h-screen grid place-items-center bg-navy">
      <form onSubmit={submit} className="bg-white rounded-xl p-8 w-[min(380px,92vw)] shadow">
        <div className="font-bold text-navy">Event Engine</div>
        <h1 className="text-lg font-semibold mt-1">Sign in</h1>
        <p className="text-muted text-xs mb-4">Team logins only. No signup.</p>
        <label className="block text-xs text-muted mt-3 mb-1">Email</label>
        <input className="w-full border border-line rounded-md px-3 py-2" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" required />
        <label className="block text-xs text-muted mt-3 mb-1">Password</label>
        <input className="w-full border border-line rounded-md px-3 py-2" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required />
        {err && <p className="text-bad text-xs mt-3">{err}</p>}
        <button disabled={busy} className="w-full mt-5 bg-orange text-white rounded-md py-2 font-medium disabled:opacity-60">{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  )
}
