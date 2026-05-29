import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles.css';
import { api } from './services/api.js';

function App() {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState(null);
  const [orders, setOrders] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const data = await api.getProducts();
    setProducts(data);
  };

  const login = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const data = await api.login(form.get('email'), form.get('password'));
      setUser(data.user);
      setMessage(`Bienvenido ${data.user.fullName}`);
      const cartData = await api.getCart(data.user.id);
      setCart(cartData);
      const orderData = await api.getUserOrders(data.user.id);
      setOrders(orderData);
    } catch {
      setMessage('Credenciales incorrectas. Prueba cliente@demo.com / Demo123');
    }
  };

  const addToCart = async (productId) => {
    if (!user) {
      setMessage('Primero debes iniciar sesión.');
      return;
    }
    await api.addToCart(user.id, productId, 1);
    setCart(await api.getCart(user.id));
    setMessage('Producto agregado al carrito.');
  };

  const checkout = async () => {
    if (!user || !cart || cart.items.length === 0) {
      setMessage('No hay productos en el carrito.');
      return;
    }
    const response = await api.checkout(user.id, 'Ciudad de Guatemala, Guatemala', 'Pago mock');
    setMessage(`Pedido #${response.id} confirmado por Q${response.total}.`);
    setCart(await api.getCart(user.id));
    setOrders(await api.getUserOrders(user.id));
  };

  return (
    <div>
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
        <div className="container">
          <span className="navbar-brand">Artesanos Market</span>
          <span className="navbar-text">E-commerce MVP</span>
        </div>
      </nav>

      <main className="container py-4">
        <section className="hero p-4 mb-4 rounded">
          <h1>Productos artesanales de Guatemala</h1>
          <p className="mb-0">Catálogo, carrito, checkout y pedidos conectados con la API .NET.</p>
        </section>

        {message && <div className="alert alert-info">{message}</div>}

        <div className="row g-4">
          <section className="col-lg-4">
            <div className="card shadow-sm">
              <div className="card-body">
                <h2 className="h5">Inicio de sesión</h2>
                <form onSubmit={login}>
                  <label className="form-label">Correo</label>
                  <input className="form-control mb-2" name="email" defaultValue="cliente@demo.com" />
                  <label className="form-label">Contraseña</label>
                  <input className="form-control mb-3" name="password" type="password" defaultValue="Demo123" />
                  <button className="btn btn-primary w-100">Ingresar</button>
                </form>
                {user && <p className="mt-3 mb-0">Sesión activa: <strong>{user.fullName}</strong></p>}
              </div>
            </div>

            <div className="card shadow-sm mt-4">
              <div className="card-body">
                <h2 className="h5">Carrito</h2>
                {!cart || cart.items.length === 0 ? <p>No hay productos agregados.</p> : (
                  <>
                    <ul className="list-group mb-3">
                      {cart.items.map(item => (
                        <li className="list-group-item d-flex justify-content-between" key={item.productId}>
                          <span>{item.productName} x {item.quantity}</span>
                          <strong>Q{item.subtotal}</strong>
                        </li>
                      ))}
                    </ul>
                    <p>Total: <strong>Q{cart.total}</strong></p>
                    <button className="btn btn-success w-100" onClick={checkout}>Confirmar compra</button>
                  </>
                )}
              </div>
            </div>
          </section>

          <section className="col-lg-8">
            <h2 className="h4 mb-3">Catálogo</h2>
            <div className="row g-3">
              {products.map(product => (
                <div className="col-md-6" key={product.id}>
                  <div className="card h-100 shadow-sm">
                    <img src={product.imageUrl} className="card-img-top" alt={product.name} />
                    <div className="card-body d-flex flex-column">
                      <span className="badge text-bg-secondary align-self-start mb-2">{product.category}</span>
                      <h3 className="h5">{product.name}</h3>
                      <p>{product.description}</p>
                      <p className="fw-bold">Q{product.price}</p>
                      <button className="btn btn-outline-primary mt-auto" onClick={() => addToCart(product.id)}>Agregar al carrito</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <h2 className="h4 mt-5 mb-3">Historial de pedidos</h2>
            {orders.length === 0 ? <p>Aún no hay pedidos.</p> : (
              <table className="table table-striped">
                <thead><tr><th>Pedido</th><th>Estado</th><th>Total</th><th>Fecha</th></tr></thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.id}>
                      <td>#{order.id}</td>
                      <td>{order.status}</td>
                      <td>Q{order.total}</td>
                      <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
