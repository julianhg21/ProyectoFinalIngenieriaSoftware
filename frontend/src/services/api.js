import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000'
});

export const api = {
  async login(email, password) {
    const response = await client.post('/api/auth/login', { email, password });
    return response.data;
  },
  async register(fullName, email, password, role = 'Cliente') {
    const response = await client.post('/api/auth/register', { fullName, email, password, role });
    return response.data;
  },
  async getProducts() {
    const response = await client.get('/api/products');
    return response.data;
  },
  async addToCart(userId, productId, quantity) {
    const response = await client.post('/api/cart/items', { userId, productId, quantity });
    return response.data;
  },
  async getCart(userId) {
    const response = await client.get('/api/cart/' + userId);
    return response.data;
  },
  async checkout(userId, shippingAddress, paymentMethod) {
    const response = await client.post('/api/orders/checkout', { userId, shippingAddress, paymentMethod });
    return response.data;
  },
  async getUserOrders(userId) {
    const response = await client.get('/api/orders/user/' + userId);
    return response.data;
  }
};
