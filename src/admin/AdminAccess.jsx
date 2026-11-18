import { useState } from 'react'
import { Anchor, ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, ShieldAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const ACCESS_CODE = '2706'

export default function AdminAccess({ user, isAdmin, profile, onAuthenticated }) {
  const [stage, setStage] = useState('code')
  const [code, setCode] = useState('')
  const [showCode, setShowCode] = useState(false)
  const [email, setEmail] = useState(user?.email || '')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submitCode = (event) => {
    event.preventDefault()
    setError('')
    if (code !== ACCESS_CODE) {
      setError('That access code is incorrect. Please try again.')
      return
    }

    if (user && isAdmin) {
      onAuthenticated(user, profile)
      return
    }

    setStage('authentication')
  }

  const submitAuthentication = async (event) => {
    event.preventDefault()
    if (!supabase) {
      setError('Supabase is not configured. Check the existing project connection.')
      return
    }

    setBusy(true)
    setError('')
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
        <p className="eyebrow">AUTHORised PERSONNEL ONLY</p>
        <h1 id="captain-access-title">CAPTAIN'S<br /><em>QUARTERS</em></h1>
        {stage === 'code' ? (
          <>
            <p className="captain-access__description">ENTER ACCESS CODE</p>
            <form onSubmit={submitCode}>
              <label className="form-field captain-access__code-field">
                <span>Four-digit access code</span>
                <span className="captain-access__code-input">
                  <input
                    autoComplete="off"
                    inputMode="numeric"
                    maxLength={4}
                    pattern="[0-9]{4}"
                    required
                    type={showCode ? 'text' : 'password'}
                    value={code}
                    onChange={(event) => {
                      setCode(event.target.value.replace(/\D/g, '').slice(0, 4))
                      setError('')
                    }}
                    aria-label="Four-digit access code"
                  />
                  <button
                    type="button"
                    className="captain-access__visibility"
                    onClick={() => setShowCode((visible) => !visible)}
                    aria-label={showCode ? 'Hide access code' : 'Show access code'}
                  >
                    {showCode ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </span>
              </label>
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="button button--gold button--wide" type="submit">
                Continue <ArrowRight size={16} />
              </button>
            </form>
            <p className="captain-access__security"><ShieldAlert size={14} /> The code is an extra step; Supabase administrator authentication is still required.</p>
          </>
        ) : (
          <>
            <p className="captain-access__description">ADMINISTRATOR SIGN IN</p>
            <form onSubmit={submitAuthentication}>
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
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="button button--gold button--wide" type="submit" disabled={busy}>
                {busy ? 'Verifying administrator…' : 'Sign in securely'} <ArrowRight size={16} />
              </button>
            </form>
            <p className="captain-access__security"><ShieldAlert size={14} /> Access is granted only when your Supabase profile has the admin role.</p>
          </>
        )}
      </section>
    </main>
  )
}
