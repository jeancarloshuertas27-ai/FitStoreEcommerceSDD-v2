const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:3001/api';

async function request(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    if (!response.ok) {
      const err = new Error(data.message || data.error || 'Error en la petición al servidor');
      err.code = data.error || null;
      err.status = response.status;
      err.data = data;
      throw err;
    }
    return data;
  } catch (error) {
    console.error(`API Error en [${endpoint}]:`, error);
    throw error;
  }
}

export const api = {
  // Configuración de la tienda y cuentas de cobro
  getSettings: () => request('/settings'),
  updateSettings: (data) => request('/settings', { method: 'PUT', body: JSON.stringify(data) }),

  // Catálogo de Productos
  getProducts: (params = {}) => {
    const query = new URLSearchParams();
    if (params.category && params.category !== 'Todos') query.append('category', params.category);
    if (params.search) query.append('search', params.search);
    if (params.sort) query.append('sort', params.sort);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request(`/products${qs}`);
  },
  getProductById: (id) => request(`/products/${id}`),
  createProduct: (data) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id, data) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),

  // Usuarios y Autenticación de Clientes
  getUsers: () => request('/users'),
  getUserById: (id) => request(`/users/${id}`),
  updateUser: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  createUser: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  loginClient: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  registerClient: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  // Pedidos e Historial
  getUserOrders: (userId) => request(`/orders/user/${userId}`),
  getAllOrders: () => request('/orders'),
  getOrderById: (id) => request(`/orders/${id}`),
  createOrder: (data) => request('/orders', { method: 'POST', body: JSON.stringify(data) }),
  updateOrderStatus: (id, order_status) =>
    request(`/orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ order_status }) }),
  updatePaymentStatus: (id, payment_status) =>
    request(`/orders/${id}/payment`, { method: 'PUT', body: JSON.stringify({ payment_status }) }),

  // Verificación Automática de Pagos (Feature 004)
  autoVerifyPayment: (data) => request('/payments/auto-verify', { method: 'POST', body: JSON.stringify(data) }),
  getPaymentAudit: (orderCode) => request(`/payments/audit/${orderCode}`),
  cancelOrder: (id) => request(`/orders/${id}/cancel`, { method: 'POST' }),

  // Feature 007: Yape/Plin directo, Mercado Pago Checkout Pro y tarifas de envío
  payYapePlin: (data) => request('/payments/yape-plin', { method: 'POST', body: JSON.stringify(data) }),
  createPreference: (data) =>
    request('/payments/create-preference', { method: 'POST', body: JSON.stringify(data) }),
  createMercadoPagoPreference: (data) =>
    request('/payments/create-preference', { method: 'POST', body: JSON.stringify(data) }),
  verifyMercadoPago: (payload) => {
    const body =
      payload && typeof payload === 'object' ? payload : { payment_id: payload };
    return request('/payments/verify-mercadopago', { method: 'POST', body: JSON.stringify(body) });
  },
  getShippingRates: () => request('/shipping-rates'),
  getAdminShippingRates: () => request('/admin/shipping-rates'),
  createShippingRate: (data) => request('/admin/shipping-rates', { method: 'POST', body: JSON.stringify(data) }),
  updateShippingRate: (id, data) =>
    request(`/admin/shipping-rates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteShippingRate: (id) => request(`/admin/shipping-rates/${id}`, { method: 'DELETE' }),

  // FitBot Asesor (Cloudflare Workers AI + D1)
  askFitBot: (data) => request('/fitbot', { method: 'POST', body: JSON.stringify(data) }),
};

export default api;

