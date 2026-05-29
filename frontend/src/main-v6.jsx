import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles.css';
import { api } from './services/api.js';
import { apiExtra } from './services/apiExtra.js';

const emptyProduct = { name: '', description: '', price: '', stock: '', imageUrl: '', categoryId: 1 };

function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('catalog');
  const [message, setMessage] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState(null);
  const [orders, setOrders] = useState([]);
  const [sellerProducts, setSellerProducts] = useState([]);
  const [sellerOrders, setSellerOrders] = useState([]);
  const [sellerSummary, setSellerSummary] = useState(null);
  const [sellerNotice, setSellerNotice] = useState('');
  const [adminUsers, setAdminUsers] = useState([]);
  const [report, setReport] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [filters, setFilters] = useState({ search: '', categoryId: 0 });

  useEffect(() => { api.getCategories().then(setCategories).catch(() => setCategories([])); }, []);
  useEffect(() => { if (!message) return; const timer = setTimeout(() => setMessage(''), 3000); return () => clearTimeout(timer); }, [message]);
  useEffect(() => { if (!sellerNotice) return; const timer = setTimeout(() => setSellerNotice(''), 3000); return () => clearTimeout(timer); }, [sellerNotice]);

  async function login(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const data = await api.login(form.get('email'), form.get('password'));
      setUser(data.user);
      setMessage('Sesión iniciada correctamente.');
      const loadedProducts = await api.getProducts();
      setProducts(loadedProducts);
      if (data.user.role === 'Cliente') { setTab('catalog'); await loadClient(data.user.id); }
      if (data.user.role === 'Vendedor') { setTab('seller'); await loadSeller(data.user.id); }
      if (data.user.role === 'Administrador') { setTab('admin'); await loadAdmin(); }
    } catch {
      setMessage('Credenciales incorrectas o usuario inactivo.');
    }
  }

  async function register(event) {
    event.preventDefault();
    if (isRegistering) return;

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const fullName = String(form.get('fullName') || '').trim();
    const email = String(form.get('email') || '').trim();
    const pass = String(form.get('password') || '').trim();
    const role = String(form.get('role') || 'Cliente').trim();

    if (!fullName || !email || !pass) {
      setMessage('Complete todos los campos antes de registrarse.');
      return;
    }

    setIsRegistering(true);

    try {
      await api.register(fullName, email, pass, role);
      formElement.reset();
      setMessage('Usuario registrado correctamente. Ahora puede iniciar sesión.');
    } catch (error) {
      const backendMessage = error?.response?.data?.message || error?.message;
      if (backendMessage === 'El correo ya existe.') {
        setMessage('El correo ya existe. Inicie sesión o use otro correo.');
      } else {
        setMessage(backendMessage || 'No se pudo registrar el usuario.');
      }
    } finally {
      setTimeout(() => setIsRegistering(false), 1200);
    }
  }

  function logout() {
    setUser(null); setTab('catalog'); setProducts([]); setCart(null); setOrders([]);
    setSellerProducts([]); setSellerOrders([]); setSellerSummary(null); setSellerNotice('');
    setAdminUsers([]); setReport(null); setSelectedProduct(null); setSelectedOrder(null); setEditingProduct(null);
    setMessage('Sesión cerrada.');
  }

  async function loadProducts() { setProducts(await api.getProducts(filters.search, filters.categoryId)); }
  async function loadClient(id = user?.id) { if (!id) return; setCart(await api.getCart(id)); setOrders(await api.getUserOrders(id)); }
  async function loadSeller(id = user?.id) {
    if (!id) return;
    const [ps, os, sum] = await Promise.all([api.getSellerProducts(id), api.getSellerOrders(id), apiExtra.getSellerSummary(id)]);
    setSellerProducts(ps); setSellerOrders(os); setSellerSummary(sum);
  }
  async function loadAdmin() { setAdminUsers(await api.getAdminUsers()); setReport(await apiExtra.getAdminReportV2()); setProducts(await api.getProducts('', 0, true)); }

  async function saveProduct(productForm, resetForm) {
    setSellerNotice('Guardando producto...');
    try {
      const payload = {
        name: productForm.name.trim(), description: productForm.description.trim(), price: Number(productForm.price),
        stock: Number(productForm.stock), imageUrl: productForm.imageUrl.trim(), categoryId: Number(productForm.categoryId),
        sellerId: user.id, isActive: editingProduct?.isActive ?? true
      };
      if (editingProduct) { await api.updateProduct(editingProduct.id, payload); setSellerNotice('Producto actualizado correctamente.'); }
      else { await api.createProduct(payload); setSellerNotice('Producto agregado correctamente.'); }
      setEditingProduct(null); resetForm(); await loadSeller(user.id); await loadProducts();
    } catch { setSellerNotice('No se pudo guardar el producto.'); }
  }

  function cancelEdit(resetForm) { setEditingProduct(null); resetForm(); setSellerNotice('Edición cancelada.'); }
  async function toggleProduct(product) { await api.changeProductStatus(product.id, !product.isActive); user.role === 'Administrador' ? await loadAdmin() : await loadSeller(user.id); }
  async function updateOrderStatus(orderId, status) { await api.updateOrderStatus(orderId, status); await loadSeller(user.id); setMessage('Estado del pedido actualizado.'); }
  async function toggleUser(targetUser) { await api.changeUserStatus(targetUser.id, !targetUser.isActive); await loadAdmin(); }
  async function addToCart(productId) { if (user.role !== 'Cliente') return setMessage('Solo clientes pueden comprar.'); await api.addToCart(user.id, productId, 1); await loadClient(user.id); setMessage('Producto agregado al carrito.'); }
  async function changeQty(item, delta) { await apiExtra.updateCartItem(user.id, item.productId, item.quantity + delta); await loadClient(user.id); }
  async function emptyCart() { await apiExtra.clearCart(user.id); await loadClient(user.id); setMessage('Carrito vacío.'); }
  async function checkout(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await apiExtra.checkoutFull({ userId: user.id, shippingAddress: form.get('address'), phone: form.get('phone'), paymentMethod: form.get('paymentMethod'), notes: form.get('notes') });
    setMessage('Pedido #' + res.id + ' confirmado. Total Q' + res.total); await loadClient(user.id); await loadProducts();
  }
  async function showOrder(orderId) { setSelectedOrder(await apiExtra.getOrderDetail(orderId)); }

  if (!user) return <AuthScreen login={login} register={register} message={message} isRegistering={isRegistering} />;

  return <div>
    <nav className="navbar navbar-dark bg-dark sticky-top"><div className="container"><span className="navbar-brand">Artesanos Market</span><div className="d-flex align-items-center gap-3"><span className="navbar-text text-white">{user.fullName} - {user.role}</span><button className="btn btn-outline-light btn-sm" onClick={logout}>Cerrar sesión</button></div></div></nav>
    <main className="container py-4">
      <section className="hero p-4 mb-4 rounded shadow-sm"><h1>Marketplace artesanal</h1><p className="mb-0">Panel activo para {user.role}.</p></section>
      {message && <div className="alert alert-info">{message}</div>}
      <div className="row g-4"><aside className="col-lg-3"><Menu user={user} tab={tab} setTab={setTab} /></aside><section className="col-lg-9">
        {tab === 'catalog' && <Catalog products={products} categories={categories} filters={filters} setFilters={setFilters} loadProducts={loadProducts} addToCart={addToCart} setSelectedProduct={setSelectedProduct} />}
        {tab === 'cart' && <Cart cart={cart} changeQty={changeQty} emptyCart={emptyCart} checkout={checkout} />}
        {tab === 'orders' && <Orders orders={orders} showOrder={showOrder} />}
        {tab === 'seller' && <SellerPanel categories={categories} products={sellerProducts} orders={sellerOrders} summary={sellerSummary} notice={sellerNotice} saveProduct={saveProduct} editingProduct={editingProduct} setEditingProduct={setEditingProduct} cancelEdit={cancelEdit} toggleProduct={toggleProduct} updateOrderStatus={updateOrderStatus} showOrder={showOrder} />}
        {tab === 'admin' && <AdminPanel report={report} users={adminUsers} products={products} toggleUser={toggleUser} toggleProduct={toggleProduct} />}
      </section></div>
    </main>
    {selectedProduct && <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} addToCart={addToCart} />}
    {selectedOrder && <OrderModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
  </div>;
}

function AuthScreen({ login, register, message, isRegistering }) {
  const [mode, setMode] = useState('login');
  return <main className="login-page"><section className="login-card shadow-lg"><div className="login-brand"><span className="login-logo">AM</span><div><h1>Artesanos Market</h1><p>Marketplace para artesanos y productores locales</p></div></div>{message && <div className="alert alert-info py-2">{message}</div>}<div className="btn-group w-100 mb-4"><button className={'btn ' + (mode === 'login' ? 'btn-primary' : 'btn-outline-primary')} onClick={() => setMode('login')}>Iniciar sesión</button><button className={'btn ' + (mode === 'register' ? 'btn-primary' : 'btn-outline-primary')} onClick={() => setMode('register')}>Registrarse</button></div>{mode === 'login' ? <LoginForm login={login} /> : <RegisterForm register={register} isRegistering={isRegistering} />}<div className="demo-users mt-4"><p className="fw-bold mb-2">Usuarios demo</p><span>cliente@demo.com</span><span>vendedor@demo.com</span><span>admin@demo.com</span><small>Clave para todos: Demo123</small></div></section></main>;
}
function LoginForm({ login }) { return <form onSubmit={login}><label className="form-label">Correo</label><input className="form-control form-control-lg mb-3" name="email" defaultValue="cliente@demo.com" /><label className="form-label">Contraseña</label><input className="form-control form-control-lg mb-4" name="password" type="password" defaultValue="Demo123" /><button className="btn btn-primary btn-lg w-100">Entrar</button></form>; }
function RegisterForm({ register, isRegistering }) { return <form onSubmit={register}><input className="form-control mb-3" name="fullName" placeholder="Nombre completo" required /><input className="form-control mb-3" name="email" placeholder="Correo electrónico" required /><input className="form-control mb-3" name="password" type="password" placeholder="Contraseña" required /><select className="form-select mb-4" name="role"><option>Cliente</option><option>Vendedor</option></select><button className="btn btn-success btn-lg w-100" disabled={isRegistering}>{isRegistering ? 'Creando cuenta...' : 'Crear cuenta'}</button></form>; }
function Menu({ user, tab, setTab }) { return <div className="card shadow-sm"><div className="card-body"><h2 className="h6">Menú</h2><div className="list-group"><MenuButton id="catalog" tab={tab} setTab={setTab} text="Catálogo" />{user.role === 'Cliente' && <><MenuButton id="cart" tab={tab} setTab={setTab} text="Carrito" /><MenuButton id="orders" tab={tab} setTab={setTab} text="Mis pedidos" /></>}{user.role === 'Vendedor' && <MenuButton id="seller" tab={tab} setTab={setTab} text="Panel vendedor" />}{user.role === 'Administrador' && <MenuButton id="admin" tab={tab} setTab={setTab} text="Panel admin" />}</div></div></div>; }
function MenuButton({ id, tab, setTab, text }) { return <button className={'list-group-item list-group-item-action ' + (tab === id ? 'active' : '')} onClick={() => setTab(id)}>{text}</button>; }
function Catalog({ products, categories, filters, setFilters, loadProducts, addToCart, setSelectedProduct }) { return <><div className="d-flex justify-content-between mb-3"><h2>Catálogo</h2><button className="btn btn-outline-primary" onClick={loadProducts}>Buscar</button></div><div className="row g-2 mb-4"><div className="col-md-8"><input className="form-control" value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} placeholder="Buscar producto" /></div><div className="col-md-4"><select className="form-select" value={filters.categoryId} onChange={e => setFilters({ ...filters, categoryId: Number(e.target.value) })}><option value="0">Todas las categorías</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div></div><div className="row g-3">{products.map(p => <div className="col-md-6 col-xl-4" key={p.id}><div className="card h-100 shadow-sm product-card"><img src={p.imageUrl} className="card-img-top" alt={p.name} /><div className="card-body d-flex flex-column"><span className="badge text-bg-secondary align-self-start mb-2">{p.category}</span><h3 className="h5">{p.name}</h3><p className="small text-muted">{p.description}</p><p><strong>Q{p.price}</strong> | Stock {p.stock}</p><button className="btn btn-outline-secondary mb-2" onClick={() => setSelectedProduct(p)}>Detalle</button><button className="btn btn-primary mt-auto" onClick={() => addToCart(p.id)}>Agregar</button></div></div></div>)}</div></>; }
function SellerPanel({ categories, products, orders, summary, notice, saveProduct, editingProduct, setEditingProduct, cancelEdit, toggleProduct, updateOrderStatus, showOrder }) { return <><h2>Panel vendedor</h2>{notice && <div className="alert alert-success">{notice}</div>}{summary && <div className="row g-3 mb-4"><Metric label="Total vendido" value={'Q' + summary.totalSold} /><Metric label="Unidades" value={summary.unitsSold} /></div>}<ProductForm categories={categories} saveProduct={saveProduct} editingProduct={editingProduct} cancelEdit={cancelEdit} /><h3 className="h5 mt-4">Mis productos</h3><ProductAdminTable products={products} toggleProduct={toggleProduct} edit={setEditingProduct} /><h3 className="h5 mt-4">Pedidos recibidos</h3><OrderAdminTable orders={orders} updateOrderStatus={updateOrderStatus} showOrder={showOrder} /></>; }
function ProductForm({ categories, saveProduct, editingProduct, cancelEdit }) { const [form, setForm] = useState(emptyProduct); useEffect(() => { editingProduct ? setForm({ name: editingProduct.name || '', description: editingProduct.description || '', price: editingProduct.price || '', stock: editingProduct.stock || '', imageUrl: editingProduct.imageUrl || '', categoryId: editingProduct.categoryId || 1 }) : setForm(emptyProduct); }, [editingProduct]); const change = e => setForm({ ...form, [e.target.name]: e.target.value }); const resetForm = () => setForm(emptyProduct); return <div className="card shadow-sm"><div className="card-body"><div className="d-flex justify-content-between align-items-center mb-3"><h3 className="h5 mb-0">{editingProduct ? 'Editar producto' : 'Publicar producto'}</h3>{editingProduct && <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => cancelEdit(resetForm)}>Cancelar</button>}</div><form className="row g-2" onSubmit={e => { e.preventDefault(); saveProduct(form, resetForm); }}><div className="col-md-6"><input className="form-control" name="name" value={form.name} onChange={change} placeholder="Nombre" required /></div><div className="col-md-3"><input className="form-control" name="price" type="number" value={form.price} onChange={change} placeholder="Precio" required /></div><div className="col-md-3"><input className="form-control" name="stock" type="number" value={form.stock} onChange={change} placeholder="Stock" required /></div><div className="col-md-4"><select className="form-select" name="categoryId" value={form.categoryId} onChange={change}>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div className="col-md-8"><input className="form-control" name="imageUrl" value={form.imageUrl} onChange={change} placeholder="URL imagen" /></div><div className="col-12"><textarea className="form-control" name="description" value={form.description} onChange={change} placeholder="Descripción" required /></div><div className="col-12"><button className="btn btn-primary">{editingProduct ? 'Actualizar producto' : 'Agregar producto'}</button></div></form></div></div>; }
function ProductAdminTable({ products, toggleProduct, edit }) { return <table className="table table-striped"><thead><tr><th>Producto</th><th>Precio</th><th>Stock</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{products.map(p => <tr key={p.id}><td>{p.name}</td><td>Q{p.price}</td><td>{p.stock}</td><td>{p.isActive ? 'Activo' : 'Inactivo'}</td><td>{edit && <button className="btn btn-sm btn-outline-primary me-1" onClick={() => edit(p)}>Editar</button>}<button className="btn btn-sm btn-outline-warning" onClick={() => toggleProduct(p)}>{p.isActive ? 'Desactivar' : 'Activar'}</button></td></tr>)}</tbody></table>; }
function OrderAdminTable({ orders, updateOrderStatus, showOrder }) { return <table className="table table-striped"><tbody>{orders.map(o => <tr key={o.id}><td>#{o.id}</td><td>Q{o.total}</td><td><select className="form-select" value={o.status} onChange={e => updateOrderStatus(o.id, e.target.value)}><option>Confirmado</option><option>En preparación</option><option>Enviado</option><option>Entregado</option><option>Cancelado</option></select></td><td><button className="btn btn-sm btn-outline-secondary" onClick={() => showOrder(o.id)}>Detalle</button></td></tr>)}</tbody></table>; }
function Cart({ cart, changeQty, emptyCart, checkout }) { return <div className="card shadow-sm"><div className="card-body"><h2>Carrito</h2>{!cart || cart.items.length === 0 ? <p>Carrito vacío.</p> : <><ul className="list-group mb-3">{cart.items.map(i => <li className="list-group-item" key={i.productId}><div className="d-flex justify-content-between"><span>{i.productName}</span><strong>Q{i.subtotal}</strong></div><div className="btn-group mt-2"><button className="btn btn-sm btn-outline-secondary" onClick={() => changeQty(i, -1)}>-</button><button className="btn btn-sm btn-light">{i.quantity}</button><button className="btn btn-sm btn-outline-secondary" onClick={() => changeQty(i, 1)}>+</button><button className="btn btn-sm btn-outline-danger" onClick={() => changeQty(i, -999)}>Eliminar</button></div></li>)}</ul><p>Total: <strong>Q{cart.total}</strong></p><CheckoutForm checkout={checkout} /><button className="btn btn-outline-danger mt-2" onClick={emptyCart}>Vaciar carrito</button></>}</div></div>; }
function CheckoutForm({ checkout }) { return <form className="row g-2" onSubmit={checkout}><div className="col-md-6"><input className="form-control" name="address" placeholder="Dirección de entrega" required /></div><div className="col-md-6"><input className="form-control" name="phone" placeholder="Teléfono" required /></div><div className="col-md-6"><select className="form-select" name="paymentMethod"><option>Pago mock</option><option>Tarjeta sandbox</option><option>Contra entrega</option></select></div><div className="col-md-6"><input className="form-control" name="notes" placeholder="Observaciones" /></div><div className="col-12"><button className="btn btn-success">Confirmar compra</button></div></form>; }
function Orders({ orders, showOrder }) { return <><h2>Mis pedidos</h2><table className="table table-striped"><tbody>{orders.map(o => <tr key={o.id}><td>#{o.id}</td><td><span className="badge text-bg-info">{o.status}</span></td><td>Q{o.total}</td><td><button className="btn btn-sm btn-outline-secondary" onClick={() => showOrder(o.id)}>Detalle</button></td></tr>)}</tbody></table></>; }
function AdminPanel({ report, users, products, toggleUser, toggleProduct }) { return <><h2>Panel administrativo</h2>{report && <div className="row g-3 mb-4"><Metric label="Ventas" value={'Q' + report.totalSales} /><Metric label="Pedidos" value={report.totalOrders} /><Metric label="Usuarios" value={report.totalUsers} /><Metric label="Productos" value={report.totalProducts} /></div>}<h3 className="h5">Usuarios</h3><table className="table table-striped"><tbody>{users.map(u => <tr key={u.id}><td>{u.fullName}</td><td>{u.role}</td><td>{u.isActive ? 'Activo' : 'Inactivo'}</td><td><button className="btn btn-sm btn-warning" onClick={() => toggleUser(u)}>{u.isActive ? 'Desactivar' : 'Activar'}</button></td></tr>)}</tbody></table><h3 className="h5">Productos</h3><ProductAdminTable products={products} toggleProduct={toggleProduct} /></>; }
function Metric({ label, value }) { return <div className="col-md-3"><div className="metric-card shadow-sm"><span>{label}</span><strong>{value}</strong></div></div>; }
function ProductModal({ product, onClose, addToCart }) { return <Modal onClose={onClose}><img src={product.imageUrl} className="img-fluid rounded mb-3" alt={product.name} /><h2>{product.name}</h2><p>{product.description}</p><p>Categoría: {product.category}</p><p>Precio: <strong>Q{product.price}</strong></p><p>Stock disponible: {product.stock}</p><button className="btn btn-primary" onClick={() => addToCart(product.id)}>Agregar al carrito</button></Modal>; }
function OrderModal({ order, onClose }) { return <Modal onClose={onClose}><h2>Pedido #{order.id}</h2><p>Estado: <span className="badge text-bg-info">{order.status}</span></p><p>Total: Q{order.total}</p><p>{order.shippingAddress}</p><p>Pago: {order.paymentMethod} - {order.paymentStatus}</p><ul className="list-group">{order.items?.map(i => <li className="list-group-item d-flex justify-content-between" key={i.productId}><span>{i.productName} x {i.quantity}</span><strong>Q{i.subtotal}</strong></li>)}</ul></Modal>; }
function Modal({ children, onClose }) { return <div className="modal-backdrop-custom"><div className="modal-card shadow-lg"><button className="btn btn-sm btn-outline-danger float-end" onClick={onClose}>Cerrar</button>{children}</div></div>; }

createRoot(document.getElementById('root')).render(<App />);
