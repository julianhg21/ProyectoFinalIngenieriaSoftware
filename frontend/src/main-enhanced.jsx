import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles.css';
import { api } from './services/api.js';
import { apiExtra } from './services/apiExtra.js';

function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('catalog');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState(null);
  const [orders, setOrders] = useState([]);
  const [sellerProducts, setSellerProducts] = useState([]);
  const [sellerOrders, setSellerOrders] = useState([]);
  const [sellerSummary, setSellerSummary] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [report, setReport] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [message, setMessage] = useState('');
  const [filters, setFilters] = useState({ search: '', categoryId: 0 });

  useEffect(() => { loadInitial(); }, []);

  async function loadInitial() {
    setCategories(await api.getCategories());
    setProducts(await api.getProducts());
  }

  async function login(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      const data = await api.login(f.get('email'), f.get('password'));
      setUser(data.user);
      setMessage('Sesión iniciada: ' + data.user.fullName + ' - ' + data.user.role);
      if (data.user.role === 'Cliente') { setTab('catalog'); await loadClient(data.user.id); }
      if (data.user.role === 'Vendedor') { setTab('seller'); await loadSeller(data.user.id); }
      if (data.user.role === 'Administrador') { setTab('admin'); await loadAdmin(); }
    } catch { setMessage('No se pudo iniciar sesión.'); }
  }

  async function register(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await api.register(f.get('fullName'), f.get('email'), f.get('password'), f.get('role'));
      e.currentTarget.reset();
      setMessage('Usuario registrado. Ahora puede iniciar sesión.');
    } catch { setMessage('No se pudo registrar el usuario.'); }
  }

  async function loadClient(id = user?.id) {
    if (!id) return;
    setCart(await api.getCart(id));
    setOrders(await api.getUserOrders(id));
  }

  async function loadSeller(id = user?.id) {
    if (!id) return;
    setSellerProducts(await api.getSellerProducts(id));
    setSellerOrders(await api.getSellerOrders(id));
    setSellerSummary(await apiExtra.getSellerSummary(id));
  }

  async function loadAdmin() {
    setAdminUsers(await api.getAdminUsers());
    setReport(await apiExtra.getAdminReportV2());
    setProducts(await api.getProducts('', 0, true));
  }

  async function searchProducts() {
    setProducts(await api.getProducts(filters.search, filters.categoryId));
  }

  async function addToCart(productId) {
    if (!user || user.role !== 'Cliente') { setMessage('Inicia sesión como cliente para comprar.'); return; }
    await api.addToCart(user.id, productId, 1);
    await loadClient(user.id);
    setMessage('Producto agregado al carrito.');
  }

  async function changeQty(item, delta) {
    const quantity = item.quantity + delta;
    await apiExtra.updateCartItem(user.id, item.productId, quantity);
    await loadClient(user.id);
  }

  async function emptyCart() {
    await apiExtra.clearCart(user.id);
    await loadClient(user.id);
  }

  async function checkout(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const res = await apiExtra.checkoutFull({ userId: user.id, shippingAddress: f.get('address'), phone: f.get('phone'), paymentMethod: f.get('paymentMethod'), notes: f.get('notes') });
    setMessage('Pedido #' + res.id + ' confirmado. Total Q' + res.total);
    await loadClient(user.id);
    await searchProducts();
  }

  async function showOrder(id) {
    setSelectedOrder(await apiExtra.getOrderDetail(id));
  }

  async function saveProduct(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const product = { name: f.get('name'), description: f.get('description'), price: Number(f.get('price')), stock: Number(f.get('stock')), imageUrl: f.get('imageUrl'), categoryId: Number(f.get('categoryId')), sellerId: user.id, isActive: true };
    if (editingProduct) await api.updateProduct(editingProduct.id, { ...product, isActive: editingProduct.isActive });
    else await api.createProduct(product);
    setEditingProduct(null); e.currentTarget.reset(); await loadSeller(user.id); await searchProducts(); setMessage('Producto guardado.');
  }

  async function toggleProduct(product) {
    await api.changeProductStatus(product.id, !product.isActive);
    if (user.role === 'Vendedor') await loadSeller(user.id);
    if (user.role === 'Administrador') await loadAdmin();
  }

  async function changeStatus(orderId, status) {
    await api.updateOrderStatus(orderId, status);
    await loadSeller(user.id);
    setMessage('Estado del pedido actualizado.');
  }

  async function toggleUser(u) {
    await api.changeUserStatus(u.id, !u.isActive);
    await loadAdmin();
  }

  return <div>
    <nav className="navbar navbar-dark bg-dark sticky-top"><div className="container"><span className="navbar-brand">Artesanos Market</span><span className="navbar-text text-white">{user ? user.fullName + ' - ' + user.role : 'Sin sesión'}</span></div></nav>
    <main className="container py-4">
      <section className="hero p-4 mb-4 rounded shadow-sm"><h1>Marketplace artesanal</h1><p className="mb-0">Cliente, vendedor y administrador en un solo MVP.</p></section>
      {message && <div className="alert alert-info">{message}</div>}
      <div className="row g-4">
        <aside className="col-lg-3"><AuthBox login={login} register={register} /><Menu user={user} tab={tab} setTab={setTab} /></aside>
        <section className="col-lg-9">
          {tab === 'catalog' && <Catalog products={products} categories={categories} filters={filters} setFilters={setFilters} searchProducts={searchProducts} addToCart={addToCart} setSelectedProduct={setSelectedProduct} />}
          {tab === 'cart' && <Cart cart={cart} changeQty={changeQty} emptyCart={emptyCart} checkout={checkout} />}
          {tab === 'orders' && <Orders orders={orders} showOrder={showOrder} />}
          {tab === 'seller' && <Seller categories={categories} products={sellerProducts} orders={sellerOrders} summary={sellerSummary} saveProduct={saveProduct} setEditingProduct={setEditingProduct} editingProduct={editingProduct} toggleProduct={toggleProduct} changeStatus={changeStatus} showOrder={showOrder} />}
          {tab === 'admin' && <Admin report={report} users={adminUsers} products={products} toggleUser={toggleUser} toggleProduct={toggleProduct} />}
        </section>
      </div>
    </main>
    {selectedProduct && <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} addToCart={addToCart} />}
    {selectedOrder && <OrderModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
  </div>;
}

function AuthBox({ login, register }) {
  const [mode, setMode] = useState('login');
  return <div className="card shadow-sm mb-4"><div className="card-body"><div className="btn-group w-100 mb-3"><button className="btn btn-outline-primary" onClick={() => setMode('login')}>Login</button><button className="btn btn-outline-primary" onClick={() => setMode('register')}>Registro</button></div>{mode === 'login' ? <form onSubmit={login}><input className="form-control mb-2" name="email" placeholder="correo" defaultValue="cliente@demo.com" /><input className="form-control mb-3" name="password" type="password" placeholder="clave" defaultValue="Demo123" /><button className="btn btn-primary w-100">Entrar</button><small className="text-muted d-block mt-2">cliente, vendedor o admin con clave Demo123</small></form> : <form onSubmit={register}><input className="form-control mb-2" name="fullName" placeholder="Nombre" /><input className="form-control mb-2" name="email" placeholder="Correo" /><input className="form-control mb-2" name="password" type="password" placeholder="Clave" /><select className="form-select mb-3" name="role"><option>Cliente</option><option>Vendedor</option></select><button className="btn btn-success w-100">Registrar</button></form>}</div></div>;
}

function Menu({ user, tab, setTab }) { return <div className="card shadow-sm"><div className="card-body"><h2 className="h6">Menú</h2><div className="list-group"><Btn t="catalog" tab={tab} setTab={setTab} text="Catálogo" />{user?.role === 'Cliente' && <><Btn t="cart" tab={tab} setTab={setTab} text="Carrito" /><Btn t="orders" tab={tab} setTab={setTab} text="Mis pedidos" /></>}{user?.role === 'Vendedor' && <Btn t="seller" tab={tab} setTab={setTab} text="Panel vendedor" />}{user?.role === 'Administrador' && <Btn t="admin" tab={tab} setTab={setTab} text="Panel admin" />}</div></div></div>; }
function Btn({ t, tab, setTab, text }) { return <button className={'list-group-item list-group-item-action ' + (tab === t ? 'active' : '')} onClick={() => setTab(t)}>{text}</button>; }

function Catalog({ products, categories, filters, setFilters, searchProducts, addToCart, setSelectedProduct }) { return <><div className="d-flex justify-content-between mb-3"><h2>Catálogo</h2><button className="btn btn-outline-primary" onClick={searchProducts}>Buscar</button></div><div className="row g-2 mb-4"><div className="col-md-8"><input className="form-control" value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} placeholder="Buscar producto" /></div><div className="col-md-4"><select className="form-select" value={filters.categoryId} onChange={e => setFilters({ ...filters, categoryId: Number(e.target.value) })}><option value="0">Todas</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div></div><div className="row g-3">{products.map(p => <div className="col-md-6 col-xl-4" key={p.id}><div className="card h-100 shadow-sm product-card"><img src={p.imageUrl} className="card-img-top" /><div className="card-body d-flex flex-column"><span className="badge text-bg-secondary align-self-start mb-2">{p.category}</span><h3 className="h5">{p.name}</h3><p className="small text-muted">{p.description}</p><p><strong>Q{p.price}</strong> | Stock {p.stock}</p><button className="btn btn-outline-secondary mb-2" onClick={() => setSelectedProduct(p)}>Detalle</button><button className="btn btn-primary mt-auto" onClick={() => addToCart(p.id)}>Agregar</button></div></div></div>)}</div></>; }

function Cart({ cart, changeQty, emptyCart, checkout }) { return <div className="card shadow-sm"><div className="card-body"><h2>Carrito</h2>{!cart || cart.items.length === 0 ? <p>Carrito vacío.</p> : <><ul className="list-group mb-3">{cart.items.map(i => <li className="list-group-item" key={i.productId}><div className="d-flex justify-content-between"><span>{i.productName}</span><strong>Q{i.subtotal}</strong></div><div className="btn-group mt-2"><button className="btn btn-sm btn-outline-secondary" onClick={() => changeQty(i, -1)}>-</button><button className="btn btn-sm btn-light">{i.quantity}</button><button className="btn btn-sm btn-outline-secondary" onClick={() => changeQty(i, 1)}>+</button><button className="btn btn-sm btn-outline-danger" onClick={() => changeQty(i, -999)}>Eliminar</button></div></li>)}</ul><p>Total: <strong>Q{cart.total}</strong></p><CheckoutForm checkout={checkout} /><button className="btn btn-outline-danger mt-2" onClick={emptyCart}>Vaciar carrito</button></>}</div></div>; }
function CheckoutForm({ checkout }) { return <form className="row g-2" onSubmit={checkout}><div className="col-md-6"><input className="form-control" name="address" placeholder="Dirección de entrega" required /></div><div className="col-md-6"><input className="form-control" name="phone" placeholder="Teléfono" required /></div><div className="col-md-6"><select className="form-select" name="paymentMethod"><option>Pago mock</option><option>Tarjeta sandbox</option><option>Contra entrega</option></select></div><div className="col-md-6"><input className="form-control" name="notes" placeholder="Observaciones" /></div><div className="col-12"><button className="btn btn-success">Confirmar compra</button></div></form>; }
function Orders({ orders, showOrder }) { return <Table title="Mis pedidos" rows={orders} showOrder={showOrder} />; }
function Seller({ categories, products, orders, summary, saveProduct, editingProduct, setEditingProduct, toggleProduct, changeStatus, showOrder }) { return <><h2>Panel vendedor</h2>{summary && <div className="row g-3 mb-4"><Metric label="Total vendido" value={'Q' + summary.totalSold} /><Metric label="Unidades" value={summary.unitsSold} /></div>}<ProductForm categories={categories} saveProduct={saveProduct} editingProduct={editingProduct} /><h3 className="h5 mt-4">Mis productos</h3><ProductAdmin products={products} toggleProduct={toggleProduct} edit={setEditingProduct} /><h3 className="h5 mt-4">Pedidos recibidos</h3><OrderAdmin orders={orders} changeStatus={changeStatus} showOrder={showOrder} /></>; }
function ProductForm({ categories, saveProduct, editingProduct }) { return <div className="card shadow-sm"><div className="card-body"><h3 className="h5">{editingProduct ? 'Editar producto' : 'Publicar producto'}</h3><form className="row g-2" onSubmit={saveProduct}><input type="hidden" name="id" value={editingProduct?.id || ''} /><div className="col-md-6"><input className="form-control" name="name" placeholder="Nombre" defaultValue={editingProduct?.name || ''} required /></div><div className="col-md-3"><input className="form-control" name="price" type="number" defaultValue={editingProduct?.price || ''} placeholder="Precio" required /></div><div className="col-md-3"><input className="form-control" name="stock" type="number" defaultValue={editingProduct?.stock || ''} placeholder="Stock" required /></div><div className="col-md-4"><select className="form-select" name="categoryId" defaultValue={editingProduct?.categoryId || 1}>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div className="col-md-8"><input className="form-control" name="imageUrl" defaultValue={editingProduct?.imageUrl || ''} placeholder="URL imagen" /></div><div className="col-12"><textarea className="form-control" name="description" defaultValue={editingProduct?.description || ''} placeholder="Descripción" required /></div><div className="col-12"><button className="btn btn-primary">Guardar</button></div></form></div></div>; }
function Admin({ report, users, products, toggleUser, toggleProduct }) { return <><h2>Panel administrativo</h2>{report && <div className="row g-3 mb-4"><Metric label="Ventas" value={'Q' + report.totalSales} /><Metric label="Pedidos" value={report.totalOrders} /><Metric label="Usuarios" value={report.totalUsers} /><Metric label="Productos" value={report.totalProducts} /></div>}<h3 className="h5">Productos más vendidos</h3>{report?.topProducts?.map(p => <div className="alert alert-light" key={p.productId}>{p.name}: {p.quantitySold} unidades | Q{p.totalSold}</div>)}<h3 className="h5">Usuarios</h3><table className="table table-striped"><tbody>{users.map(u => <tr key={u.id}><td>{u.fullName}</td><td>{u.role}</td><td>{u.isActive ? 'Activo' : 'Inactivo'}</td><td><button className="btn btn-sm btn-warning" onClick={() => toggleUser(u)}>{u.isActive ? 'Desactivar' : 'Activar'}</button></td></tr>)}</tbody></table><h3 className="h5">Productos</h3><ProductAdmin products={products} toggleProduct={toggleProduct} /></>; }
function ProductAdmin({ products, toggleProduct, edit }) { return <table className="table table-striped"><thead><tr><th>Producto</th><th>Precio</th><th>Stock</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{products.map(p => <tr key={p.id}><td>{p.name}</td><td>Q{p.price}</td><td>{p.stock}</td><td>{p.isActive ? 'Activo' : 'Inactivo'}</td><td>{edit && <button className="btn btn-sm btn-outline-primary me-1" onClick={() => edit(p)}>Editar</button>}<button className="btn btn-sm btn-outline-warning" onClick={() => toggleProduct(p)}>{p.isActive ? 'Desactivar' : 'Activar'}</button></td></tr>)}</tbody></table>; }
function OrderAdmin({ orders, changeStatus, showOrder }) { return <table className="table table-striped"><tbody>{orders.map(o => <tr key={o.id}><td>#{o.id}</td><td>{o.status}</td><td>Q{o.total}</td><td><select className="form-select" value={o.status} onChange={e => changeStatus(o.id, e.target.value)}><option>Confirmado</option><option>En preparación</option><option>Enviado</option><option>Entregado</option><option>Cancelado</option></select></td><td><button className="btn btn-sm btn-outline-secondary" onClick={() => showOrder(o.id)}>Detalle</button></td></tr>)}</tbody></table>; }
function Table({ title, rows, showOrder }) { return <><h2>{title}</h2><table className="table table-striped"><tbody>{rows.map(r => <tr key={r.id}><td>#{r.id}</td><td>{r.status}</td><td>Q{r.total}</td><td><span className="badge text-bg-info">{r.status}</span></td><td><button className="btn btn-sm btn-outline-secondary" onClick={() => showOrder(r.id)}>Detalle</button></td></tr>)}</tbody></table></>; }
function Metric({ label, value }) { return <div className="col-md-3"><div className="metric-card shadow-sm"><span>{label}</span><strong>{value}</strong></div></div>; }
function ProductModal({ product, onClose, addToCart }) { return <Modal onClose={onClose}><img src={product.imageUrl} className="img-fluid rounded mb-3" /><h2>{product.name}</h2><p>{product.description}</p><p>Categoría: {product.category}</p><p>Precio: <strong>Q{product.price}</strong></p><p>Stock disponible: {product.stock}</p><button className="btn btn-primary" onClick={() => addToCart(product.id)}>Agregar al carrito</button></Modal>; }
function OrderModal({ order, onClose }) { return <Modal onClose={onClose}><h2>Pedido #{order.id}</h2><p>Estado: <span className="badge text-bg-info">{order.status}</span></p><p>Total: Q{order.total}</p><p>{order.shippingAddress}</p><p>Pago: {order.paymentMethod} - {order.paymentStatus}</p><ul className="list-group">{order.items?.map(i => <li className="list-group-item d-flex justify-content-between" key={i.productId}><span>{i.productName} x {i.quantity}</span><strong>Q{i.subtotal}</strong></li>)}</ul></Modal>; }
function Modal({ children, onClose }) { return <div className="modal-backdrop-custom"><div className="modal-card shadow-lg"><button className="btn btn-sm btn-outline-danger float-end" onClick={onClose}>Cerrar</button>{children}</div></div>; }

createRoot(document.getElementById('root')).render(<App />);
