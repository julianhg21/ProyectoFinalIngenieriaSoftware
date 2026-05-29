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
  async getCategories() {
    const response = await client.get('/api/categories');
    return response.data;
  },
  async getProducts(search = '', categoryId = 0, includeInactive = false) {
    const response = await client.get('/api/products', { params: { search, categoryId, includeInactive } });
    return response.data;
  },
  async getSellerProducts(sellerId) {
    const response = await client.get('/api/products/seller/' + sellerId);
    return response.data;
  },
  async createProduct(product) {
    const response = await client.post('/api/products', product);
    return response.data;
  },
  async updateProduct(id, product) {
    const response = await client.put('/api/products/' + id, product);
    return response.data;
  },
  async changeProductStatus(id, isActive) {
    const response = await client.put('/api/products/' + id + '/status', { isActive });
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
  },
  async getSellerOrders(sellerId) {
    const response = await client.get('/api/orders/seller/' + sellerId);
    return response.data;
  },
  async updateOrderStatus(orderId, status) {
    const response = await client.put('/api/orders/' + orderId + '/status', { status });
    return response.data;
  },
  async getAdminUsers() {
    const response = await client.get('/api/admin/users');
    return response.data;
  },
  async changeUserStatus(id, isActive) {
    const response = await client.put('/api/admin/users/' + id + '/status', { isActive });
    return response.data;
  },
  async getAdminReport() {
    const response = await client.get('/api/admin/report');
    return response.data;
  }
};
