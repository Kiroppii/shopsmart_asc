import React, { createContext, useContext, useMemo, useState } from 'react';
import {
  addProductToCart,
  calculateCartItemCount,
  calculateCartTotal,
  updateCartQuantity
} from '../utils/cart.js';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [cartMessage, setCartMessage] = useState('');

  function addToCart(product) {
    setCart((currentCart) => {
      const result = addProductToCart(currentCart, product);
      setCartMessage(result.error || `${product.name} was added to your cart.`);
      return result.cart;
    });
  }

  function setQuantity(productId, quantity) {
    setCart((currentCart) => {
      const result = updateCartQuantity(currentCart, productId, quantity);
      setCartMessage(result.error);
      return result.cart;
    });
  }

  function removeFromCart(productId) {
    setCart((currentCart) => currentCart.filter((item) => item.productId !== productId));
    setCartMessage('Item removed from cart.');
  }

  function clearCart() {
    setCart([]);
    setCartMessage('');
  }

  const value = useMemo(() => ({
    cart,
    cartMessage,
    itemCount: calculateCartItemCount(cart),
    total: calculateCartTotal(cart),
    addToCart,
    setQuantity,
    removeFromCart,
    clearCart
  }), [cart, cartMessage]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside CartProvider.');
  return context;
}