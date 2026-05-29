import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000'
});

export const apiExtra = {
  async updateCartItem(userId, productId, quantity) {
    const response = await client.put('/api/cart/items', { userId, productId, quantity });
    return response.data;
  },
  async clearCart(userId) {
    const response = await client.delete('/api/cart/' + userId);
    return response.data;
  },
  async checkoutFull(data) {
    const response = await client.post('/api/orders/checkout-full', data);
    return response.data;
  },
  async getOrderDetail(orderId) {
    const response = await client.get('/api/orders/' + orderId + '/detail');
    return response.data;
  },
  async getSellerSummary(sellerId) {
    const response = await client.get('/api/seller/' + sellerId + '/summary');
    return response.data;
  },
  async getAdminReportV2() {
    const response = await client.get('/api/admin/report-v2');
    return response.data;
  }
};
