import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Mail, MessageCircle, Plus, RefreshCw, Send, ShieldAlert } from 'lucide-react'
import { supabase } from './lib/supabase'

const formatDate = (value) => value
  ? new Date(value).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  : 'Just now'

export default function SupportMessages({
  user,
  isAdmin = false,
  initialCustomerId = null,
  initialOrderId = null,
  onUnreadCountChange,
}) {
  const [conversations, setConversations] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [subject, setSubject] = useState('General enquiry')
  const [showNew, setShowNew] = useState(false)
  const [recoveryRequests, setRecoveryRequests] = useState([])
  const [view, setView] = useState('conversations')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const [unreadConversationIds, setUnreadConversationIds] = useState([])
  const [recoveryBusy, setRecoveryBusy] = useState('')

  const loadConversations = useCallback(async () => {
    if (!supabase || !user?.id) return
    const result = await supabase
      .from('support_conversations')
      .select('id,customer_id,order_id,customer_display_name,customer_email,subject,status,last_message_at,created_at,updated_at')
      .order('updated_at', { ascending: false })
    if (result.error) throw new Error(result.error.message)
    const rows = result.data || []
    setConversations(rows)
    return rows
  }, [user?.id])

  const loadUnread = useCallback(async () => {
    if (!supabase || !user?.id) return
    const result = await supabase
      .from('support_messages')
      .select('id,conversation_id')
      .neq('sender_id', user.id)
      .is('read_at', null)
    if (result.error) throw new Error(result.error.message)
    const unreadRows = result.data || []
    const count = unreadRows.length
    setUnreadConversationIds([...new Set(unreadRows.map((row) => String(row.conversation_id)))])
    setUnreadCount(count)
    onUnreadCountChange?.(count)
  }, [user?.id, onUnreadCountChange])

  const loadRecoveryRequests = useCallback(async () => {
    if (!isAdmin || !supabase) return
    const result = await supabase
      .from('account_recovery_requests')
      .select('id,display_name,contact_email,details,status,admin_response,created_at')
      .order('created_at', { ascending: false })
    if (result.error) throw new Error(result.error.message)
    setRecoveryRequests(result.data || [])
  }, [isAdmin])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      await Promise.all([loadConversations(), loadUnread(), isAdmin ? loadRecoveryRequests() : Promise.resolve()])
    } catch (failure) {
      setError(failure.message || 'Messages could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [loadConversations, loadUnread, loadRecoveryRequests, isAdmin])

  const openConversation = useCallback(async (conversationId) => {
    if (!supabase || !conversationId) return
    setSelectedId(String(conversationId))
    setError('')
    try {
      const result = await supabase
        .from('support_messages')
        .select('id,conversation_id,sender_id,sender_role,message,created_at,read_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
      if (result.error) throw new Error(result.error.message)
      setMessages(result.data || [])
      const marked = await supabase.rpc('mark_support_conversation_read', { p_conversation_id: conversationId })
      if (marked.error) throw new Error(marked.error.message)
      await loadUnread()
    } catch (failure) {
      setError(failure.message || 'The conversation could not be opened.')
    }
  }, [loadUnread])

  const openTarget = useCallback(async () => {
    if (!user?.id || !supabase || (!initialCustomerId && !initialOrderId)) return
    setOpening(true)
    setError('')
    try {
      const result = await supabase.rpc('get_or_create_support_conversation', {
        p_customer_id: isAdmin ? initialCustomerId : null,
        p_order_id: initialOrderId || null,
        p_subject: initialOrderId ? 'Order pickup and collection' : 'Message to the Archive',
      })
      if (result.error) throw new Error(result.error.message)
      await loadConversations()
      await openConversation(result.data)
      setView('conversations')
    } catch (failure) {
      setError(failure.message || 'A message conversation could not be started.')
    } finally {
      setOpening(false)
    }
  }, [user?.id, initialCustomerId, initialOrderId, isAdmin, loadConversations, openConversation])

  useEffect(() => { void refresh() }, [refresh])
  useEffect(() => {
    if (initialCustomerId || initialOrderId) void openTarget()
  }, [openTarget, initialCustomerId, initialOrderId])

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => String(conversation.id) === selectedId) || null,
    [conversations, selectedId],
  )

  const startNewConversation = async (event) => {
    event.preventDefault()
    if (!supabase || !user?.id || isAdmin) return
    setOpening(true)
    setError('')
    setNotice('')
    try {
      const result = await supabase.rpc('get_or_create_support_conversation', {
        p_customer_id: null,
        p_order_id: null,
        p_subject: subject.trim() || 'General enquiry',
      })
      if (result.error) throw new Error(result.error.message)
      setShowNew(false)
      await loadConversations()
      await openConversation(result.data)
      setNotice('Your message conversation is ready. Send your first message below.')
    } catch (failure) {
      setError(failure.message || 'A new conversation could not be started.')
    } finally {
      setOpening(false)
    }
  }

  const sendMessage = async (event) => {
    event.preventDefault()
    const value = draft.trim()
    if (!value || value.length > 3000 || sending || !selectedId || !supabase) return
    setSending(true)
    setError('')
    setNotice('')
    try {
      const result = await supabase.rpc('send_support_message', {
        p_conversation_id: selectedId,
        p_message: value,
      })
      if (result.error) throw new Error(result.error.message)
      setDraft('')
      await Promise.all([openConversation(selectedId), loadConversations()])
      setNotice('Message sent.')
    } catch (failure) {
      setError(failure.message || 'Your message could not be sent.')
    } finally {
      setSending(false)
    }
  }

  const updateRecoveryStatus = async (requestId, status) => {
    setRecoveryBusy(String(requestId))
    setError('')
    setNotice('')
    try {
      const result = await supabase
        .from('account_recovery_requests')
        .update({ status, resolved_at: status === 'resolved' || status === 'closed' ? new Date().toISOString() : null })
        .eq('id', requestId)
      if (result.error) throw new Error(result.error.message)
      await loadRecoveryRequests()
      setNotice('Recovery request updated.')
    } catch (failure) {
      setError(failure.message || 'The recovery request could not be updated.')
    } finally {
      setRecoveryBusy('')
    }
  }

  return (
    <section className="support-messages">
      <div className="support-messages__heading">
        <div><p className="eyebrow">{isAdmin ? 'CAPTAIN’S QUARTERS' : 'YOUR ACCOUNT'}</p><h2>{isAdmin ? 'Messages from the fleet.' : 'Message the Archive.'}</h2><p>{isAdmin ? 'Customer conversations and account recovery requests.' : 'Ask about cards, orders or local pickup in a private conversation.'}</p></div>
        <button className="button button--outline" type="button" onClick={refresh} disabled={loading}><RefreshCw size={14} /> Refresh</button>
      </div>

      {isAdmin && (
        <div className="support-messages__tabs" role="tablist" aria-label="Messages views">
          <button type="button" role="tab" aria-selected={view === 'conversations'} className={view === 'conversations' ? 'is-active' : ''} onClick={() => setView('conversations')}><MessageCircle size={14} /> Conversations {unreadCount > 0 && <span>{unreadCount}</span>}</button>
          <button type="button" role="tab" aria-selected={view === 'recovery'} className={view === 'recovery' ? 'is-active' : ''} onClick={() => setView('recovery')}><Mail size={14} /> Email recovery {recoveryRequests.filter((item) => item.status === 'pending').length > 0 && <span>{recoveryRequests.filter((item) => item.status === 'pending').length}</span>}</button>
        </div>
      )}

      {error && <div className="error-notice" role="alert"><ShieldAlert size={14} />{error}</div>}
      {notice && <div className="success-notice" role="status"><Check size={14} />{notice}</div>}

      {view === 'recovery' && isAdmin ? (
        <div className="recovery-request-list">
          {recoveryRequests.length ? recoveryRequests.map((request) => (
            <article className="recovery-request" key={request.id}>
              <div className="recovery-request__top"><div><strong>{request.display_name}</strong><span>{formatDate(request.created_at)}</span></div><label className="form-field"><span>Status</span><select value={request.status} disabled={recoveryBusy === String(request.id)} onChange={(event) => updateRecoveryStatus(request.id, event.target.value)}><option value="pending">Pending</option><option value="reviewing">Reviewing</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select></label></div>
              <a className="recovery-request__email" href={`mailto:${encodeURIComponent(request.contact_email)}?subject=${encodeURIComponent('Grand Line Archive account recovery')}`}><Mail size={13} /> {request.contact_email}</a>
              {request.details && <p>{request.details}</p>}
              <p className="admin-muted">The request does not reveal whether this contact matches an account. Verify ownership before discussing or changing sign-in details.</p>
            </article>
          )) : <div className="support-messages__empty"><Mail size={22} /><h3>No recovery requests.</h3><p>Forgot-email requests will appear here.</p></div>}
        </div>
      ) : view === 'conversations' && (
        <div className="support-inbox">
          <aside className="support-inbox__list">
            <div className="support-inbox__list-heading"><strong>{isAdmin ? 'Customer conversations' : 'Your conversations'}</strong>{!isAdmin && <button className="button button--gold" type="button" onClick={() => setShowNew((current) => !current)}><Plus size={13} /> New message</button>}</div>
            {showNew && (
              <form className="support-new-conversation" onSubmit={startNewConversation}>
                <label className="form-field"><span>Subject</span><input value={subject} maxLength={120} onChange={(event) => setSubject(event.target.value)} placeholder="General enquiry" /></label>
                <button className="button button--outline" type="submit" disabled={opening}>{opening ? 'Opening…' : 'Start conversation'}</button>
              </form>
            )}
            {loading || opening ? <p className="support-messages__empty">Loading messages…</p> : conversations.length ? conversations.map((conversation) => {
              const active = String(conversation.id) === selectedId
              const unread = unreadConversationIds.includes(String(conversation.id))
              const customerLabel = conversation.customer_display_name || `Customer ${String(conversation.customer_id).slice(0, 8)}`
              return (
                <button key={conversation.id} type="button" className={active ? 'support-thread-preview is-active' : 'support-thread-preview'} onClick={() => openConversation(conversation.id)}>
                  <span className="support-thread-preview__top"><strong>{isAdmin ? customerLabel : conversation.subject}</strong>{unread && <i />}</span>
                  <span>{isAdmin && conversation.customer_email ? conversation.customer_email : conversation.subject}</span>
                  <small>{conversation.order_id ? `Order #${String(conversation.order_id).replace(/-/g, '').slice(-8).toUpperCase()} · ` : ''}{formatDate(conversation.last_message_at)}</small>
                </button>
              )
            }) : <div className="support-messages__empty"><MessageCircle size={22} /><h3>No messages yet.</h3><p>{isAdmin ? 'Customer conversations will appear here.' : 'Start a conversation if you need help with your account, cards or an order.'}</p></div>}
          </aside>

          <section className="support-inbox__thread">
            {selectedConversation ? (
              <>
                <div className="support-inbox__thread-heading"><div><p className="eyebrow">{isAdmin ? selectedConversation.customer_email || 'CUSTOMER' : 'GRAND LINE ARCHIVE'}</p><h3>{isAdmin ? selectedConversation.customer_display_name || 'Customer conversation' : selectedConversation.subject}</h3>{selectedConversation.order_id && <small>Linked order #{String(selectedConversation.order_id).replace(/-/g, '').slice(-8).toUpperCase()}</small>}</div><span className={selectedConversation.status === 'open' ? 'support-status is-open' : 'support-status'}>{selectedConversation.status}</span></div>
                <div className="support-inbox__messages" aria-live="polite">
                  {messages.length ? messages.map((message) => {
                    const own = String(message.sender_id) === String(user?.id)
                    return <article className={own ? 'support-message is-own' : 'support-message'} key={message.id}><div><strong>{own ? 'You' : message.sender_role === 'admin' ? 'Grand Line Archive' : selectedConversation.customer_display_name || 'Customer'}</strong><time>{formatDate(message.created_at)}</time></div><p>{message.message}</p></article>
                  }) : <p className="support-messages__empty">No messages in this conversation yet.</p>}
                </div>
                {selectedConversation.status === 'open' ? (
                  <form className="support-inbox__composer" onSubmit={sendMessage}>
                    <textarea rows="3" maxLength="3000" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={isAdmin ? 'Reply to this customer…' : 'Write a message to the Archive…'} />
                    <div><small>{draft.length}/3000</small><button className="button button--gold" type="submit" disabled={sending || !draft.trim()}>{sending ? 'Sending…' : 'Send message'} <Send size={14} /></button></div>
                  </form>
                ) : <p className="support-messages__closed">This conversation is closed.</p>}
              </>
            ) : <div className="support-messages__empty"><MessageCircle size={26} /><h3>Select a conversation.</h3><p>{isAdmin ? 'Choose a customer on the left, or open a conversation from an order.' : 'Choose a message thread or start a new one.'}</p></div>}
          </section>
        </div>
      )}
    </section>
  )
}
