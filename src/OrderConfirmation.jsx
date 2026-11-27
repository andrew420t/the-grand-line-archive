import { Anchor, ArrowRight, CheckCircle2, MapPin, MessageCircle, X } from 'lucide-react'

const money = (value) => new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
}).format(Number(value || 0))

export default function OrderConfirmation({ confirmation, onClose, onViewOrder }) {
  if (!confirmation) return null
  return (
    <div className="order-confirmation-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="order-confirmation" role="dialog" aria-modal="true" aria-labelledby="order-confirmation-title">
        <button className="icon-button order-confirmation__close" type="button" onClick={onClose} aria-label="Close order confirmation"><X size={19} /></button>
        <div className="order-confirmation__seal"><CheckCircle2 size={30} /></div>
        <p className="eyebrow">THE ARCHIVE HAS RECEIVED YOUR ORDER</p>
        <h2 id="order-confirmation-title">Congratulations.<br /><em>Your order is in.</em></h2>
        <p className="order-confirmation__lead">Thank you for choosing Grand Line Archive. Your cards are reserved and your order request is now with our team.</p>
        <div className="order-confirmation__reference">
          <span>ORDER REFERENCE</span>
          <strong>#{confirmation.reference}</strong>
          <span className="status-pill status-pill--pending">Pending confirmation</span>
        </div>
        <div className="order-confirmation__items">
          {confirmation.items.map((item) => (
            <div className="order-confirmation__item" key={item.productId}>
              <span>{item.name} <small>× {item.quantity}</small></span>
              <strong>{money(item.unitPrice * item.quantity)}</strong>
            </div>
          ))}
          <div className="order-confirmation__total"><span>Order total</span><strong>{money(confirmation.total)}</strong></div>
        </div>
        <div className="order-confirmation__pickup">
          <MapPin size={18} />
          <div><strong>Local pickup · Gibraltar</strong><p>We’ll arrange a convenient pickup time with you through the messages in your order. Please wait for the Archive team to confirm the details.</p></div>
        </div>
        <p className="order-confirmation__payment">No online payment has been taken. This is an order request; payment and collection are arranged directly with the Archive.</p>
        <div className="order-confirmation__actions">
          <button className="button button--gold button--wide" type="button" onClick={onViewOrder}>View order & messages <MessageCircle size={15} /> <ArrowRight size={15} /></button>
          <button className="button button--outline button--wide" type="button" onClick={onClose}><Anchor size={15} /> Continue browsing</button>
        </div>
      </section>
    </div>
  )
}
