import React from 'react';
import { Link } from 'react-router-dom';
import StatusMessage from '../components/StatusMessage.jsx';
import { useCart } from '../context/CartContext.jsx';

export default function CartPage() {
  const { cart, total, itemCount, cartMessage, setQuantity, removeFromCart } = useCart();

  return (
    <section>
      <div className="page-heading"><p className="eyebrow">YOUR ORDER</p><h1>Shopping cart</h1></div>
      <StatusMessage type={cartMessage.startsWith('Only') ? 'error' : 'info'}>{cartMessage}</StatusMessage>
      {cart.length === 0 ? (
        <div className="empty-state"><h2>Your cart is empty</h2><Link className="button" to="/">Browse products</Link></div>
      ) : (
        <div className="cart-layout">
          <div className="cart-items">
            {cart.map((item) => (
              <article className="cart-item" key={item.productId}>
                <div><h2>{item.name}</h2><p>₱{item.price.toLocaleString('en-PH')} each</p></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-start' }}>
                  <span style={{ fontSize: '0.85rem' }}>Qty:</span>
                  <button
                    type="button"
                    disabled={item.quantity <= 1}
                    onClick={() => setQuantity(item.productId, item.quantity - 1)}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={item.stock}
                    value={item.quantity}
                    onChange={(event) => setQuantity(item.productId, Number(event.target.value))}
                    style={{ width: '50px', textAlign: 'center' }}
                  />
                  <button
                    type="button"
                    disabled={item.quantity >= item.stock}
                    onClick={() => setQuantity(item.productId, item.quantity + 1)}
                  >
                    +
                  </button>
                </div>
                <strong>₱{(item.price * item.quantity).toLocaleString('en-PH')}</strong>
                <button className="danger" onClick={() => removeFromCart(item.productId)}>Remove</button>
              </article>
            ))}
          </div>
          <aside className="summary">
            <h2>Order summary</h2>
            <p><span>Items</span><strong>{itemCount}</strong></p>
            <p className="summary-total"><span>Total</span><strong>₱{total.toLocaleString('en-PH')}</strong></p>
            <Link className="button full" to="/checkout">Proceed to checkout</Link>
          </aside>
        </div>
      )}
    </section>
  );
}