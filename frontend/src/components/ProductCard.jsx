import React from 'react';
import { Link } from 'react-router-dom';

export default function ProductCard({ product, onAddToCart }) {
  let stockLabel;

  if (product.stock < 1) {
    stockLabel = 'Out of stock';
  } else if (product.stock <= 8) {
    stockLabel = `Only ${product.stock} left`;
  } else {
    stockLabel = `${product.stock} in stock`;
  }

  return (
    <article className="product-card">
      <div className="product-icon" aria-hidden="true">{product.emoji}</div>
      <p className="eyebrow">{product.category}</p>
      <h2>{product.name}</h2>
      <p className="product-description">{product.description}</p>
      <p className="price">₱{Number(product.price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
      <p className={product.stock > 0 ? 'stock' : 'stock unavailable'}>
        {stockLabel}
      </p>
      <div className="card-actions">
        <Link className="button secondary" to={`/products/${product.id}`}>Details</Link>
        <button disabled={product.stock < 1} onClick={() => onAddToCart(product)}>Add to cart</button>
      </div>
    </article>
  );
}