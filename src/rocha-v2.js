import { supabase } from './supabase.js';

const FALLBACK_PRODUCTS = [
  { id: 1001, name: 'Glycare Sabonete Líquido Facial', description: 'Limpeza diária para pele oleosa e acneica • 150 ml', category: 'Dermocosméticos', price: 99.90, badge: 'Destaque', image_url: 'https://cdn.awsli.com.br/600x1000/764/764220/produto/134307330/626f391567.jpg', active: true },
  { id: 1002, name: 'Epidrat Corpo Intensivo', description: 'Hidratação intensiva para peles secas e sensíveis • 500 g', category: 'Hidratação', price: 119.90, badge: 'Mais vendido', image_url: 'https://inspire360.vteximg.com.br/arquivos/ids/156897-1000-1000/7891142982995-%E2%94%90%C2%A2HIDRATANTE%20CORPORAL%20EPIDRAT%20CORPO%20INTENSIVO%20-%20500G.jpg?v=639039273359600000', active: true },
  { id: 1003, name: 'Epidrat Rosto Acqua', description: 'Hidratante facial leve para todos os tipos de pele • 50 ml', category: 'Hidratação', price: 89.90, badge: '', image_url: 'https://down-br.img.susercontent.com/file/sg-11134201-7rcc0-lt24n3wb0xbee7', active: true },
  { id: 1004, name: 'Ivy C Ferulic Sérum Antioxidante', description: 'Vitamina C pura nanoencapsulada e ácido ferúlico • 30 g', category: 'Dermocosméticos', price: 239.90, badge: 'Lançamento', image_url: 'https://drogal.vtexassets.com/arquivos/ids/214486/93486.jpg?v=638478324248300000', active: true },
  { id: 1005, name: 'Episol Sec Acqua com Cor FPS 60', description: 'Protetor solar com cor para pele oleosa • 40 ml', category: 'Proteção solar', price: 109.90, badge: 'Oferta', image_url: 'https://d16w7cuzwgzfcy.cloudfront.net/Custom/Content/Products/19/67/196725_protetor-solar-episol-sec-acqua-cor-claro-fps60-40ml-p567647_l2_639008632171176737.webp', active: true },
  { id: 1006, name: 'Maxton Tintura Creme 1.0 Preto', description: 'Coloração permanente com cobertura dos fios brancos • kit', category: 'Cabelos', price: 17.90, badge: '', image_url: 'https://maxxieconomica.com/storage/photos/1/Products/ean/7896013544517.jpg', active: true },
  { id: 1007, name: 'Cor&Ton Coloração Creme 4.0', description: 'Coloração creme em tom castanho médio • kit', category: 'Cabelos', price: 18.90, badge: '', image_url: 'https://maxxieconomica.com/storage/photos/1/Products/ean/7896000705976.jpg', active: true },
  { id: 1008, name: 'Epidrat Calm B5 Multi-Reparador', description: 'Hidratante reparador para pele sensível • 50 ml', category: 'Hidratação', price: 99.90, badge: 'Destaque', image_url: 'https://www.drogariaminasbrasil.com.br/media/webp/catalog/product/cache/74c1057f7991b4edb2bc7bdaa94de933/image/872109775/hidratante-epidrat-calm-b5-50ml_jpg.webp', active: true },
  { id: 1009, name: 'Glycare Control Sabonete em Barra', description: 'Limpeza para pele oleosa, acneica e sensível • 70 g', category: 'Higiene', price: 49.90, badge: '', image_url: 'https://mantecorp.vtexassets.com/arquivos/ids/167429/7891142983039_1-20231211-141057.jpg?v=638417247568870000', active: true },
  { id: 1010, name: 'Ivy C Sabonete Líquido Facial', description: 'Limpeza facial com vitamina C e ácido hialurônico • 200 ml', category: 'Higiene', price: 84.90, badge: '', image_url: 'https://images.tcdn.com.br/img/img_prod/1037107/ivy_c_sabonete_liquido_200ml_mantecorp_112757595_1_300d9e6b7c4883785938968461458a03.jpg', active: true },
  { id: 1011, name: 'Episol Color Pó Compacto FPS 50', description: 'Pó compacto com alta cobertura e proteção solar • 10 g', category: 'Proteção solar', price: 159.90, badge: 'Novo', image_url: 'https://down-br.img.susercontent.com/file/sg-11134201-7rdyr-mdaevpf0za4g1a', active: true },
  { id: 1012, name: 'Ivy C UV Sérum FPS 30', description: 'Sérum antioxidante com proteção solar • 30 ml', category: 'Dermocosméticos', price: 229.90, badge: 'Destaque', image_url: 'https://drogariasp.vteximg.com.br/arquivos/ids/1179831-1000-1000/_0000_663247---serum-anti-idade-ivy-c-uv-30ml-hypermarcas-%283%29.png.png?v=638671218600770000', active: true }
];

const STATUS = {
  received: 'Recebido', confirmed: 'Confirmado', separating: 'Em separação', ready: 'Pronto',
  out_for_delivery: 'Saiu para entrega', delivered: 'Entregue', cancelled: 'Cancelado'
};

const state = {
  products: [],
  category: 'Todos',
  search: '',
  store: Number(localStorage.getItem('dr-v2-store') || 1),
  cart: JSON.parse(localStorage.getItem('dr-v2-cart') || '[]'),
  user: null
};

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const money = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const esc = (v = '') => String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const digits = (v = '') => String(v).replace(/\D/g, '');

function persistCart() {
  localStorage.setItem('dr-v2-cart', JSON.stringify(state.cart));
}

function cartCount() {
  return state.cart.reduce((sum, item) => sum + item.qty, 0);
}

function cartTotal() {
  return state.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function toast(message) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2600);
}

function openDrawer(id) {
  $('#overlay').classList.add('open');
  $(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeDrawers() {
  $('#overlay')?.classList.remove('open');
  $$('.drawer.open').forEach(el => el.classList.remove('open'));
  document.body.style.overflow = '';
}

function productImage(product) {
  if (product.image_url) return `<img src="${esc(product.image_url)}" alt="${esc(product.name)}" loading="lazy" onerror="this.remove();this.parentElement.innerHTML='<span class=\'product-placeholder\'>${esc(product.name?.[0] || 'R')}</span>'">`;
  return `<span class="product-placeholder">${esc(product.name?.[0] || 'R')}</span>`;
}

function categories() {
  return ['Todos', ...new Set(state.products.map(p => p.category).filter(Boolean))];
}

function filteredProducts() {
  const term = state.search.trim().toLowerCase();
  return state.products.filter(product => {
    const categoryOk = state.category === 'Todos' || product.category === state.category;
    const hay = `${product.name} ${product.description || ''} ${product.category || ''}`.toLowerCase();
    return categoryOk && (!term || hay.includes(term));
  });
}

function productCard(product) {
  return `<article class="product">
    ${product.badge ? `<span class="badge">${esc(product.badge)}</span>` : ''}
    <button class="favorite" type="button" aria-label="Favoritar" data-fav="${product.id}">♡</button>
    <div class="product-media">${productImage(product)}</div>
    <div class="product-body">
      <span class="product-category">${esc(product.category || 'Farmácia')}</span>
      <h3>${esc(product.name)}</h3>
      <div class="product-desc">${esc(product.description || 'Disponível na Drogaria Rocha')}</div>
      <div class="price-row">
        <div class="price"><small>a partir de</small><strong>${money(product.price)}</strong></div>
        <button class="add-btn" type="button" data-add="${product.id}" aria-label="Adicionar ao carrinho">+</button>
      </div>
    </div>
  </article>`;
}

function renderProducts() {
  const products = filteredProducts();
  $('#products').innerHTML = products.length ? products.map(productCard).join('') : `<div class="empty">Nenhum produto encontrado com esses filtros.</div>`;
  $('#result-label').textContent = `${products.length} ${products.length === 1 ? 'produto' : 'produtos'}`;
  bindProductEvents();
}

function renderCategories() {
  $('#categories').innerHTML = categories().map(cat => `<button class="cat ${cat === state.category ? 'active' : ''}" type="button" data-cat="${esc(cat)}">${esc(cat)}</button>`).join('');
  $$('[data-cat]').forEach(btn => btn.addEventListener('click', () => {
    state.category = btn.dataset.cat;
    renderCategories();
    renderProducts();
  }));
}

function bindProductEvents() {
  $$('[data-add]').forEach(btn => btn.addEventListener('click', () => addToCart(Number(btn.dataset.add))));
  $$('[data-fav]').forEach(btn => btn.addEventListener('click', () => {
    btn.textContent = btn.textContent === '♡' ? '♥' : '♡';
    toast(btn.textContent === '♥' ? 'Adicionado aos favoritos' : 'Removido dos favoritos');
  }));
}

function addToCart(id) {
  const product = state.products.find(p => Number(p.id) === Number(id));
  if (!product) return;
  const item = state.cart.find(i => Number(i.id) === Number(id));
  if (item) item.qty += 1;
  else state.cart.push({ id: product.id, name: product.name, price: Number(product.price), image_url: product.image_url, qty: 1 });
  persistCart();
  updateCartBadges();
  toast(`${product.name} adicionado`);
}

function updateCartBadges() {
  $$('[data-cart-count]').forEach(el => el.textContent = cartCount());
}

function renderCart() {
  const body = $('#cart-body');
  if (!state.cart.length) {
    body.innerHTML = `<div class="empty"><b>Seu carrinho está vazio.</b><br><br>Escolha seus produtos e eles aparecem aqui.</div>`;
    return;
  }
  body.innerHTML = `${state.cart.map(item => `<div class="cart-item">
    <div class="cart-thumb">${item.image_url ? `<img src="${esc(item.image_url)}" alt="">` : esc(item.name[0])}</div>
    <div><h4>${esc(item.name)}</h4><strong>${money(item.price)}</strong></div>
    <div class="qty"><button data-dec="${item.id}">−</button><b>${item.qty}</b><button data-inc="${item.id}">+</button></div>
  </div>`).join('')}
  <div class="cart-summary">
    <div class="sum-row"><span>Subtotal</span><b>${money(cartTotal())}</b></div>
    <div class="sum-row"><span>Entrega</span><b>Calculada no pedido</b></div>
    <div class="sum-row total"><span>Total parcial</span><span>${money(cartTotal())}</span></div>
  </div>
  <button class="btn-primary wide" id="go-checkout" type="button" style="margin-top:14px">Continuar para o pedido</button>`;
  $$('[data-inc]', body).forEach(btn => btn.addEventListener('click', () => changeQty(Number(btn.dataset.inc), 1)));
  $$('[data-dec]', body).forEach(btn => btn.addEventListener('click', () => changeQty(Number(btn.dataset.dec), -1)));
  $('#go-checkout')?.addEventListener('click', openCheckout);
}

function changeQty(id, delta) {
  const item = state.cart.find(i => Number(i.id) === Number(id));
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) state.cart = state.cart.filter(i => Number(i.id) !== Number(id));
  persistCart();
  updateCartBadges();
  renderCart();
}

function openCheckout() {
  if (!state.cart.length) return;
  closeDrawers();
  const profileName = state.user?.user_metadata?.name || '';
  $('#checkout-body').innerHTML = `<form class="checkout-form" id="checkout-form">
    <div class="two">
      <label class="field"><span>Nome completo</span><input name="name" value="${esc(profileName)}" required></label>
      <label class="field"><span>Telefone</span><input name="phone" inputmode="tel" required placeholder="(89) 99999-9999"></label>
    </div>
    <label class="field"><span>E-mail</span><input name="email" type="email" value="${esc(state.user?.email || '')}" placeholder="opcional"></label>
    <div class="field"><span>Como quer receber?</span><div class="choice-grid"><button class="choice active" type="button" data-fulfillment="delivery">🚚 Entrega</button><button class="choice" type="button" data-fulfillment="pickup">🏪 Retirar na loja</button></div></div>
    <input type="hidden" name="fulfillment" value="delivery">
    <label class="field" id="address-field"><span>Endereço de entrega</span><textarea name="address" rows="2" placeholder="Rua, número, bairro e referência" required></textarea></label>
    <div class="two">
      <label class="field"><span>Loja</span><select name="store"><option value="1" ${state.store === 1 ? 'selected' : ''}>Loja 1</option><option value="2" ${state.store === 2 ? 'selected' : ''}>Loja 2</option></select></label>
      <label class="field"><span>Pagamento</span><select name="payment"><option value="pix">PIX</option><option value="cash">Dinheiro</option><option value="credit">Cartão de crédito</option><option value="debit">Cartão de débito</option><option value="delivery">Na entrega</option></select></label>
    </div>
    <label class="field"><span>Observações</span><textarea name="notes" rows="2" placeholder="Ex.: troco para R$ 100"></textarea></label>
    <div class="cart-summary"><div class="sum-row total"><span>Total do pedido</span><span>${money(cartTotal())}</span></div></div>
    <p class="feedback" id="checkout-feedback"></p>
    <button class="btn-primary wide" type="submit">Confirmar pedido</button>
  </form>`;
  $$('[data-fulfillment]', $('#checkout-body')).forEach(btn => btn.addEventListener('click', () => {
    $$('[data-fulfillment]', $('#checkout-body')).forEach(b => b.classList.toggle('active', b === btn));
    const form = $('#checkout-form');
    form.fulfillment.value = btn.dataset.fulfillment;
    const field = $('#address-field');
    field.style.display = btn.dataset.fulfillment === 'delivery' ? '' : 'none';
    form.address.required = btn.dataset.fulfillment === 'delivery';
  }));
  $('#checkout-form').addEventListener('submit', submitOrder);
  openDrawer('#checkout-drawer');
}

async function submitOrder(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const feedback = $('#checkout-feedback');
  const button = form.querySelector('[type=submit]');
  const data = new FormData(form);
  if (digits(data.get('phone')).length < 10) {
    feedback.textContent = 'Informe um telefone válido.';
    return;
  }
  button.disabled = true;
  button.textContent = 'Enviando pedido...';
  const code = `DR${new Date().toISOString().slice(2,10).replaceAll('-','')}-${Math.floor(1000 + Math.random() * 9000)}`;
  const order = {
    code,
    user_id: state.user?.id || null,
    customer_name: String(data.get('name')).trim(),
    phone: String(data.get('phone')).trim(),
    email: String(data.get('email')).trim() || null,
    store_id: Number(data.get('store')),
    fulfillment: data.get('fulfillment'),
    address: data.get('fulfillment') === 'delivery' ? String(data.get('address')).trim() : null,
    payment_method: data.get('payment'),
    notes: String(data.get('notes')).trim() || null,
    subtotal: cartTotal(), delivery_fee: 0, total: cartTotal(), status: 'received'
  };
  try {
    const { data: saved, error } = await supabase.from('orders').insert(order).select().single();
    if (error) throw error;
    const items = state.cart.map(item => ({ order_id: saved.id, product_id: item.id, product_name: item.name, quantity: item.qty, unit_price: item.price, total: item.qty * item.price }));
    const { error: itemError } = await supabase.from('order_items').insert(items);
    if (itemError) throw itemError;
    const guestOrders = JSON.parse(localStorage.getItem('dr-v2-orders') || '[]');
    guestOrders.unshift({ ...saved, items });
    localStorage.setItem('dr-v2-orders', JSON.stringify(guestOrders.slice(0, 20)));
    state.cart = [];
    persistCart();
    updateCartBadges();
    closeDrawers();
    showOrderSuccess(saved);
  } catch (error) {
    console.error(error);
    feedback.textContent = 'Não foi possível registrar o pedido agora. Tente novamente.';
  } finally {
    button.disabled = false;
    button.textContent = 'Confirmar pedido';
  }
}

function showOrderSuccess(order) {
  $('#success-body').innerHTML = `<div style="text-align:center;padding:10px 0 18px"><div style="font-size:54px">✓</div><h2 style="font:800 28px Manrope;margin:8px 0">Pedido recebido!</h2><p style="color:var(--muted)">Seu pedido <b>${esc(order.code)}</b> entrou na fila da Loja ${order.store_id}.</p><div class="cart-summary"><div class="sum-row"><span>Status</span><b>Pedido recebido</b></div><div class="sum-row"><span>Total</span><b>${money(order.total)}</b></div></div><button class="btn-primary wide" data-close-success type="button" style="margin-top:16px">Continuar comprando</button></div>`;
  $('#success-body [data-close-success]').addEventListener('click', closeDrawers);
  openDrawer('#success-drawer');
}

function renderAuth() {
  const body = $('#account-body');
  body.innerHTML = `<div class="tabs"><button class="active" data-auth-tab="login">Entrar</button><button data-auth-tab="register">Criar conta</button></div>
  <form class="auth-form" id="login-form">
    <label class="field"><span>E-mail</span><input required type="email" name="email"></label>
    <label class="field"><span>Senha</span><input required type="password" name="password"></label>
    <p class="feedback"></p><button class="btn-primary wide" type="submit">Entrar</button>
  </form>
  <form class="auth-form" id="register-form" hidden>
    <label class="field"><span>Nome completo</span><input required name="name"></label>
    <label class="field"><span>Telefone</span><input required name="phone" inputmode="tel"></label>
    <label class="field"><span>E-mail</span><input required type="email" name="email"></label>
    <label class="field"><span>Senha</span><input required minlength="8" type="password" name="password"></label>
    <p class="feedback"></p><button class="btn-primary wide" type="submit">Criar minha conta</button>
  </form>`;
  $$('[data-auth-tab]', body).forEach(btn => btn.addEventListener('click', () => {
    $$('[data-auth-tab]', body).forEach(b => b.classList.toggle('active', b === btn));
    $('#login-form').hidden = btn.dataset.authTab !== 'login';
    $('#register-form').hidden = btn.dataset.authTab !== 'register';
  }));
  $('#login-form').addEventListener('submit', login);
  $('#register-form').addEventListener('submit', register);
}

async function login(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const feedback = $('.feedback', form);
  const { data: result, error } = await supabase.auth.signInWithPassword({ email: String(data.get('email')).trim(), password: String(data.get('password')) });
  if (error) { feedback.textContent = 'E-mail ou senha inválidos.'; return; }
  state.user = result.user;
  toast('Bem-vindo à Drogaria Rocha');
  renderAccount();
}

async function register(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const feedback = $('.feedback', form);
  if (digits(data.get('phone')).length < 10) { feedback.textContent = 'Informe um telefone válido.'; return; }
  const profile = { name: String(data.get('name')).trim(), phone: String(data.get('phone')).trim() };
  const { data: result, error } = await supabase.auth.signUp({
    email: String(data.get('email')).trim(), password: String(data.get('password')),
    options: { data: profile }
  });
  if (error) { feedback.textContent = 'Não foi possível criar a conta. Verifique o e-mail e tente novamente.'; return; }
  if (result.user) {
    await supabase.from('profiles').upsert({ user_id: result.user.id, name: profile.name, phone: profile.phone });
  }
  state.user = result.session ? result.user : null;
  if (state.user) renderAccount();
  else feedback.textContent = 'Conta criada. Confira seu e-mail para confirmar o cadastro.';
}

async function renderAccount() {
  const body = $('#account-body');
  if (!state.user) { renderAuth(); return; }
  const { data: adminFlag } = await supabase.rpc('is_admin');
  body.innerHTML = `<div class="account-card"><small>MINHA CONTA</small><h3>Olá, ${esc(state.user.user_metadata?.name || 'cliente')}</h3><p>${esc(state.user.email || '')}</p></div>
  <div class="action-list">
    <button type="button" data-my-orders>📦 Meus pedidos</button>
    <button type="button" data-my-profile>👤 Meus dados</button>
    ${adminFlag ? '<button type="button" data-admin-orders>⚙️ Painel de pedidos</button>' : ''}
    <button type="button" data-logout>↪ Sair da conta</button>
  </div>`;
  $('[data-my-orders]', body)?.addEventListener('click', openMyOrders);
  $('[data-admin-orders]', body)?.addEventListener('click', openAdminOrders);
  $('[data-my-profile]', body)?.addEventListener('click', () => toast('Edição de perfil será a próxima tela liberada.'));
  $('[data-logout]', body)?.addEventListener('click', async () => { await supabase.auth.signOut(); state.user = null; renderAuth(); });
}

async function openMyOrders() {
  const body = $('#orders-body');
  body.innerHTML = '<div class="loading">Carregando seus pedidos...</div>';
  closeDrawers();
  openDrawer('#orders-drawer');
  let orders = [];
  if (state.user) {
    const { data } = await supabase.from('orders').select('*').eq('user_id', state.user.id).order('created_at', { ascending: false });
    orders = data || [];
  } else {
    orders = JSON.parse(localStorage.getItem('dr-v2-orders') || '[]');
  }
  body.innerHTML = orders.length ? orders.map(orderCard).join('') : '<div class="empty">Você ainda não tem pedidos por aqui.</div>';
}

function orderCard(order, admin = false) {
  return `<article class="order-card"><div class="order-top"><span class="order-code">${esc(order.code)}</span><span class="status">${esc(STATUS[order.status] || order.status)}</span></div>
  <div class="order-meta"><div>Data<strong>${new Date(order.created_at).toLocaleDateString('pt-BR')}</strong></div><div>Loja<strong>Loja ${order.store_id}</strong></div><div>Total<strong>${money(order.total)}</strong></div></div>
  ${admin ? `<label class="field" style="margin-top:12px"><span>Atualizar status</span><select data-order-status="${order.id}">${Object.entries(STATUS).map(([value,label]) => `<option value="${value}" ${order.status === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label>` : ''}</article>`;
}

async function openAdminOrders() {
  closeDrawers();
  $('#admin-body').innerHTML = '<div class="loading">Carregando painel...</div>';
  openDrawer('#admin-drawer');
  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (!isAdmin) { $('#admin-body').innerHTML = '<div class="empty">Seu usuário não possui permissão de administrador.</div>'; return; }
  const { data: orders, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(100);
  if (error) { $('#admin-body').innerHTML = '<div class="empty">Não foi possível carregar os pedidos.</div>'; return; }
  $('#admin-body').innerHTML = orders?.length ? orders.map(o => orderCard(o, true)).join('') : '<div class="empty">Nenhum pedido recebido ainda.</div>';
  $$('[data-order-status]', $('#admin-body')).forEach(select => select.addEventListener('change', async () => {
    const { error: updateError } = await supabase.from('orders').update({ status: select.value }).eq('id', select.dataset.orderStatus);
    if (updateError) toast('Não foi possível atualizar'); else toast('Status atualizado');
  }));
}

async function loadProducts() {
  try {
    const { data, error } = await supabase.from('products').select('*').eq('active', true).order('id');
    if (!error && data?.length) state.products = data;
    else state.products = FALLBACK_PRODUCTS;
  } catch {
    state.products = FALLBACK_PRODUCTS;
  }
  renderCategories();
  renderProducts();
}

function renderApp() {
  $('#app').innerHTML = `<div class="shell">
    <div class="top-strip">Entrega e retirada nas lojas Drogaria Rocha • atendimento próximo de você</div>
    <header class="header">
      <div class="header-main">
        <button class="brand" type="button" data-home><span class="brand-mark">R</span><span class="brand-copy"><strong>Drogaria Rocha</strong><small>cuidado perto de você</small></span></button>
        <div class="search"><input id="search-input" placeholder="Busque produto, marca ou categoria"><button type="button">⌕</button></div>
        <div class="header-actions"><button class="icon-btn account-desktop" type="button" data-account>👤 <span class="label">Minha conta</span></button><button class="icon-btn" type="button" data-cart>🛒 <span class="label">Carrinho</span><span class="cart-count" data-cart-count>0</span></button></div>
      </div>
      <div class="store-bar">📍 Comprando na <select id="store-select"><option value="1">Drogaria Rocha • Loja 1</option><option value="2">Drogaria Rocha • Loja 2</option></select></div>
    </header>

    <main>
      <div class="hero-wrap"><section class="hero"><div class="hero-copy"><span class="eyebrow">● sua farmácia no celular</span><h1>Comprar de novo ficou muito mais simples.</h1><p>Encontre o que precisa, escolha entrega ou retirada e acompanhe o pedido sem depender de conversa no WhatsApp.</p><div class="hero-actions"><button class="btn-primary" type="button" data-shop>Ver produtos</button><button class="btn-secondary" type="button" data-orders>Meus pedidos</button></div></div><div class="hero-side"><div class="hero-card"><small>RECOMPRA INTELIGENTE</small><b>Seu cuidado, sem esquecer.</b><span>Histórico, favoritos e lembretes serão reunidos em uma só conta.</span><span class="pill">Drogaria Rocha+</span></div></div></section></div>

      <section class="section"><div class="benefits"><div class="benefit"><span class="benefit-icon">⚡</span><div><strong>Pedido rápido</strong><small>Menos etapas para comprar</small></div></div><div class="benefit"><span class="benefit-icon">🏪</span><div><strong>Duas lojas</strong><small>Escolha onde retirar</small></div></div><div class="benefit"><span class="benefit-icon">📦</span><div><strong>Acompanhe tudo</strong><small>Status do pedido no app</small></div></div><div class="benefit"><span class="benefit-icon">♡</span><div><strong>Feito para voltar</strong><small>Recompras e favoritos</small></div></div></div></section>

      <section class="section"><div class="section-head"><div><h2>Encontre mais rápido</h2><p>Navegue pelas categorias da loja.</p></div></div><div class="categories" id="categories"></div></section>

      <section class="section"><div class="promo"><div><h3>Seu pedido do mês, sem complicação.</h3><p>Faça a compra agora e acompanhe tudo pela sua conta.</p></div><div class="promo-badge"><small>CLUBE ROCHA</small><b>em breve</b></div></div></section>

      <section class="section" id="catalog"><div class="section-head"><div><h2>Produtos para você</h2><p id="result-label">Carregando produtos...</p></div><button class="link-btn" type="button" data-clear>Limpar filtros</button></div><div class="products" id="products"><div class="loading">Carregando catálogo...</div></div></section>
    </main>

    <nav class="bottom-nav"><button class="active" type="button" data-home><b>⌂</b>Início</button><button type="button" data-shop><b>⌕</b>Buscar</button><button type="button" data-orders><b>□</b>Pedidos</button><button type="button" data-account><b>♙</b>Conta</button></nav>
  </div>
  <div class="overlay" id="overlay"></div>
  <aside class="drawer right" id="cart-drawer"><div class="drawer-head"><h2>Seu carrinho</h2><button class="close-btn" data-close>×</button></div><div class="drawer-body" id="cart-body"></div></aside>
  <section class="drawer center" id="checkout-drawer"><div class="drawer-head"><h2>Finalizar pedido</h2><button class="close-btn" data-close>×</button></div><div class="drawer-body" id="checkout-body"></div></section>
  <section class="drawer center" id="success-drawer"><div class="drawer-head"><h2>Pedido confirmado</h2><button class="close-btn" data-close>×</button></div><div class="drawer-body" id="success-body"></div></section>
  <section class="drawer center" id="account-drawer"><div class="drawer-head"><h2>Minha conta</h2><button class="close-btn" data-close>×</button></div><div class="drawer-body" id="account-body"></div></section>
  <section class="drawer center" id="orders-drawer"><div class="drawer-head"><h2>Meus pedidos</h2><button class="close-btn" data-close>×</button></div><div class="drawer-body" id="orders-body"></div></section>
  <section class="drawer center" id="admin-drawer"><div class="drawer-head"><h2>Painel de pedidos</h2><button class="close-btn" data-close>×</button></div><div class="drawer-body" id="admin-body"></div></section>
  <div class="toast" id="toast"></div>`;

  $('#store-select').value = String(state.store);
  $('#store-select').addEventListener('change', e => { state.store = Number(e.target.value); localStorage.setItem('dr-v2-store', String(state.store)); toast(`Agora você está comprando na Loja ${state.store}`); });
  $('#search-input').addEventListener('input', e => { state.search = e.target.value; renderProducts(); });
  $('#overlay').addEventListener('click', closeDrawers);
  $$('[data-close]').forEach(btn => btn.addEventListener('click', closeDrawers));
  $$('[data-cart]').forEach(btn => btn.addEventListener('click', () => { renderCart(); openDrawer('#cart-drawer'); }));
  $$('[data-account]').forEach(btn => btn.addEventListener('click', async () => { await renderAccount(); openDrawer('#account-drawer'); }));
  $$('[data-orders]').forEach(btn => btn.addEventListener('click', openMyOrders));
  $$('[data-shop]').forEach(btn => btn.addEventListener('click', () => { closeDrawers(); $('#catalog').scrollIntoView({ behavior: 'smooth' }); $('#search-input').focus({ preventScroll: true }); }));
  $$('[data-home]').forEach(btn => btn.addEventListener('click', () => { closeDrawers(); window.scrollTo({ top: 0, behavior: 'smooth' }); }));
  $('[data-clear]').addEventListener('click', () => { state.category = 'Todos'; state.search = ''; $('#search-input').value = ''; renderCategories(); renderProducts(); });
  updateCartBadges();
}

async function init() {
  renderApp();
  const { data } = await supabase.auth.getSession();
  state.user = data?.session?.user || null;
  await loadProducts();
  supabase.auth.onAuthStateChange((_event, session) => { state.user = session?.user || null; });
}

init();
