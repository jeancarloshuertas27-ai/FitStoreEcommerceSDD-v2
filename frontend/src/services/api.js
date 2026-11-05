const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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
      throw new Error(data.error || 'Error en la petición al servidor');
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

  // Usuarios y Clientes
  getUsers: () => request('/users'),
  getUserById: (id) => request(`/users/${id}`),
  updateUser: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  createUser: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),

  // Pedidos e Historial
  getUserOrders: (userId) => request(`/orders/user/${userId}`),
  getAllOrders: () => request('/orders'),
  getOrderById: (id) => request(`/orders/${id}`),
  createOrder: (data) => request('/orders', { method: 'POST', body: JSON.stringify(data) }),
};

export default api;

