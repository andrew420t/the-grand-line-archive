import { useMemo, useState } from 'react'
import { ArrowRight, ClipboardList, LogOut, MessageCircle, RefreshCw, Settings2 } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AccountSettings from './AccountSettings'
import SupportMessages from '../SupportMessages'
import WantedPosterAvatar from './WantedPosterAvatar'

const money = (value) => new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
}).format(Number(value || 0))

const shortOrderReference = (id) => String(id || '').replace(/-/g, '').slice(-8).toUpperCase()

export default function AccountPage({
  user,
  profile,
  orders = [],
  orderItems = [],
  products = [],
  loading = false,
  error = '',
  onSignIn,
  onSignOut,
  onReload,
  onProfileUpdated,
  onForgotPassword,
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const [unreadCount, setUnreadCount] = useState(0)
  const activeTab = location.pathname === '/account/messages'
    ? 'messages'
    : location.pathname === '/account/settings'
      ? 'settings'
      : 'orders'
  const requestedOrderId = useMemo(
    () => new URLSearchParams(location.search).get('orderId') || '',
    [location.search],
  )

  if (!user) {
    return (
      <main className="page-width protected-page">
        <p className="eyebrow">YOUR ACCOUNT</p>
        <h1>Your collection,<br /><em>under your flag.</em></h1>
        <p>Sign in to see your orders, customize your wanted poster and message the Archive team.</p>
        <button className="button button--gold" type="button" onClick={onSignIn}>Sign in to continue <ArrowRight size={16} /></button>
        <p className="account-recovery-page__foot"><Link to="/account/recover-email">Forgot which email you used?</Link> · <Link to="/account/forgot-password">Forgot your password?</Link></p>
      </main>
    )
  }

  const displayName = profile?.display_name || user.user_metadata?.full_name || 'Archive member'
  const avatarKey = profile?.avatar_key || 'luffy'

  return (
    <main className="page-width account-page">
      <header className="account-page__hero">
        <WantedPosterAvatar avatarKey={avatarKey} size="large" />
        <div className="account-page__identity">
          <p className="eyebrow">YOUR ACCOUNT</p>
          <h1>{displayName}<br /><em>Captain of your collection.</em></h1>
          <p>{user.email}</p>
        </div>
        <button className="button button--outline account-page__signout" type="button" onClick={onSignOut}><LogOut size={14} /> Sign out</button>
      </header>

      <nav className="account-page__nav" aria-label="Account sections">
        <Link className={activeTab === 'orders' ? 'is-active' : ''} to="/account/orders"><ClipboardList size={15} /> My orders</Link>
        <Link className={activeTab === 'messages' ? 'is-active' : ''} to="/account/messages"><MessageCircle size={15} /> Messages {unreadCount > 0 && <span className="account-page__unread">{unreadCount}</span>}</Link>
        <Link className={activeTab === 'settings' ? 'is-active' : ''} to="/account/settings"><Settings2 size={15} /> Customize account</Link>
      </nav>

      {error && activeTab === 'orders' && <div className="error-notice" role="alert">{error}</div>}

      {activeTab === 'orders' && (
        <section className="account-page__content">
          <div className="account-page__section-heading">
            <div><p className="eyebrow">YOUR HAUL</p><h2>Order <em>log.</em></h2><p>Check your order status and arrange local pickup with the Archive team.</p></div>
            <button className="button button--outline" type="button" onClick={onReload} disabled={loading}><RefreshCw size={14} /> Refresh orders</button>
          </div>
          {loading ? <div className="loading-state"><span className="loader" />Loading your orders…</div> : orders.length ? (
            <div className="order-list">
              {orders.map((order) => {
                const items = orderItems.filter((item) => String(item.order_id) === String(order.id))
                return (
                  <article className="order-card" key={order.id}>
                    <div className="order-card__heading">
                      <div><span className="eyebrow">ORDER #{shortOrderReference(order.id)}</span><span>{order.created_at ? new Date(order.created_at).toLocaleString('en-GB') : 'Date not recorded'}</span></div>
                      <span className={`status-pill status-pill--${String(order.status || 'pending').toLowerCase()}`}>{order.status || 'Pending'}</span>
                    </div>
                    <div className="order-card__pickup"><span>LOCAL PICKUP · GIBRALTAR</span></div>
                    <div className="order-lines">
                      {items.map((item) => {
                        const product = products.find((entry) => String(entry.id) === String(item.product_id || item.card_id))
                        const name = product?.name || `Card ${item.product_id || item.card_id || ''}`
                        const amount = Number(item.unit_price ?? item.price_at_purchase ?? item.price ?? 0) * Number(item.quantity || 0)
                        return <div className="order-line" key={item.id || `${order.id}-${item.product_id || item.card_id}`}><span>{name} <small>× {item.quantity}</small></span><strong>{money(amount)}</strong></div>
                      })}
                    </div>
                    <div className="order-card__total"><span>Order total</span><strong>{money(order.total_amount ?? order.total ?? order.amount ?? 0)}</strong></div>
                    <div className="account-order__actions">
                      <button className="button button--gold" type="button" onClick={() => navigate(`/account/messages?orderId=${encodeURIComponent(order.id)}`)}><MessageCircle size={14} /> Message about this order <ArrowRight size={14} /></button>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="empty-orders"><ClipboardList size={28} /><h2>No orders just yet.</h2><p>Your next favorite card is out there.</p><Link className="button button--gold" to="/shop">Explore the archive <ArrowRight size={16} /></Link></div>
          )}
        </section>
      )}

      {activeTab === 'messages' && (
        <section className="account-page__content">
          <SupportMessages
            key={requestedOrderId || 'account-messages'}
            user={user}
            isAdmin={false}
            initialOrderId={requestedOrderId || null}
            onUnreadCountChange={setUnreadCount}
          />
        </section>
      )}

      {activeTab === 'settings' && (
        <section className="account-page__content">
          <AccountSettings user={user} profile={profile} onProfileUpdated={onProfileUpdated} onForgotPassword={onForgotPassword} />
        </section>
      )}
    </main>
  )
}
