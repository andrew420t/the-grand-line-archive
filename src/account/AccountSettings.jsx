import { useEffect, useState } from 'react'
import { Check, KeyRound, Mail, Save, ShieldCheck, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import WantedPosterAvatar from './WantedPosterAvatar'
import WantedPosterPicker from './WantedPosterPicker'

export default function AccountSettings({ user, profile, onProfileUpdated, onForgotPassword }) {
  const [displayName, setDisplayName] = useState(profile?.display_name || user?.user_metadata?.full_name || '')
  const [avatarKey, setAvatarKey] = useState(profile?.avatar_key || 'luffy')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    setDisplayName(profile?.display_name || user?.user_metadata?.full_name || '')
    setAvatarKey(profile?.avatar_key || 'luffy')
  }, [profile, user])

  const saveProfile = async (event) => {
    event.preventDefault()
    if (!supabase || !user?.id) return
    const name = displayName.trim()
    if (name.length < 2 || name.length > 80) {
      setError('Your account name must be between 2 and 80 characters.')
      return
    }
    setBusy('profile')
    setError('')
    setNotice('')
    try {
      const result = await supabase
        .from('profiles')
        .update({ display_name: name, avatar_key: avatarKey })
        .eq('id', user.id)
        .select('*')
        .single()
      if (result.error) throw new Error(result.error.message)
      onProfileUpdated?.(result.data)
      setNotice('Your account name and wanted poster have been saved.')
    } catch (failure) {
      setError(failure.message || 'Your account settings could not be saved.')
    } finally {
      setBusy('')
    }
  }

  const changeEmail = async (event) => {
    event.preventDefault()
    const email = newEmail.trim().toLowerCase()
    if (!supabase || !email) return
    if (email === String(user?.email || '').toLowerCase()) {
      setError('Enter a different email address.')
      return
    }
    setBusy('email')
    setError('')
    setNotice('')
    try {
      const result = await supabase.auth.updateUser({ email })
      if (result.error) throw result.error
      setNewEmail('')
      setNotice('Email change requested. Check the new address for Supabase verification instructions. Your sign-in email changes after confirmation.')
    } catch (failure) {
      setError(failure.message || 'The email address could not be changed.')
    } finally {
      setBusy('')
    }
  }

  const changePassword = async (event) => {
    event.preventDefault()
    if (!supabase) return
    if (newPassword.length < 8) {
      setError('Choose a password with at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('The new passwords do not match.')
      return
    }
    setBusy('password')
    setError('')
    setNotice('')
    try {
      const result = await supabase.auth.updateUser({ password: newPassword })
      if (result.error) throw result.error
      setNewPassword('')
      setConfirmPassword('')
      setNotice('Your password has been changed.')
    } catch (failure) {
      setError(failure.message || 'The password could not be changed.')
    } finally {
      setBusy('')
    }
  }

  return (
    <section className="account-settings">
      <div className="account-settings__heading">
        <div><p className="eyebrow">YOUR ACCOUNT</p><h2>Customize <em>account.</em></h2><p>Update how you appear in the Archive and keep your sign-in details current.</p></div>
        <WantedPosterAvatar avatarKey={avatarKey} size="large" />
      </div>
      {error && <div className="error-notice" role="alert">{error}</div>}
      {notice && <div className="success-notice" role="status"><Check size={15} /><span>{notice}</span></div>}

      <form className="account-settings__profile" onSubmit={saveProfile}>
        <div className="account-settings__section-title"><UserRound size={17} /><div><h3>Account name</h3><p>This is the name shown to the Archive team.</p></div></div>
        <label className="form-field"><span>Display name</span><input value={displayName} maxLength={80} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" required /></label>
        <WantedPosterPicker value={avatarKey} onChange={setAvatarKey} />
        <button className="button button--gold" type="submit" disabled={busy === 'profile'}><Save size={15} /> {busy === 'profile' ? 'Saving…' : 'Save account customization'}</button>
      </form>

      <div className="account-settings__security">
        <div className="account-settings__section-title"><Mail size={17} /><div><h3>Email address</h3><p>Current sign-in email: <strong>{user?.email || 'Not available'}</strong></p></div></div>
        <form onSubmit={changeEmail}>
          <label className="form-field"><span>New email address</span><input type="email" autoComplete="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} placeholder="new-address@example.com" required /></label>
          <button className="button button--outline" type="submit" disabled={busy === 'email'}>{busy === 'email' ? 'Requesting change…' : 'Change email address'}</button>
        </form>
        <p className="account-settings__hint"><ShieldCheck size={14} /> Supabase may require you to verify the new address (and, depending on project security settings, the current address) before the change takes effect.</p>
        <p className="account-settings__recovery">Forgot which email you used? <Link to="/account/recover-email">Request account email recovery</Link></p>
      </div>

      <div className="account-settings__security">
        <div className="account-settings__section-title"><KeyRound size={17} /><div><h3>Password</h3><p>Choose a new password for your account.</p></div></div>
        <form onSubmit={changePassword}>
          <label className="form-field"><span>New password</span><input type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /></label>
          <label className="form-field"><span>Confirm new password</span><input type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></label>
          <button className="button button--outline" type="submit" disabled={busy === 'password'}>{busy === 'password' ? 'Updating…' : 'Change password'}</button>
        </form>
        <p className="account-settings__recovery">Can't sign in? <button type="button" className="text-button" onClick={onForgotPassword}>Send a password reset email</button></p>
      </div>
    </section>
  )
}
