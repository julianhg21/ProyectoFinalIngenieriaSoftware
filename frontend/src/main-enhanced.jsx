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
  const [productFormKey, setProductFormKey] = useState(0);
  const [message, setMessage] = useState('');
  const [filters, setFilters] = useState({ search: '', categoryId: 0 });

  useEffect(() => { loadInitial(); }, []);

  async function loadInitial() {
    setCategories(await api.getCategories());
  }

  async function login(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      const data = await api.login(form.get('email'), form.get('password'));
      setUser(data.user);
      setMessage('Sesión iniciada correctamente.');
      setProducts(await api.getProducts());
      if (data.user.role === 'Cliente') { setTab('catalog'); await loadClient(data.user.id); }
      if (data.user.role === 'Vendedor') { setTab('seller'); await loadSeller(data.user.id); }
      if (data.user.role === 'Administrador') { setTab('admin'); await loadAdmin(); }
    } catch {
      setMessage('Credenciales incorrectas o usuario inactivo.');
    }
  }

  async function register(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await api.register(form.get('fullName'), form.get('email'), form.get('password'), form.get('role'));
      e.currentTarget.reset();
      setMessage('Usuario registrado. Ahora puede iniciar sesión.');
    } catch {
      setMessage('No se pudo registrar el usuario. Revise los datos.');
    }
  }

  function logout() {
    setUser(null);
    setTab('catalog');
    setProducts([]);
    setCart(null);
    setOrders([]);
    setSellerProducts([]);
    setSellerOrders([]);
    setSellerSummary(null);
    setAdminUsers([]);
    setReport(null);
    setSelectedProduct(null);
    setSelectedOrder(null);
    setEditingProduct(null);
    setProductFormKey(k => k + 1);
    setMessage('Sesión cerrada.');
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
    if (user.role !== 'Cliente') { setMessage('Solo un cliente puede agregar productos al carrito.'); return; }
    await api.addToCart(user.id, productId, 1);
    await loadClient(user.id);
    setMessage('Producto agregado al carrito.');
  }

  async function changeQty(item, delta) {
    await apiExtra.updateCartItem(user.id, item.productId, item.quantity + delta);
    await loadClient(user.id);
  }

  async function emptyCart() {
    await apiExtra.clearCart(user.id);
    await loadClient(user.id);
    setMessage('Carrito vacío.');
  }

  async function checkout(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const response = await apiExtra.checkoutFull({ userId: user.id, shippingAddress: form.get('address'), phone: form.get('phone'), paymentMethod: form.get('paymentMethod'), notes: form.get('notes') });
    setMessage('Pedido #' + response.id + ' confirmado. Total Q' + response.total);
    await loadClient(user.id);
    setProducts(await api.getProducts(filters.search, filters.categoryId));
  }

  async function showOrder(id) {
    setSelectedOrder(await apiExtra.getOrderDetail(id));
  }

  async function saveProduct(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const wasEditing = Boolean(editingProduct);
    const product = {
      name: form.get('name'),
      description: form.get('description'),
      price: Number(form.get('price')),
      stock: Number(form.get('stock')),
      imageUrl: form.get('imageUrl'),
      categoryId: Number(form.get('categoryId')),
      sellerId: user.id,
      isActive: editingProduct?.isActive ?? true
    };

    if (wasEditing) await api.updateProduct(editingProduct.id, product);
    else await api.createProduct(product);

    form.set('name', '');
    form.set('description', '');
    form.set('price', '');
    form.set('stock', '');
    form.set('imageUrl', '');
    e.currentTarget.reset();
    setEditingProduct(null);
    setProductFormKey(k => k + 1);

    const updatedSellerProducts = await api.getSellerProducts(user.id);
    setSellerProducts(updatedSellerProducts);
    setSellerSummary(await apiExtra.getSellerSummary(user.id));
    setProducts(await api.getProducts(filters.search, filters.categoryId));

    setMessage(wasEditing ? 'Producto actualizado correctamente. La lista Mis productos se actualizó.' : 'Producto agregado correctamente. Los campos fueron limpiados y la lista Mis productos se actualizó.');
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

  async function toggleUser(targetUser) {
    await api.changeUserStatus(targetUser.id, !targetUser.isActive);
    await loadAdmin();
  }

  if (!user) {
    return <AuthScreen login={login} register={register} message={message} />;
  }

  return (
    <div>
      <nav className="navbar navbar-dark bg-dark sticky-top">
        <div className="container">
          <span className="navbar-brand">Artesanos Market</span>
          <div className="d-flex align-items-center gap-3">
            <span className="navbar-text text-white">{user.fullName} - {user.role}</span>
            <button className="btn btn-outline-light btn-sm" onClick={logout}>Cerrar sesión</button>
          </div>
        </div>
      </nav>
      <main className="container py-4">
        <section className="hero p-4 mb-4 rounded shadow-sm">
          <h1>Marketplace artesanal</h1>
          <p className="mb-0">Panel activo para {user.role}.</p>
        </section>
        {message && <div className="alert alert-info">{message}</div>}
        <div className="row g-4">
          <aside className="col-lg-3"><Menu user={user} tab={tab} setTab={setTab} /></aside>
          <section className="col-lg-9">
            {tab === 'catalog' && <Catalog products={products} categories={categories} filters={filters} setFilters={setFilters} searchProducts={searchProducts} addToCart={addToCart} setSelectedProduct={setSelectedProduct} />}
            {tab === 'cart' && <Cart cart={cart} changeQty={changeQty} emptyCart={emptyCart} checkout={checkout} />}
            {tab === 'orders' && <Orders orders={orders} showOrder={showOrder} />}
            {tab === 'seller' && <Seller categories={categories} products={sellerProducts} orders={sellerOrders} summary={sellerSummary} saveProduct={saveProduct} editingProduct={editingProduct} setEditingProduct={setEditingProduct} productFormKey={productFormKey} toggleProduct={toggleProduct} changeStatus={changeStatus} showOrder={showOrder} />}
            {tab === 'admin' && <Admin report={report} users={adminUsers} products={products} toggleUser={toggleUser} toggleProduct={toggleProduct} />}
          </section>
        </div>
      </main>
      {selectedProduct && <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} addToCart={addToCart} />}
      {selectedOrder && <OrderModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
    </div>
  );
}

function AuthScreen({ login, register, message }) {
  const [mode, setMode] = useState('login');
  return (
    <main className="login-page">
      <section className="login-card shadow-lg">
        <div className="login-brand">
          <span className="login-logo">AM</span>
          <div>
            <h1>Artesanos Market</h1>
            <p>Marketplace para artesanos y productores locales</p>
          </div>
        </div>
        {message && <div className="alert alert-info py-2">{message}</div>}
        <div className="btn-group w-100 mb-4">
          <button className={'btn ' + (mode === 'login' ? 'btn-primary' : 'btn-outline-primary')} onClick={() => setMode('login')}>Iniciar sesión</button>
          <button className={'btn ' + (mode === 'register' ? 'btn-primary' : 'btn-outline-primary')} onClick={() => setMode('register')}>Registrarse</button>
        </div>
        {mode === 'login' ? <LoginForm login={login} /> : <RegisterForm register={register} />}
        <div className="demo-users mt-4">
          <p className="fw-bold mb-2">Usuarios demo</p>
          <span>cliente@demo.com</span>
          <span>vendedor@demo.com</span>
          <span>admin@demo.com</span>
          <small>Clave para todos: Demo123</small>
        </div>
      </section>
    </main>
  );
}

function LoginForm({ login }) {
  return <form onSubmit={login}><label className="form-label">Correo</label><input className="form-control form-control-lg mb-3" name="email" defaultValue="cliente@demo.com" /><label className="form-label">Contraseña</label><input className="form-control form-control-lg mb-4" name="password" type="password" defaultValue="Demo123" /><button className="btn btn-primary btn-lg w-100">Entrar</button></form>;
}

function RegisterForm({ register }) {
  return <form onSubmit={register}><input className="form-control mb-3" name="fullName" placeholder="Nombre completo" required /><input className="form-control mb-3" name="email" placeholder="Correo electrónico" required /><input className="form-control mb-3" name="password" type="password" placeholder="Contraseña" required /><select className="form-select mb-4" name="role"><option>Cliente</option><option>Vendedor</option></select><button className="btn btn-success btn-lg w-100">Crear cuenta</button></form>;
}

function Menu({ user, tab, setTab }) { return <div className="card shadow-sm"><div className="card-body"><h2 className="h6">Menú</h2><div className="list-group"><MenuButton id="catalog" tab={tab} setTab={setTab} text="Catálogo" />{user.role === 'Cliente' && <><MenuButton id="cart" tab={tab} setTab={setTab} text="Carrito" /><MenuButton id="orders" tab={tab} setTab={setTab} text="Mis pedidos" /></>}{user.role === 'Vendedor' && <MenuButton id="seller" tab={tab} setTab={setTab} text="Panel vendedor" />}{user.role === 'Administrador' && <MenuButton id="admin" tab={tab} setTab={setTab} text="Panel admin" />}</div></div></div>; }
function MenuButton({ id, tab, setTab, text }) { return <button className={'list-group-item list-group-item-action ' + (tab === id ? 'active' : '')} onClick={() => setTab(id)}>{text}</button>; }

function Catalog({ products, categories, filters, setFilters, searchProducts, addToCart, setSelectedProduct }) { return <><div className="d-flex justify-content-between mb-3"><h2>Catálogo</h2><button className="btn btn-outline-primary" onClick={searchProducts}>Buscar</button></div><div className="row g-2 mb-4"><div className="col-md-8"><input className="form-control" value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} placeholder="Buscar producto" /></div><div className="col-md-4"><select className="form-select" value={filters.categoryId} onChange={e => setFilters({ ...filters, categoryId: Number(e.target.value) })}><option value="0">Todas las categorías</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div></div><div className="row g-3">{products.map(p => <div className="col-md-6 col-xl-4" key={p.id}><div className="card h-100 shadow-sm product-card"><img src={p.imageUrl} className="card-img-top" alt={p.name} /><div className="card-body d-flex flex-column"><span className="badge text-bg-secondary align-self-start mb-2">{p.category}</span><h3 className="h5">{p.name}</h3><p className="small text-muted">{p.description}</p><p><strong>Q{p.price}</strong> | Stock {p.stock}</p><button className="btn btn-outline-secondary mb-2" onClick={() => setSelectedProduct(p)}>Detalle</button><button className="btn btn-primary mt-auto" onClick={() => addToCart(p.id)}>Agregar</button></div></div></div>)}</div></>; }
function Cart({ cart, changeQty, emptyCart, checkout }) { return <div className="card shadow-sm"><div className="card-body"><h2>Carrito</h2>{!cart || cart.items.length === 0 ? <p>Carrito vacío.</p> : <><ul className="list-group mb-3">{cart.items.map(i => <li className="list-group-item" key={i.productId}><div className="d-flex justify-content-between"><span>{i.productName}</span><strong>Q{i.subtotal}</strong></div><div className="btn-group mt-2"><button className="btn btn-sm btn-outline-secondary" onClick={() => changeQty(i, -1)}>-</button><button className="btn btn-sm btn-light">{i.quantity}</button><button className="btn btn-sm btn-outline-secondary" onClick={() => changeQty(i, 1)}>+</button><button className="btn btn-sm btn-outline-danger" onClick={() => changeQty(i, -999)}>Eliminar</button></div></li>)}</ul><p>Total: <strong>Q{cart.total}</strong></p><CheckoutForm checkout={checkout} /><button className="btn btn-outline-danger mt-2" onClick={emptyCart}>Vaciar carrito</button></>}</div></div>; }
function CheckoutForm({ checkout }) { return <form className="row g-2" onSubmit={checkout}><div className="col-md-6"><input className="form-control" name="address" placeholder="Dirección de entrega" required /></div><div className="col-md-6"><input className="form-control" name="phone" placeholder="Teléfono" required /></div><div className="col-md-6"><select className="form-select" name="paymentMethod"><option>Pago mock</option><option>Tarjeta sandbox</option><option>Contra entrega</option></select></div><div className="col-md-6"><input className="form-control" name="notes" placeholder="Observaciones" /></div><div className="col-12"><button className="btn btn-success">Confirmar compra</button></div></form>; }
function Orders({ orders, showOrder }) { return <><h2>Mis pedidos</h2><table className="table table-striped"><tbody>{orders.map(o => <tr key={o.id}><td>#{o.id}</td><td><span className="badge text-bg-info">{o.status}</span></td><td>Q{o.total}</td><td><button className="btn btn-sm btn-outline-secondary" onClick={() => showOrder(o.id)}>Detalle</button></td></tr>)}</tbody></table></>; }
function Seller({ categories, products, orders, summary, saveProduct, editingProduct, setEditingProduct, productFormKey, toggleProduct, changeStatus, showOrder }) { return <><h2>Panel vendedor</h2>{summary && <div className="row g-3 mb-4"><Metric label="Total vendido" value={'Q' + summary.totalSold} /><Metric label="Unidades" value={summary.unitsSold} /></div>}<ProductForm key={editingProduct ? 'edit-' + editingProduct.id : 'new-' + productFormKey} categories={categories} saveProduct={saveProduct} editingProduct={editingProduct} /><h3 className="h5 mt-4">Mis productos</h3><ProductAdmin products={products} toggleProduct={toggleProduct} edit={setEditingProduct} /><h3 className="h5 mt-4">Pedidos recibidos</h3><OrderAdmin orders={orders} changeStatus={changeStatus} showOrder={showOrder} /></>; }
function ProductForm({ categories, saveProduct, editingProduct }) { return <div className="card shadow-sm"><div className="card-body"><h3 className="h5">{editingProduct ? 'Editar producto' : 'Publicar producto'}</h3><form className="row g-2" onSubmit={saveProduct}><div className="col-md-6"><input className="form-control" name="name" placeholder="Nombre" defaultValue={editingProduct?.name || ''} required /></div><div className="col-md-3"><input className="form-control" name="price" type="number" defaultValue={editingProduct?.price || ''} placeholder="Precio" required /></div><div className="col-md-3"><input className="form-control" name="stock" type="number" defaultValue={editingProduct?.stock || ''} placeholder="Stock" required /></div><div className="col-md-4"><select className="form-select" name="categoryId" defaultValue={editingProduct?.categoryId || 1}>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div className="col-md-8"><input className="form-control" name="imageUrl" defaultValue={editingProduct?.imageUrl || ''} placeholder="URL imagen" /></div><div className="col-12"><textarea className="form-control" name="description" defaultValue={editingProduct?.description || ''} placeholder="Descripción" required /></div><div className="col-12"><button className="btn btn-primary">Guardar producto</button></div></form></div></div>; }
function Admin({ report, users, products, toggleUser, toggleProduct }) { return <><h2>Panel administrativo</h2>{report && <div className="row g-3 mb-4"><Metric label="Ventas" value={'Q' + report.totalSales} /><Metric label="Pedidos" value={report.totalOrders} /><Metric label="Usuarios" value={report.totalUsers} /><Metric label="Productos" value={report.totalProducts} /></div>}<h3 className="h5">Usuarios</h3><table className="table table-striped"><tbody>{users.map(u => <tr key={u.id}><td>{u.fullName}</td><td>{u.role}</td><td>{u.isActive ? 'Activo' : 'Inactivo'}</td><td><button className="btn btn-sm btn-warning" onClick={() => toggleUser(u)}>{u.isActive ? 'Desactivar' : 'Activar'}</button></td></tr>)}</tbody></table><h3 className="h5">Productos</h3><ProductAdmin products={products} toggleProduct={toggleProduct} /></>; }
function ProductAdmin({ products, toggleProduct, edit }) { return <table className="table table-striped"><tbody>{products.map(p => <tr key={p.id}><td>{p.name}</td><td>Q{p.price}</td><td>{p.stock}</td><td>{p.isActive ? 'Activo' : 'Inactivo'}</td><td>{edit && <button className="btn btn-sm btn-outline-primary me-1" onClick={() => edit(p)}>Editar</button>}<button className="btn btn-sm btn-outline-warning" onClick={() => toggleProduct(p)}>{p.isActive ? 'Desactivar' : 'Activar'}</button></td></tr>)}</tbody></table>; }
function OrderAdmin({ orders, changeStatus, showOrder }) { return <table className="table table-striped"><tbody>{orders.map(o => <tr key={o.id}><td>#{o.id}</td><td>Q{o.total}</td><td><select className="form-select" value={o.status} onChange={e => changeStatus(o.id, e.target.value)}><option>Confirmado</option><option>En preparación</option><option>Enviado</option><option>Entregado</option><option>Cancelado</option></select></td><td><button className="btn btn-sm btn-outline-secondary" onClick={() => showOrder(o.id)}>Detalle</button></td></tr>)}</tbody></table>; }
function Metric({ label, value }) { return <div className="col-md-3"><div className="metric-card shadow-sm"><span>{label}</span><strong>{value}</strong></div></div>; }
function ProductModal({ product, onClose, addToCart }) { return <Modal onClose={onClose}><img src={product.imageUrl} className="img-fluid rounded mb-3" alt={product.name} /><h2>{product.name}</h2><p>{product.description}</p><p>Categoría: {product.category}</p><p>Precio: <strong>Q{product.price}</strong></p><p>Stock disponible: {product.stock}</p><button className="btn btn-primary" onClick={() => addToCart(product.id)}>Agregar al carrito</button></Modal>; }
function OrderModal({ order, onClose }) { return <Modal onClose={onClose}><h2>Pedido #{order.id}</h2><p>Estado: <span className="badge text-bg-info">{order.status}</span></p><p>Total: Q{order.total}</p><p>{order.shippingAddress}</p><p>Pago: {order.paymentMethod} - {order.paymentStatus}</p><ul className="list-group">{order.items?.map(i => <li className="list-group-item d-flex justify-content-between" key={i.productId}><span>{i.productName} x {i.quantity}</span><strong>Q{i.subtotal}</strong></li>)}</ul></Modal>; }
function Modal({ children, onClose }) { return <div className="modal-backdrop-custom"><div className="modal-card shadow-lg"><button className="btn btn-sm btn-outline-danger float-end" onClick={onClose}>Cerrar</button>{children}</div></div>; }

createRoot(document.getElementById('root')).render(<App />);
