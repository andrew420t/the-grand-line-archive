import { useCallback, useEffect, useState } from 'react'
import { Check, MessageCircle, RefreshCw, Send } from 'lucide-react'
import { supabase } from './lib/supabase'

const formatDate = (value) => value
  ? new Date(value).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  : 'Just now'

export default function OrderConversation({ order, user, isAdmin = false }) {
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const isClosed = ['completed', 'cancelled'].includes(String(order?.status || '').toLowerCase())

  const loadMessages = useCallback(async () => {
    if (!supabase || !order?.id) return
    setLoading(true)
    setError('')
    try {
      const result = await supabase
        .from('order_messages')
        .select('id,order_id,sender_id,sender_role,message,created_at')
        .eq('order_id', order.id)
        .order('created_at', { ascending: true })
      if (result.error) throw new Error(result.error.message)
      setMessages(result.data || [])
    } catch (failure) {
      setError(failure.message || 'Messages could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [order?.id])

  useEffect(() => { void loadMessages() }, [loadMessages])

  const sendMessage = async (event) => {
    event.preventDefault()
    const message = draft.trim()
    if (!message || message.length > 3000 || sending || isClosed || !supabase) return
    setSending(true)
    setError('')
    setNotice('')
    try {
      const result = await supabase.rpc('send_order_message', {
        p_order_id: order.id,
        p_message: message,
      })
      if (result.error) throw new Error(result.error.message)
      setDraft('')
      setNotice('Message sent.')
      await loadMessages()
    } catch (failure) {
      setError(failure.message || 'Your message could not be sent.')
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="order-conversation" aria-label="Order messages">
      <div className="order-conversation__heading">
        <div><p className="eyebrow"><MessageCircle size={13} /> ORDER MESSAGES</p><h3>Arrange your pickup.</h3></div>
        <button className="subtle-refresh" type="button" onClick={loadMessages} disabled={loading}><RefreshCw size={14} /> Refresh</button>
      </div>
      <p className="order-conversation__intro">Send a message to the Archive team about your Gibraltar local pickup. Replies appear here in your order.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      {notice && <p className="order-conversation__notice" role="status"><Check size={13} /> {notice}</p>}
      <div className="order-conversation__messages" aria-live="polite">
        {loading ? <p className="order-conversation__empty">Loading conversation…</p>
          : messages.length ? messages.map((message) => {
            const ownMessage = String(message.sender_id) === String(user?.id)
            const label = ownMessage ? 'You' : message.sender_role === 'admin' ? 'Grand Line Archive' : 'Customer'
            return (
              <article className={ownMessage ? 'order-message is-own' : 'order-message'} key={message.id}>
                <div className="order-message__meta"><strong>{label}</strong><time dateTime={message.created_at}>{formatDate(message.created_at)}</time></div>
                <p>{message.message}</p>
              </article>
            )
          }) : <p className="order-conversation__empty">No messages yet. The Archive team can use this thread to confirm your pickup arrangements.</p>}
      </div>
      {isClosed ? (
        <p className="order-conversation__closed">This order is {String(order.status).toLowerCase()}. The conversation is now closed.</p>
      ) : (
        <form className="order-conversation__composer" onSubmit={sendMessage}>
          <label className="sr-only" htmlFor={`order-message-${order.id}`}>Write a message about this order</label>
          <textarea id={`order-message-${order.id}`} rows="2" maxLength="3000" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={isAdmin ? 'Reply with pickup details or an update…' : 'Ask about pickup times or details…'} />
          <div className="order-conversation__send"><span>{draft.length}/3000</span><button className="button button--gold" type="submit" disabled={sending || !draft.trim()}>{sending ? 'Sending…' : 'Send message'} <Send size={14} /></button></div>
        </form>
      )}
    </section>
  )
}
