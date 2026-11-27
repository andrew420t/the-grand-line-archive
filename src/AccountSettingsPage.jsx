import { useState } from 'react'
import { ArrowLeft, Check, LockKeyhole, Mail, Save, ShieldAlert, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from './lib/supabase'

const AVATARS = [
  ['luffy','Monkey D. Luffy','Straw Hat crew'],['zoro','Roronoa Zoro','Straw Hat crew'],
  ['nami','Nami','Straw Hat crew'],['usopp','Usopp','Straw Hat crew'],
  ['sanji','Sanji','Straw Hat crew'],['chopper','Tony Tony Chopper','Straw Hat crew'],
  ['robin','Nico Robin','Straw Hat crew'],['franky','Franky','Straw Hat crew'],
  ['brook','Brook','Straw Hat crew'],['jinbe','Jinbe','Straw Hat crew'],
  ['law','Trafalgar Law','Allies'],['kid','Eustass Kid','Allies'],
  ['shanks','Shanks','Yonko'],['blackbeard','Blackbeard','Yonko'],
  ['buggy','Buggy','Yonko'],['whitebeard','Whitebeard','Yonko'],
  ['kaido','Kaido','Yonko'],['big-mom','Big Mom','Yonko'],
  ['mihawk','Dracule Mihawk','Warlords'],['crocodile','Crocodile','Warlords'],
  ['boa','Boa Hancock','Warlords'],['doflamingo','Donquixote Doflamingo','Warlords'],
  ['kuma','Bartholomew Kuma','Warlords'],['moria','Gecko Moria','Warlords'],
  ['jinbe-warlord','Jinbe','Warlords'],['akainu','Akainu','Admirals'],
  ['aokiji','Aokiji','Admirals'],['kizaru','Kizaru','Admirals'],
  ['fujitora','Fujitora','Admirals'],['ryokugyu','Ryokugyu','Admirals'],
]
const GROUPS = ['Straw Hat crew','Allies','Admirals','Warlords','Yonko']

export default function AccountSettingsPage({ user }) {
  const metadata = user?.user_metadata || {}
  const [name,setName] = useState(metadata.full_name || metadata.name || '')
  const [email,setEmail] = useState(user?.email || '')
  const [newPassword,setNewPassword] = useState('')
  const [currentPassword,setCurrentPassword] = useState('')
  const [avatar,setAvatar] = useState(metadata.avatar_key || 'luffy')
  const [group,setGroup] = useState('Straw Hat crew')
  const [busy,setBusy] = useState('')
  const [notice,setNotice] = useState('')
  const [error,setError] = useState('')
  const run = async (key, task) => {
    setBusy(key); setNotice(''); setError('')
    try { const result = await task(); if (result?.error) throw result.error; setNotice(result?.message || 'Your account settings have been updated.') }
    catch (failure) { setError(failure.message || 'The request could not be completed.') }
    finally { setBusy('') }
  }
  if (!user) return <main className="page-width protected-page"><h1>Sign in required.</h1><p>Sign in to manage your account.</p><Link className="button button--gold" to="/account/orders">Back to orders</Link></main>
  return <main className="page-width account-page account-settings-page">
    <div className="account-heading"><div><p className="eyebrow">YOUR ACCOUNT</p><h1>Account <em>settings.</em></h1><p>{user.email}</p></div><Link className="button button--outline" to="/account/orders"><ArrowLeft size={15}/> Orders</Link></div>
    {notice && <p className="success-notice"><Check size={15}/>{notice}</p>}
    {error && <p className="error-notice"><ShieldAlert size={15}/>{error}</p>}
    <section className="admin-view">
      <h2>Account details</h2>
      <label className="form-field"><span>Account name</span><input value={name} onChange={e=>setName(e.target.value)} autoComplete="name"/></label>
      <button className="button button--gold" disabled={!!busy || !name.trim()} onClick={()=>run('name',()=>supabase.auth.updateUser({data:{...metadata,full_name:name.trim(),name:name.trim()}}))}>{busy==='name'?'Saving…':'Save account name'} <Save size={15}/></button>
      <div className="divider"/>
      <h3>Change email address</h3>
      <label className="form-field"><span>New email address</span><input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label>
      <button className="button button--outline" disabled={!!busy || !email.trim() || email===user.email} onClick={()=>run('email',()=>supabase.auth.updateUser({email:email.trim()}))}>{busy==='email'?'Sending…':'Request email change'} <Mail size={15}/></button>
      <p className="admin-muted">Supabase will send a verification link before the new email becomes active.</p>
      <div className="divider"/>
      <h3>Change password</h3>
      <label className="form-field"><span>Current password</span><input type="password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} autoComplete="current-password"/></label>
      <label className="form-field"><span>New password</span><input type="password" minLength={8} value={newPassword} onChange={e=>setNewPassword(e.target.value)} autoComplete="new-password"/></label>
      <button className="button button--outline" disabled={!!busy || !currentPassword || newPassword.length<8} onClick={()=>run('password',async()=>{const check=await supabase.auth.signInWithPassword({email:user.email,password:currentPassword});if(check.error)throw check.error;return supabase.auth.updateUser({password:newPassword})})}>{busy==='password'?'Updating…':'Update password'} <LockKeyhole size={15}/></button>
      <p className="admin-muted">Forgot your password? <button className="text-link" type="button" disabled={!!busy} onClick={()=>run('reset',()=>supabase.auth.resetPasswordForEmail(user.email,{redirectTo:window.location.origin+'/account/settings'}).then(result=>({...result,message:'Password reset instructions have been sent if the account email is eligible.'})))}>Send a password reset email</button></p>
      <p className="admin-muted">Forgot which email you used? For privacy, the site cannot reveal account email addresses. Contact the archive administrator for identity-verified assistance.</p>
    </section>
    <section className="admin-view">
      <div className="admin-view-heading"><div><p className="eyebrow">CUSTOMIZE ACCOUNT</p><h2>Wanted poster avatar.</h2><p className="admin-muted">Choose a character poster style. Your selection is saved to your account profile.</p></div></div>
      <div className="shop-filter-field"><span>Poster collection</span><select value={group} onChange={e=>setGroup(e.target.value)}>{GROUPS.map(item=><option key={item}>{item}</option>)}</select></div>
      <div className="wanted-avatar-grid">{AVATARS.filter(item=>item[2]===group).map(([key,label])=><button type="button" key={key} className={avatar===key?'wanted-avatar is-selected':'wanted-avatar'} onClick={()=>setAvatar(key)} aria-pressed={avatar===key}><span className="wanted-avatar__top">WANTED</span><span className="wanted-avatar__portrait"><UserRound size={28}/></span><strong>{label}</strong><small>DEAD OR ALIVE</small></button>)}</div>
      <button className="button button--gold" disabled={!!busy} onClick={()=>run('avatar',()=>supabase.auth.updateUser({data:{...metadata,avatar_key:avatar}}))}>{busy==='avatar'?'Saving…':'Save avatar'} <Save size={15}/></button>
    </section>
    <section className="admin-view">
      <h2>Forgotten email recovery</h2>
      <p>For account security, email addresses cannot be looked up or disclosed through a public form. Contact the administrator and provide enough information to verify ownership. Never send your password.</p>
    </section>
  </main>
}
