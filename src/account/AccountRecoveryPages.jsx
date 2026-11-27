import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, KeyRound, Mail, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    if (!supabase) return setError('The account service is unavailable. Please try again later.')
    setBusy(true); setError('')
    try {
      const result = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/account/reset-password`,
      })
      if (result.error) throw result.error
      setSent(true)
    } catch (failure) {
      setError(failure.message || 'The reset request could not be sent.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="page-width account-recovery-page">
      <Link className="account-recovery-page__back" to="/account/orders"><ArrowLeft size={14} /> Back to account</Link>
      <section className="account-recovery-card">
        <span className="auth-icon"><KeyRound size={23} /></span>
        <p className="eyebrow">ACCOUNT SECURITY</p>
        <h1>Forgot your <em>password?</em></h1>
        {sent ? (
          <div className="account-recovery-success"><Check size={18} /><p>Request received. If an account matches that address, Supabase will send a password reset link. Check your inbox and spam folder.</p></div>
        ) : (
          <>
            <p>Enter the email address used for your Archive account. We'll send a secure password reset link if an account matches.</p>
            <form onSubmit={submit}>
              <label className="form-field"><span>Account email</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="button button--gold button--wide" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'} <ArrowRight size={15} /></button>
            </form>
          </>
        )}
        <p className="account-recovery-page__foot">Can't remember which email you used? <Link to="/account/recover-email">Request email account recovery</Link></p>
      </section>
    </main>
  )
}

export function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    if (!supabase) return setError('The account service is unavailable. Please try again later.')
    if (password.length < 8) return setError('Choose a password with at least 8 characters.')
    if (password !== confirmation) return setError('The passwords do not match.')
    setBusy(true); setError('')
    try {
      const result = await supabase.auth.updateUser({ password })
      if (result.error) throw result.error
      setSaved(true)
      setPassword('')
      setConfirmation('')
    } catch (failure) {
      setError(failure.message || 'The password could not be changed. Request a new reset link.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="page-width account-recovery-page">
      <Link className="account-recovery-page__back" to="/account/orders"><ArrowLeft size={14} /> Back to account</Link>
      <section className="account-recovery-card">
        <span className="auth-icon"><ShieldCheck size={23} /></span>
        <p className="eyebrow">SECURE YOUR ACCOUNT</p>
        <h1>Set a new <em>password.</em></h1>
        {saved ? (
          <div className="account-recovery-success"><Check size={18} /><p>Your password has been changed. You can now sign in with your new password.</p><Link className="button button--gold" to="/account/orders">Continue to account <ArrowRight size={15} /></Link></div>
        ) : (
          <form onSubmit={submit}>
            <label className="form-field"><span>New password</span><input type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
            <label className="form-field"><span>Confirm new password</span><input type="password" autoComplete="new-password" minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button button--gold button--wide" type="submit" disabled={busy}>{busy ? 'Updating…' : 'Save new password'} <ArrowRight size={15} /></button>
          </form>
        )}
      </section>
    </main>
  )
}

export function ForgotEmailPage() {
  const [displayName, setDisplayName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    if (!supabase) return setError('The account service is unavailable. Please try again later.')
    setBusy(true); setError('')
    try {
      const result = await supabase.rpc('submit_account_email_recovery', {
        p_display_name: displayName.trim(),
        p_contact_email: contactEmail.trim().toLowerCase(),
        p_details: details.trim() || null,
      })
      if (result.error) throw new Error(result.error.message)
      setSent(true)
    } catch (failure) {
      setError(failure.message || 'Your request could not be submitted.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="page-width account-recovery-page">
      <Link className="account-recovery-page__back" to="/account/orders"><ArrowLeft size={14} /> Back to account</Link>
      <section className="account-recovery-card">
        <span className="auth-icon"><Mail size={23} /></span>
        <p className="eyebrow">ACCOUNT RECOVERY</p>
        <h1>Forgot your <em>email?</em></h1>
        {sent ? (
          <div className="account-recovery-success"><Check size={18} /><p>Your request has been received. The Archive team can review it and contact you. For your security, this page does not reveal whether an email address is linked to an account.</p></div>
        ) : (
          <>
            <p>Tell the Archive team the name you used and a contact email where they can reach you. We may ask you to verify ownership before discussing account details.</p>
            <form onSubmit={submit}>
              <label className="form-field"><span>Name on your account</span><input value={displayName} maxLength={80} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" required /></label>
              <label className="form-field"><span>Contact email</span><input type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} autoComplete="email" required /></label>
              <label className="form-field"><span>Anything that helps us identify your request (optional)</span><textarea rows="3" maxLength={1000} value={details} onChange={(event) => setDetails(event.target.value)} placeholder="For example, an approximate date you joined or order reference." /></label>
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="button button--gold button--wide" type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Submit recovery request'} <ArrowRight size={15} /></button>
            </form>
          </>
        )}
      </section>
    </main>
  )
}
