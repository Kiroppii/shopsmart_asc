export function findCartItem(cart, productId) {
  return cart.find((item) => item.productId === productId);
}

export function calculateItemSubtotal(item) {
  return item.price * item.quantity;
}

export function calculateCartTotal(cart) {
  return cart.reduce((total, item) => total + calculateItemSubtotal(item), 0);
}

export function addProductToCart(cart, product) {
  const existingItem = findCartItem(cart, product.id);
  const currentQuantity = existingItem?.quantity ?? 0;

  if (currentQuantity >= product.stock) {
    return { cart, error: `Only ${product.stock} unit(s) of ${product.name} are available.` };
  }

  if (existingItem) {
    return {
      cart: cart.map((item) =>
        item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ),
      error: ''
    };
  }

  return {
    cart: [...cart, {
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      stock: product.stock,
      quantity: 1
    }],
    error: ''
  };
}

export function updateCartQuantity(cart, productId, quantity) {
  const item = findCartItem(cart, productId);
  if (!item) return { cart, error: 'Cart item could not be found.' };
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { cart, error: 'Quantity must be a whole number greater than zero.' };
  }
  if (quantity > item.stock) {
    return { cart, error: `Only ${item.stock} unit(s) are available.` };
  }
  return {
    cart: cart.map((current) => current.productId === productId ? { ...current, quantity } : current),
    error: ''
  };
}

export function calculateCartItemCount(cart) {
  return cart.reduce((count, item) => count + item.quantity, 0);
}