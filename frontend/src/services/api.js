const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

async function request(path, options = {}) {
  const { timeoutMs, ...fetchOptions } = options;
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...fetchOptions,
      headers: { 'Content-Type': 'application/json', ...fetchOptions.headers },
      ...(timeoutMs ? { signal: AbortSignal.timeout(timeoutMs) } : {})
    });
  } catch (caught) {
    const timedOut = caught?.name === 'TimeoutError' || caught?.name === 'AbortError';
    const error = new Error(timedOut
      ? 'ShopSmart took too long to answer. Please try again in a moment.'
      : 'Could not reach the ShopSmart server. Check your connection and try again.');
    error.code = timedOut ? 'CLIENT_TIMEOUT' : 'NETWORK_ERROR';
    throw error;
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.error?.message || `Request failed with status ${response.status}.`;
    const error = new Error(message);
    error.status = response.status;
    error.code = data?.error?.code;
    throw error;
  }
  return data;
}

export const api = {
  getProducts: (query = '') => request(`/products${query ? `?search=${encodeURIComponent(query)}` : ''}`),
  getProduct: (id) => request(`/products/${id}`),
  createOrder: (order) => request('/orders', { method: 'POST', body: JSON.stringify(order) }),
  // The server waits at most ~8 s for the AI provider; 20 s here guarantees loading always ends.
  askAssistant: (question) => request('/assistant/questions', {
    method: 'POST', body: JSON.stringify({ question }), timeoutMs: 20_000
  })
};
