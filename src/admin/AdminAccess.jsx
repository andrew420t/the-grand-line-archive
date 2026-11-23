import { useState } from 'react'
import { Anchor, ArrowLeft, ArrowRight, LockKeyhole, ShieldAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AdminAccess({ user, isAdmin, profile, onAuthenticated }) {
  const [email, setEmail] = useState(user?.email || '')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submitAuthentication = async (event) => {
    event.preventDefault()
    setError('')
    if (user && isAdmin) {
      onAuthenticated(user, profile)
      return
    }
    if (!supabase) {
      setError('Supabase is not configured. Check the existing project connection.')
      return
    }

    setBusy(true)
    try {
      const authResult = await supabase.auth.signInWithPassword({ email, password })
      if (authResult.error) throw authResult.error
      const authenticatedUser = authResult.data.user
      if (!authenticatedUser) throw new Error('Supabase did not return an authenticated user.')

      const profileResult = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authenticatedUser.id)
        .maybeSingle()

      if (profileResult.error) {
        throw new Error(`Could not verify the administrator profile: ${profileResult.error.message}`)
      }
      if (String(profileResult.data?.role || '').toLowerCase() !== 'admin') {
        throw new Error('This account does not have profiles.role = admin.')
      }

      onAuthenticated(authenticatedUser, profileResult.data)
    } catch (authError) {
      setError(authError.message || 'Administrator authentication failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="page-width captain-access">
      <Link className="captain-access__back" to="/shop"><ArrowLeft size={15} /> Return to shop</Link>
      <section className="captain-access__card" aria-labelledby="captain-access-title">
        <span className="captain-access__mark"><Anchor size={26} strokeWidth={1.4} /></span>
        <p className="eyebrow">AUTHORISED PERSONNEL ONLY</p>
        <h1 id="captain-access-title">CAPTAIN'S<br /><em>QUARTERS</em></h1>
        <p className="captain-access__description">ADMINISTRATOR SIGN IN</p>
        <form onSubmit={submitAuthentication}>
          {user && isAdmin ? (
            <p>You are already signed in with an administrator account.</p>
          ) : (
            <>
              <label className="form-field">
                <span>Email address</span>
                <input autoComplete="username" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
              </label>
              <label className="form-field">
                <span>Password</span>
                <span className="captain-access__password-input">
                  <LockKeyhole size={16} />
                  <input autoComplete="current-password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} />
                </span>
              </label>
            </>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button--gold button--wide" type="submit" disabled={busy}>
            {busy ? 'Verifying administrator…' : user && isAdmin ? 'Continue to admin' : 'Sign in securely'} <ArrowRight size={16} />
          </button>
        </form>
        <p className="captain-access__security"><ShieldAlert size={14} /> Administrator access is verified against your Supabase profile role. Database Row Level Security must protect all privileged operations.</p>
      </section>
    </main>
  )
}
