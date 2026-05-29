import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles.css';
import { api } from './services/api.js';

function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('catalog');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState(null);
  const [orders, setOrders] = useState([]);
  const [sellerProducts, setSellerProducts] = useState([]);
  const [sellerOrders, setSellerOrders] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [report, setReport] = useState(null);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState(0);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setProducts(await api.getProducts());
    setCategories(await api.getCategories());
  };

  const reloadCatalog = async () => {
    setProducts(await api.getProducts(search, categoryId));
  };

  const login = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const data = await api.login(form.get('email'), form.get('password'));
      setUser(data.user);
      setMessage('Bienvenido ' + data.user.fullName + ' (' + data.user.role + ')');
      if (data.user.role === 'Vendedor') {
        setActiveTab('seller');
        await loadSellerData(data.user.id);
      } else if (data.user.role === 'Administrador') {
        setActiveTab('admin');
        await loadAdminData();
      } else {
        setActiveTab('catalog');
        setCart(await api.getCart(data.user.id));
        setOrders(await api.getUserOrders(data.user.id));
      }
    } catch {
      setMessage('Credenciales incorrectas.');
    }
  };

  const quickLogin = (email) => {
    const form = document.getElementById('loginForm');
    form.email.value = email;
    form.password.value = 'Demo123';
  };

  const loadSellerData = async (sellerId = user?.id) => {
    if (!sellerId) return;
    setSellerProducts(await api.getSellerProducts(sellerId));
    setSellerOrders(await api.getSellerOrders(sellerId));
  };

  const loadAdminData = async () => {
    setAdminUsers(await api.getAdminUsers());
    setReport(await api.getAdminReport());
    setProducts(await api.getProducts('', 0, true));
  };

  const addToCart = async (productId) => {
    if (!user || user.role !== 'Cliente') {
      setMessage('Para comprar debes iniciar sesión como cliente.');
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
    setMessage('Pedido #' + response.id + ' confirmado por Q' + response.total + '.');
    setCart(await api.getCart(user.id));
    setOrders(await api.getUserOrders(user.id));
    setProducts(await api.getProducts(search, categoryId));
  };

  const createProduct = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await api.createProduct({
      name: form.get('name'),
      description: form.get('description'),
      price: Number(form.get('price')),
      stock: Number(form.get('stock')),
      imageUrl: form.get('imageUrl'),
      categoryId: Number(form.get('categoryId')),
      sellerId: user.id,
      isActive: true
    });
    event.currentTarget.reset();
    setMessage('Producto publicado correctamente.');
    await loadSellerData(user.id);
    setProducts(await api.getProducts());
  };

  const toggleProduct = async (product) => {
    await api.changeProductStatus(product.id, !product.isActive);
    setMessage('Estado del producto actualizado.');
    if (user.role === 'Vendedor') await loadSellerData(user.id);
    if (user.role === 'Administrador') await loadAdminData();
  };

  const updateOrderStatus = async (orderId, status) => {
    await api.updateOrderStatus(orderId, status);
    setMessage('Estado del pedido actualizado.');
    await loadSellerData(user.id);
  };

  const toggleUser = async (targetUser) => {
    await api.changeUserStatus(targetUser.id, !targetUser.isActive);
    setMessage('Estado del usuario actualizado.');
    await loadAdminData();
  };

  return (
    <div>
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark sticky-top">
        <div className="container">
          <span className="navbar-brand">Artesanos Market</span>
          <div className="navbar-text text-white">
            {user ? user.fullName + ' - ' + user.role : 'Sin sesión'}
          </div>
        </div>
      </nav>

      <main className="container py-4">
        <section className="hero p-4 mb-4 rounded shadow-sm">
          <h1>Marketplace de productos artesanales</h1>
          <p className="mb-0">MVP con vistas por rol: cliente, vendedor y administrador.</p>
        </section>

        {message && <div className="alert alert-info">{message}</div>}

        <div className="row g-4">
          <aside className="col-lg-3">
            <LoginCard login={login} quickLogin={quickLogin} />
            <Navigation user={user} activeTab={activeTab} setActiveTab={setActiveTab} />
          </aside>

          <section className="col-lg-9">
            {activeTab === 'catalog' && <Catalog products={products} categories={categories} search={search} setSearch={setSearch} categoryId={categoryId} setCategoryId={setCategoryId} reloadCatalog={reloadCatalog} addToCart={addToCart} />}
            {activeTab === 'cart' && <Cart cart={cart} checkout={checkout} />}
            {activeTab === 'orders' && <Orders orders={orders} />}
            {activeTab === 'seller' && <SellerPanel categories={categories} sellerProducts={sellerProducts} sellerOrders={sellerOrders} createProduct={createProduct} toggleProduct={toggleProduct} updateOrderStatus={updateOrderStatus} />}
            {activeTab === 'admin' && <AdminPanel report={report} users={adminUsers} products={products} toggleUser={toggleUser} toggleProduct={toggleProduct} />}
          </section>
        </div>
      </main>
    </div>
  );
}

function LoginCard({ login, quickLogin }) {
  return (
    <div className="card shadow-sm mb-4">
      <div className="card-body">
        <h2 className="h5">Inicio de sesión</h2>
        <form id="loginForm" onSubmit={login}>
          <label className="form-label">Correo</label>
          <input className="form-control mb-2" name="email" defaultValue="cliente@demo.com" />
          <label className="form-label">Contraseña</label>
          <input className="form-control mb-3" name="password" type="password" defaultValue="Demo123" />
          <button className="btn btn-primary w-100">Ingresar</button>
        </form>
        <div className="d-grid gap-2 mt-3">
          <button className="btn btn-sm btn-outline-secondary" onClick={() => quickLogin('cliente@demo.com')}>Usar cliente</button>
          <button className="btn btn-sm btn-outline-secondary" onClick={() => quickLogin('vendedor@demo.com')}>Usar vendedor</button>
          <button className="btn btn-sm btn-outline-secondary" onClick={() => quickLogin('admin@demo.com')}>Usar admin</button>
        </div>
      </div>
    </div>
  );
}

function Navigation({ user, activeTab, setActiveTab }) {
  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <h2 className="h6">Menú</h2>
        <div className="list-group">
          <button className={'list-group-item list-group-item-action ' + (activeTab === 'catalog' ? 'active' : '')} onClick={() => setActiveTab('catalog')}>Catálogo</button>
          {user?.role === 'Cliente' && <button className={'list-group-item list-group-item-action ' + (activeTab === 'cart' ? 'active' : '')} onClick={() => setActiveTab('cart')}>Carrito</button>}
          {user?.role === 'Cliente' && <button className={'list-group-item list-group-item-action ' + (activeTab === 'orders' ? 'active' : '')} onClick={() => setActiveTab('orders')}>Mis pedidos</button>}
          {user?.role === 'Vendedor' && <button className={'list-group-item list-group-item-action ' + (activeTab === 'seller' ? 'active' : '')} onClick={() => setActiveTab('seller')}>Panel vendedor</button>}
          {user?.role === 'Administrador' && <button className={'list-group-item list-group-item-action ' + (activeTab === 'admin' ? 'active' : '')} onClick={() => setActiveTab('admin')}>Panel admin</button>}
        </div>
      </div>
    </div>
  );
}

function Catalog({ products, categories, search, setSearch, categoryId, setCategoryId, reloadCatalog, addToCart }) {
  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="h4 mb-0">Catálogo</h2>
        <button className="btn btn-outline-primary" onClick={reloadCatalog}>Buscar</button>
      </div>
      <div className="row g-2 mb-4">
        <div className="col-md-8"><input className="form-control" placeholder="Buscar producto" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <div className="col-md-4">
          <select className="form-select" value={categoryId} onChange={e => setCategoryId(Number(e.target.value))}>
            <option value="0">Todas las categorías</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
      <div className="row g-3">
        {products.map(product => <ProductCard key={product.id} product={product} addToCart={addToCart} />)}
      </div>
    </>
  );
}

function ProductCard({ product, addToCart }) {
  return (
    <div className="col-md-6 col-xl-4">
      <div className="card h-100 shadow-sm product-card">
        <img src={product.imageUrl} className="card-img-top" alt={product.name} />
        <div className="card-body d-flex flex-column">
          <span className="badge text-bg-secondary align-self-start mb-2">{product.category}</span>
          <h3 className="h5">{product.name}</h3>
          <p className="small text-muted">{product.description}</p>
          <p className="fw-bold mb-1">Q{product.price}</p>
          <p className="small">Stock: {product.stock}</p>
          <button className="btn btn-outline-primary mt-auto" onClick={() => addToCart(product.id)}>Agregar al carrito</button>
        </div>
      </div>
    </div>
  );
}

function Cart({ cart, checkout }) {
  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <h2 className="h4">Carrito</h2>
        {!cart || cart.items.length === 0 ? <p>No hay productos agregados.</p> : (
          <>
            <ul className="list-group mb-3">
              {cart.items.map(item => <li className="list-group-item d-flex justify-content-between" key={item.productId}><span>{item.productName} x {item.quantity}</span><strong>Q{item.subtotal}</strong></li>)}
            </ul>
            <p>Total: <strong>Q{cart.total}</strong></p>
            <button className="btn btn-success" onClick={checkout}>Confirmar compra</button>
          </>
        )}
      </div>
    </div>
  );
}

function Orders({ orders }) {
  return <DataTable title="Mis pedidos" rows={orders} columns={['id', 'status', 'total', 'createdAt']} />;
}

function SellerPanel({ categories, sellerProducts, sellerOrders, createProduct, toggleProduct, updateOrderStatus }) {
  return (
    <div>
      <h2 className="h4 mb-3">Panel del vendedor</h2>
      <div className="card shadow-sm mb-4"><div className="card-body">
        <h3 className="h5">Publicar producto</h3>
        <form className="row g-3" onSubmit={createProduct}>
          <div className="col-md-6"><input className="form-control" name="name" placeholder="Nombre" required /></div>
          <div className="col-md-6"><input className="form-control" name="price" type="number" placeholder="Precio" required /></div>
          <div className="col-md-4"><input className="form-control" name="stock" type="number" placeholder="Stock" required /></div>
          <div className="col-md-4"><select className="form-select" name="categoryId">{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div className="col-md-4"><input className="form-control" name="imageUrl" placeholder="URL imagen" /></div>
          <div className="col-12"><textarea className="form-control" name="description" placeholder="Descripción" required /></div>
          <div className="col-12"><button className="btn btn-primary">Publicar</button></div>
        </form>
      </div></div>
      <h3 className="h5">Mis productos</h3>
      <ProductAdminTable products={sellerProducts} toggleProduct={toggleProduct} />
      <h3 className="h5 mt-4">Pedidos recibidos</h3>
      <table className="table table-striped"><thead><tr><th>Pedido</th><th>Estado</th><th>Total</th><th>Acción</th></tr></thead><tbody>{sellerOrders.map(o => <tr key={o.id}><td>#{o.id}</td><td>{o.status}</td><td>Q{o.total}</td><td><select className="form-select" value={o.status} onChange={e => updateOrderStatus(o.id, e.target.value)}><option>Confirmado</option><option>En preparación</option><option>Enviado</option><option>Entregado</option><option>Cancelado</option></select></td></tr>)}</tbody></table>
    </div>
  );
}

function AdminPanel({ report, users, products, toggleUser, toggleProduct }) {
  return (
    <div>
      <h2 className="h4 mb-3">Panel administrativo</h2>
      {report && <div className="row g-3 mb-4"><Metric label="Ventas" value={'Q' + report.totalSales} /><Metric label="Pedidos" value={report.totalOrders} /><Metric label="Usuarios" value={report.totalUsers} /><Metric label="Productos" value={report.totalProducts} /></div>}
      <h3 className="h5">Usuarios</h3>
      <table className="table table-striped"><thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{users.map(u => <tr key={u.id}><td>{u.fullName}</td><td>{u.email}</td><td>{u.role}</td><td>{u.isActive ? 'Activo' : 'Inactivo'}</td><td><button className="btn btn-sm btn-outline-warning" onClick={() => toggleUser(u)}>{u.isActive ? 'Desactivar' : 'Activar'}</button></td></tr>)}</tbody></table>
      <h3 className="h5 mt-4">Productos publicados</h3>
      <ProductAdminTable products={products} toggleProduct={toggleProduct} />
    </div>
  );
}

function ProductAdminTable({ products, toggleProduct }) {
  return <table className="table table-striped"><thead><tr><th>Producto</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{products.map(p => <tr key={p.id}><td>{p.name}</td><td>{p.category}</td><td>Q{p.price}</td><td>{p.stock}</td><td>{p.isActive ? 'Activo' : 'Inactivo'}</td><td><button className="btn btn-sm btn-outline-warning" onClick={() => toggleProduct(p)}>{p.isActive ? 'Desactivar' : 'Activar'}</button></td></tr>)}</tbody></table>;
}

function Metric({ label, value }) {
  return <div className="col-md-3"><div className="metric-card shadow-sm"><span>{label}</span><strong>{value}</strong></div></div>;
}

function DataTable({ title, rows, columns }) {
  return <div><h2 className="h4 mb-3">{title}</h2>{rows.length === 0 ? <p>No hay datos.</p> : <table className="table table-striped"><thead><tr>{columns.map(c => <th key={c}>{c}</th>)}</tr></thead><tbody>{rows.map(r => <tr key={r.id}>{columns.map(c => <td key={c}>{String(r[c])}</td>)}</tr>)}</tbody></table>}</div>;
}

createRoot(document.getElementById('root')).render(<App />);
