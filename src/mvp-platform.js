import { supabase } from './supabase.js';
import { PRODUTOS } from './catalogo.js';

const STORAGE_ORDERS = 'dr-orders-v1';
const STORAGE_PROFILE = 'dr-profile-v1';

const STORES = [
  { id: 1, name: 'Drogaria Rocha - Loja 1' },
  { id: 2, name: 'Drogaria Rocha - Loja 2' }
];

const STATUS = {
  received: 'Pedido recebido',
  confirmed: 'Pedido confirmado',
  separating: 'Em separação',
  ready: 'Pronto para retirada',
  out_for_delivery: 'Saiu para entrega',
  delivered: 'Entregue',
  cancelled: 'Cancelado'
};

const PAYMENT = {
  pix: 'PIX',
  cash: 'Dinheiro',
  credit: 'Cartão de crédito',
  debit: 'Cartão de débito',
  delivery: 'Pagamento na entrega'
};

const money = (value) => Number(value || 0).toLocaleString('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#39;',
  '"': '&quot;'
})[char]);

const digits = (value = '') => String(value).replace(/\D/g, '');

function toast(message, type = 'ok') {
  let el = document.querySelector('#dr-mvp-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'dr-mvp-toast';
    document.body.append(el);
  }
  el.textContent = message;
  el.dataset.type = type;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 3400);
}

function createRoot() {
  if (document.querySelector('#dr-platform-root')) return;
  const root = document.createElement('div');
  root.id = 'dr-platform-root';
  root.innerHTML = `
    <div class="dr-mvp-modal" id="dr-account-modal" aria-hidden="true">
      <div class="dr-mvp-backdrop" data-dr-close></div>
      <section class="dr-mvp-panel" role="dialog" aria-modal="true" aria-labelledby="dr-account-title">
        <button class="dr-mvp-close" type="button" data-dr-close aria-label="Fechar">×</button>
        <div id="dr-account-content"></div>
      </section>
    </div>
    <div class="dr-mvp-modal" id="dr-orders-modal" aria-hidden="true">
      <div class="dr-mvp-backdrop" data-dr-close></div>
      <section class="dr-mvp-panel dr-mvp-panel-wide" role="dialog" aria-modal="true" aria-labelledby="dr-orders-title">
        <button class="dr-mvp-close" type="button" data-dr-close aria-label="Fechar">×</button>
        <div id="dr-orders-content"></div>
      </section>
    </div>
    <div class="dr-mvp-modal" id="dr-admin-orders-modal" aria-hidden="true">
      <div class="dr-mvp-backdrop" data-dr-close></div>
      <section class="dr-mvp-panel dr-mvp-panel-admin" role="dialog" aria-modal="true" aria-labelledby="dr-admin-orders-title">
        <button class="dr-mvp-close" type="button" data-dr-close aria-label="Fechar">×</button>
        <div id="dr-admin-orders-content"></div>
      </section>
    </div>`;
  document.body.append(root);

  root.addEventListener('click', (event) => {
    if (event.target.closest('[data-dr-close]')) closeMvpModal(event.target.closest('.dr-mvp-modal'));
  });
}

function openMvpModal(selector) {
  createRoot();
  const modal = document.querySelector(selector);
  if (!modal) return;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('dr-mvp-no-scroll');
}

function closeMvpModal(modal) {
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  if (!document.querySelector('.dr-mvp-modal.open') && !document.querySelector('.modal.aberto')) {
    document.body.classList.remove('dr-mvp-no-scroll');
    document.body.classList.remove('sem-rolagem');
  }
}

function closeLegacyCart() {
  const modal = document.querySelector('#modal-carrinho');
  if (!modal) return;
  modal.classList.remove('aberto');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('sem-rolagem');
}

function injectAccountButton() {
  const header = document.querySelector('.cabecalho-linha');
  if (!header || header.querySelector('[data-dr-account]')) return;
  const cart = header.querySelector('[data-open-cart]');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'dr-account-button';
  button.dataset.drAccount = '';
  button.innerHTML = `<span class="dr-account-icon" aria-hidden="true">👤</span><span><small>Cliente</small><strong>Minha conta</strong></span>`;
  button.addEventListener('click', openAccount);
  header.insertBefore(button, cart || null);
}

function localOrders() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_ORDERS) || '[]');
  } catch {
    return [];
  }
}

function saveLocalOrder(order) {
  const orders = localOrders();
  orders.unshift(order);
  localStorage.setItem(STORAGE_ORDERS, JSON.stringify(orders.slice(0, 50)));
}

function updateLocalOrder(id, patch) {
  const orders = localOrders().map((order) => order.id === id ? { ...order, ...patch } : order);
  localStorage.setItem(STORAGE_ORDERS, JSON.stringify(orders));
}

function currentProfile() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_PROFILE) || 'null');
  } catch {
    return null;
  }
}

function saveProfile(profile) {
  localStorage.setItem(STORAGE_PROFILE, JSON.stringify(profile));
}

async function sessionUser() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user || null;
}

async function profileFor(user) {
  if (!user) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('name,phone,cpf,birth_date')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!error && data) return { ...data, email: user.email };
  } catch {}
  const local = currentProfile();
  return local && local.email === user.email ? local : { email: user.email };
}

async function openAccount() {
  createRoot();
  openMvpModal('#dr-account-modal');
  const content = document.querySelector('#dr-account-content');
  content.innerHTML = `<div class="dr-loading">Carregando...</div>`;
  const user = await sessionUser();
  if (user) renderLoggedAccount(content, user, await profileFor(user));
  else renderAuth(content);
}

function renderAuth(content) {
  content.innerHTML = `
    <div class="dr-mvp-heading">
      <span>CONTA DO CLIENTE</span>
      <h2 id="dr-account-title">Entre ou crie sua conta</h2>
      <p>Acompanhe seus pedidos e compre novamente com mais facilidade.</p>
    </div>
    <div class="dr-auth-tabs">
      <button type="button" class="active" data-auth-tab="login">Entrar</button>
      <button type="button" data-auth-tab="register">Criar conta</button>
    </div>
    <form class="dr-auth-form" id="dr-login-form">
      <label>E-mail<input required type="email" name="email" autocomplete="email" placeholder="voce@exemplo.com"></label>
      <label>Senha<input required type="password" name="password" minlength="6" autocomplete="current-password" placeholder="Sua senha"></label>
      <button class="dr-primary" type="submit">Entrar</button>
      <button class="dr-link-button" type="button" data-forgot-password>Esqueci minha senha</button>
      <p class="dr-form-feedback" role="alert"></p>
    </form>
    <form class="dr-auth-form" id="dr-register-form" hidden>
      <div class="dr-form-grid">
        <label>Nome completo<input required name="name" autocomplete="name"></label>
        <label>Telefone<input required name="phone" inputmode="tel" autocomplete="tel" placeholder="(89) 99999-9999"></label>
      </div>
      <label>E-mail<input required type="email" name="email" autocomplete="email"></label>
      <label>Senha<input required type="password" name="password" minlength="8" autocomplete="new-password" placeholder="Mínimo de 8 caracteres"></label>
      <label class="dr-consent"><input type="checkbox" name="consent"> Quero receber ofertas e avisos da Drogaria Rocha.</label>
      <button class="dr-primary" type="submit">Criar minha conta</button>
      <p class="dr-form-feedback" role="alert"></p>
    </form>`;

  content.querySelectorAll('[data-auth-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      content.querySelectorAll('[data-auth-tab]').forEach((item) => item.classList.toggle('active', item === button));
      content.querySelector('#dr-login-form').hidden = button.dataset.authTab !== 'login';
      content.querySelector('#dr-register-form').hidden = button.dataset.authTab !== 'register';
    });
  });

  content.querySelector('#dr-login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const feedback = form.querySelector('.dr-form-feedback');
    const button = form.querySelector('[type=submit]');
    button.disabled = true;
    button.textContent = 'Entrando...';
    const data = new FormData(form);
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: String(data.get('email')).trim(),
      password: String(data.get('password'))
    });
    button.disabled = false;
    button.textContent = 'Entrar';
    if (error) {
      feedback.textContent = 'E-mail ou senha inválidos.';
      return;
    }
    const profile = await profileFor(authData.user);
    renderLoggedAccount(content, authData.user, profile);
    toast('Login realizado com sucesso.');
  });

  content.querySelector('#dr-register-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const feedback = form.querySelector('.dr-form-feedback');
    const button = form.querySelector('[type=submit]');
    const data = new FormData(form);
    const profile = {
      name: String(data.get('name')).trim(),
      phone: String(data.get('phone')).trim(),
      email: String(data.get('email')).trim().toLowerCase(),
      marketing_consent: data.get('consent') === 'on'
    };
    if (digits(profile.phone).length < 10) {
      feedback.textContent = 'Informe um telefone válido.';
      return;
    }
    button.disabled = true;
    button.textContent = 'Criando conta...';
    const { data: authData, error } = await supabase.auth.signUp({
      email: profile.email,
      password: String(data.get('password')),
      options: { data: { name: profile.name, phone: profile.phone } }
    });
    if (error) {
      button.disabled = false;
      button.textContent = 'Criar minha conta';
      feedback.textContent = error.message.includes('registered')
        ? 'Este e-mail já possui cadastro.'
        : 'Não foi possível criar a conta agora.';
      return;
    }
    saveProfile(profile);
    if (authData.user) {
      try {
        await supabase.from('profiles').upsert({
          user_id: authData.user.id,
          name: profile.name,
          phone: profile.phone,
          marketing_consent: profile.marketing_consent
        }, { onConflict: 'user_id' });
      } catch {}
    }
    button.disabled = false;
    button.textContent = 'Criar minha conta';
    if (authData.session) {
      renderLoggedAccount(content, authData.user, profile);
      toast('Conta criada com sucesso.');
    } else {
      feedback.classList.add('success');
      feedback.textContent = 'Conta criada. Confira seu e-mail para confirmar o acesso.';
    }
  });

  content.querySelector('[data-forgot-password]').addEventListener('click', async () => {
    const email = content.querySelector('#dr-login-form [name=email]');
    if (!email.reportValidity()) return;
    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.value.trim(), { redirectTo });
    const feedback = content.querySelector('#dr-login-form .dr-form-feedback');
    feedback.textContent = error ? 'Não foi possível enviar o link.' : 'Enviamos o link de recuperação para seu e-mail.';
    feedback.classList.toggle('success', !error);
  });
}

function renderLoggedAccount(content, user, profile = {}) {
  content.innerHTML = `
    <div class="dr-mvp-heading">
      <span>MINHA CONTA</span>
      <h2 id="dr-account-title">Olá, ${escapeHtml(profile.name || user.user_metadata?.name || 'cliente')}</h2>
      <p>${escapeHtml(user.email || '')}</p>
    </div>
    <div class="dr-account-actions">
      <button class="dr-action-card" type="button" data-open-my-orders>
        <b>📦</b><span><strong>Meus pedidos</strong><small>Acompanhar status e histórico</small></span><i>→</i>
      </button>
      <button class="dr-action-card" type="button" data-edit-profile>
        <b>👤</b><span><strong>Meus dados</strong><small>Telefone e informações pessoais</small></span><i>→</i>
      </button>
    </div>
    <div class="dr-account-summary">
      <div><small>Telefone</small><strong>${escapeHtml(profile.phone || 'Não informado')}</strong></div>
      <div><small>Conta</small><strong>Ativa</strong></div>
    </div>
    <button class="dr-secondary dr-full" type="button" data-logout>Sair da conta</button>`;

  content.querySelector('[data-open-my-orders]').addEventListener('click', () => {
    closeMvpModal(document.querySelector('#dr-account-modal'));
    openMyOrders();
  });
  content.querySelector('[data-edit-profile]').addEventListener('click', () => renderProfileEditor(content, user, profile));
  content.querySelector('[data-logout]').addEventListener('click', async () => {
    await supabase.auth.signOut();
    renderAuth(content);
    toast('Você saiu da conta.');
  });
}

function renderProfileEditor(content, user, profile = {}) {
  content.innerHTML = `
    <button class="dr-back" type="button" data-back-account>← Voltar</button>
    <div class="dr-mvp-heading"><span>MEUS DADOS</span><h2 id="dr-account-title">Dados do cliente</h2></div>
    <form class="dr-auth-form" id="dr-profile-form">
      <label>Nome completo<input required name="name" value="${escapeHtml(profile.name || user.user_metadata?.name || '')}"></label>
      <label>Telefone<input required name="phone" inputmode="tel" value="${escapeHtml(profile.phone || user.user_metadata?.phone || '')}"></label>
      <div class="dr-form-grid">
        <label>CPF<input name="cpf" inputmode="numeric" value="${escapeHtml(profile.cpf || '')}"></label>
        <label>Data de nascimento<input type="date" name="birth_date" value="${escapeHtml(profile.birth_date || '')}"></label>
      </div>
      <button class="dr-primary" type="submit">Salvar dados</button>
      <p class="dr-form-feedback"></p>
    </form>`;
  content.querySelector('[data-back-account]').addEventListener('click', () => renderLoggedAccount(content, user, profile));
  content.querySelector('#dr-profile-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const nextProfile = {
      name: String(data.get('name')).trim(),
      phone: String(data.get('phone')).trim(),
      cpf: digits(data.get('cpf')),
      birth_date: data.get('birth_date') || null,
      email: user.email
    };
    if (digits(nextProfile.phone).length < 10) {
      form.querySelector('.dr-form-feedback').textContent = 'Informe um telefone válido.';
      return;
    }
    const { error } = await supabase.from('profiles').upsert({
      user_id: user.id,
      name: nextProfile.name,
      phone: nextProfile.phone,
      cpf: nextProfile.cpf || null,
      birth_date: nextProfile.birth_date
    }, { onConflict: 'user_id' });
    saveProfile(nextProfile);
    if (error) {
      form.querySelector('.dr-form-feedback').textContent = 'Dados salvos neste aparelho. A sincronização ficará disponível após ativar o banco do MVP.';
      toast('Dados salvos no aparelho.');
    } else {
      toast('Dados atualizados.');
    }
    renderLoggedAccount(content, user, nextProfile);
  });
}

function enhanceCheckout(form) {
  if (!form || form.dataset.mvpEnhanced) return;
  form.dataset.mvpEnhanced = 'true';
  const nameField = form.querySelector('[name=nome]')?.closest('label');
  const notesField = form.querySelector('[name=observacoes]')?.closest('label');

  const block = document.createElement('div');
  block.className = 'dr-checkout-extra';
  block.innerHTML = `
    <div class="dr-form-grid">
      <label>Telefone<input required name="telefone" inputmode="tel" autocomplete="tel" placeholder="(89) 99999-9999"></label>
      <label>E-mail <small>(opcional)</small><input type="email" name="email" autocomplete="email" placeholder="voce@exemplo.com"></label>
    </div>
    <label>Unidade que atenderá o pedido
      <select required name="loja">
        ${STORES.map(store => `<option value="${store.id}">${store.name}</option>`).join('')}
      </select>
    </label>
    <fieldset class="dr-payment-fieldset">
      <legend>Forma de pagamento</legend>
      <div class="dr-payment-options">
        <label><input type="radio" name="pagamento" value="pix" checked><span>PIX</span></label>
        <label><input type="radio" name="pagamento" value="cash"><span>Dinheiro</span></label>
        <label><input type="radio" name="pagamento" value="credit"><span>Crédito</span></label>
        <label><input type="radio" name="pagamento" value="debit"><span>Débito</span></label>
      </div>
    </fieldset>
    <label data-change-field hidden>Troco para quanto?<input name="troco" inputmode="decimal" placeholder="Ex.: 100,00"></label>
    <div class="dr-order-note">Ao confirmar, o pedido será registrado e receberá um número para acompanhamento.</div>`;

  if (notesField) form.insertBefore(block, notesField);
  else if (nameField) nameField.after(block);
  else form.prepend(block);

  const toggleChange = () => {
    const field = block.querySelector('[data-change-field]');
    field.hidden = form.elements.pagamento?.value !== 'cash';
  };
  block.querySelectorAll('[name=pagamento]').forEach(input => input.addEventListener('change', toggleChange));
  toggleChange();

  prefillCheckout(form);
  const submit = form.querySelector('[type=submit]');
  if (submit) submit.innerHTML = 'Confirmar pedido <span>→</span>';
}

async function prefillCheckout(form) {
  const user = await sessionUser();
  if (!user || !document.body.contains(form)) return;
  const profile = await profileFor(user);
  if (form.elements.nome && !form.elements.nome.value) form.elements.nome.value = profile?.name || user.user_metadata?.name || '';
  if (form.elements.telefone && !form.elements.telefone.value) form.elements.telefone.value = profile?.phone || user.user_metadata?.phone || '';
  if (form.elements.email && !form.elements.email.value) form.elements.email.value = user.email || '';
}

async function cartItems() {
  let cart = {};
  try { cart = JSON.parse(localStorage.getItem('dr-carrinho') || '{}'); } catch {}
  const ids = Object.entries(cart).filter(([, qty]) => Number(qty) > 0).map(([id]) => Number(id));
  if (!ids.length) return [];

  let remote = [];
  try {
    const { data, error } = await supabase.from('products').select('id,name,price,active').in('id', ids);
    if (!error && data) remote = data;
  } catch {}

  return ids.map((id) => {
    const qty = Number(cart[id] || 0);
    const online = remote.find(item => Number(item.id) === id);
    const local = PRODUTOS.find(item => Number(item.id) === id);
    return {
      product_id: id,
      product_name: online?.name || local?.nome || `Produto ${id}`,
      quantity: qty,
      unit_price: Number(online?.price ?? local?.preco ?? 0),
      active: online?.active ?? local?.ativo ?? true
    };
  });
}

function orderCode() {
  const now = new Date();
  const date = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const random = Math.floor(1000 + Math.random() * 9000);
  return `DR${date}-${random}`;
}

async function persistOrder(order, items) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .insert({
        code: order.code,
        user_id: order.user_id,
        customer_name: order.customer_name,
        phone: order.phone,
        email: order.email || null,
        store_id: order.store_id,
        fulfillment: order.fulfillment,
        address: order.address || null,
        payment_method: order.payment_method,
        change_for: order.change_for,
        notes: order.notes || null,
        subtotal: order.subtotal,
        delivery_fee: order.delivery_fee,
        total: order.total,
        status: order.status
      })
      .select('id,code,status,created_at')
      .single();

    if (error) throw error;

    const rows = items.map(item => ({
      order_id: data.id,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.quantity * item.unit_price
    }));

    const { error: itemError } = await supabase.from('order_items').insert(rows);
    if (itemError) throw itemError;
    return { ...order, ...data, synced: true, items };
  } catch (error) {
    console.warn('[Drogaria Rocha MVP] Pedido salvo localmente:', error?.message || error);
    const local = { ...order, id: `local-${crypto.randomUUID?.() || Date.now()}`, synced: false, items };
    saveLocalOrder(local);
    return local;
  }
}

async function submitEnhancedCheckout(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || form.id !== 'checkout') return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  enhanceCheckout(form);
  if (!form.reportValidity()) return;

  const data = new FormData(form);
  const phone = String(data.get('telefone') || '').trim();
  if (digits(phone).length < 10) {
    form.elements.telefone?.focus();
    toast('Informe um telefone válido.', 'error');
    return;
  }

  const items = await cartItems();
  if (!items.length) {
    toast('Seu carrinho está vazio.', 'error');
    return;
  }
  if (items.some(item => item.active === false)) {
    toast('Há produto indisponível no carrinho. Atualize o pedido.', 'error');
    return;
  }

  const submit = form.querySelector('[type=submit]');
  if (submit) {
    submit.disabled = true;
    submit.textContent = 'Registrando pedido...';
  }

  const user = await sessionUser();
  const subtotal = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const fulfillment = String(data.get('tipo')) === 'retirada' ? 'pickup' : 'delivery';
  const payment = String(data.get('pagamento') || 'pix');
  const changeRaw = String(data.get('troco') || '').replace(/\./g, '').replace(',', '.');
  const changeFor = payment === 'cash' && changeRaw ? Number(changeRaw) : null;
  const createdAt = new Date().toISOString();

  const order = {
    code: orderCode(),
    user_id: user?.id || null,
    customer_name: String(data.get('nome')).trim(),
    phone,
    email: String(data.get('email') || user?.email || '').trim().toLowerCase() || null,
    store_id: Number(data.get('loja') || 1),
    fulfillment,
    address: fulfillment === 'delivery' ? String(data.get('endereco') || '').trim() : null,
    payment_method: payment,
    change_for: Number.isFinite(changeFor) ? changeFor : null,
    notes: String(data.get('observacoes') || '').trim() || null,
    subtotal,
    delivery_fee: 0,
    total: subtotal,
    status: 'received',
    created_at: createdAt
  };

  const saved = await persistOrder(order, items);

  localStorage.setItem('dr-carrinho', '{}');
  document.querySelectorAll('[data-cart-count]').forEach((badge) => {
    badge.textContent = '0';
    badge.hidden = true;
  });
  closeLegacyCart();

  if (submit) {
    submit.disabled = false;
    submit.innerHTML = 'Confirmar pedido <span>→</span>';
  }

  showOrderSuccess(saved);
}

function showOrderSuccess(order) {
  createRoot();
  const content = document.querySelector('#dr-orders-content');
  const store = STORES.find(item => item.id === Number(order.store_id))?.name || `Loja ${order.store_id}`;
  content.innerHTML = `
    <div class="dr-success-icon">✓</div>
    <div class="dr-mvp-heading dr-centered">
      <span>PEDIDO REGISTRADO</span>
      <h2 id="dr-orders-title">Pedido ${escapeHtml(order.code)}</h2>
      <p>Recebemos sua solicitação. A equipe da Drogaria Rocha poderá confirmar disponibilidade e pagamento pelo andamento do pedido.</p>
    </div>
    <div class="dr-order-confirmation">
      <div><small>Status</small><strong>${STATUS[order.status] || order.status}</strong></div>
      <div><small>Unidade</small><strong>${escapeHtml(store)}</strong></div>
      <div><small>Total</small><strong>${money(order.total)}</strong></div>
      <div><small>Pagamento</small><strong>${PAYMENT[order.payment_method] || order.payment_method}</strong></div>
    </div>
    ${order.synced ? '' : `<div class="dr-warning">Este pedido ficou salvo neste aparelho porque o banco do MVP ainda não respondeu. Você pode enviá-lo à drogaria pelo WhatsApp como contingência.</div>`}
    <div class="dr-success-actions">
      <button class="dr-primary" type="button" data-track-order>Acompanhar pedido</button>
      ${order.synced ? '' : `<button class="dr-secondary" type="button" data-order-whatsapp>Enviar pelo WhatsApp</button>`}
    </div>`;
  openMvpModal('#dr-orders-modal');

  content.querySelector('[data-track-order]').addEventListener('click', openMyOrders);
  content.querySelector('[data-order-whatsapp]')?.addEventListener('click', () => shareOrderWhatsApp(order));
}

function shareOrderWhatsApp(order) {
  const lines = [
    `Olá, Drogaria Rocha! Meu pedido é ${order.code}.`,
    '',
    ...(order.items || []).map(item => `• ${item.quantity}x ${item.product_name} — ${money(item.unit_price * item.quantity)}`),
    '',
    `Total estimado: ${money(order.total)}`,
    `Cliente: ${order.customer_name}`,
    `Telefone: ${order.phone}`,
    `Recebimento: ${order.fulfillment === 'pickup' ? 'Retirada' : 'Entrega'}`,
    order.address ? `Endereço: ${order.address}` : '',
    `Pagamento: ${PAYMENT[order.payment_method] || order.payment_method}`
  ].filter(Boolean);
  window.open(`https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener,noreferrer');
}

async function fetchMyOrders() {
  const user = await sessionUser();
  let remote = [];
  if (user) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id,code,store_id,fulfillment,payment_method,total,status,created_at,order_items(product_name,quantity,unit_price,total)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30);
      if (!error && data) remote = data.map(order => ({
        ...order,
        synced: true,
        items: order.order_items || []
      }));
    } catch {}
  }
  const local = localOrders();
  const seen = new Set(remote.map(order => order.code));
  return [...remote, ...local.filter(order => !seen.has(order.code))]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function orderCard(order, admin = false) {
  const store = STORES.find(item => item.id === Number(order.store_id))?.name || `Loja ${order.store_id}`;
  const items = order.items || order.order_items || [];
  const created = new Date(order.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  return `
    <article class="dr-order-card" data-order-id="${escapeHtml(order.id)}">
      <div class="dr-order-card-head">
        <div><small>${created}</small><strong>${escapeHtml(order.code)}</strong></div>
        <span class="dr-status dr-status-${escapeHtml(order.status)}">${STATUS[order.status] || escapeHtml(order.status)}</span>
      </div>
      ${admin ? `<div class="dr-customer-line"><strong>${escapeHtml(order.customer_name || 'Cliente')}</strong><span>${escapeHtml(order.phone || '')}</span></div>` : ''}
      <div class="dr-order-meta">
        <span>${escapeHtml(store)}</span>
        <span>${order.fulfillment === 'pickup' ? 'Retirada' : 'Entrega'}</span>
        <span>${PAYMENT[order.payment_method] || escapeHtml(order.payment_method || '')}</span>
      </div>
      <div class="dr-order-items">
        ${items.length ? items.map(item => `<div><span>${Number(item.quantity)}x ${escapeHtml(item.product_name)}</span><strong>${money(item.total ?? Number(item.unit_price) * Number(item.quantity))}</strong></div>`).join('') : '<small>Itens disponíveis após sincronização.</small>'}
      </div>
      <div class="dr-order-total"><span>Total</span><strong>${money(order.total)}</strong></div>
      ${admin ? adminStatusControls(order) : trackingSteps(order)}
    </article>`;
}

function trackingSteps(order) {
  const flow = order.fulfillment === 'pickup'
    ? ['received', 'confirmed', 'separating', 'ready']
    : ['received', 'confirmed', 'separating', 'out_for_delivery', 'delivered'];
  if (order.status === 'cancelled') return `<div class="dr-cancelled-box">Pedido cancelado</div>`;
  const current = Math.max(0, flow.indexOf(order.status));
  return `<div class="dr-track">${flow.map((status, index) => `
    <div class="${index <= current ? 'done' : ''}">
      <i>${index < current ? '✓' : index + 1}</i><span>${STATUS[status]}</span>
    </div>`).join('')}</div>`;
}

function adminStatusControls(order) {
  const options = Object.entries(STATUS).map(([value, label]) =>
    `<option value="${value}" ${value === order.status ? 'selected' : ''}>${label}</option>`
  ).join('');
  return `<div class="dr-admin-status"><label>Atualizar status<select data-order-status>${options}</select></label><button class="dr-primary dr-small" type="button" data-save-order-status>Salvar</button></div>`;
}

async function openMyOrders() {
  createRoot();
  closeMvpModal(document.querySelector('#dr-account-modal'));
  openMvpModal('#dr-orders-modal');
  const content = document.querySelector('#dr-orders-content');
  content.innerHTML = `<div class="dr-mvp-heading"><span>HISTÓRICO</span><h2 id="dr-orders-title">Meus pedidos</h2><p>Acompanhe o andamento das suas compras.</p></div><div class="dr-loading">Buscando pedidos...</div>`;
  const orders = await fetchMyOrders();
  content.innerHTML = `
    <div class="dr-mvp-heading"><span>HISTÓRICO</span><h2 id="dr-orders-title">Meus pedidos</h2><p>Acompanhe o andamento das suas compras.</p></div>
    <div class="dr-orders-list">${orders.length ? orders.map(order => orderCard(order)).join('') : '<div class="dr-empty">Você ainda não possui pedidos registrados neste aparelho ou nesta conta.</div>'}</div>`;
}

function injectAdminOrdersButton() {
  const top = document.querySelector('#conteudo-admin .admin-topo');
  if (!top || top.querySelector('[data-dr-admin-orders]')) return;
  const actions = top.querySelector('div:last-child') || top;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'botao secundario dr-admin-orders-button';
  button.dataset.drAdminOrders = '';
  button.textContent = '📦 Pedidos';
  button.addEventListener('click', openAdminOrders);
  actions.prepend(button);
}

async function openAdminOrders() {
  createRoot();
  const { data: adminData, error: adminError } = await supabase.rpc('is_admin');
  if (adminError || adminData !== true) {
    toast('Entre no painel administrativo para acessar os pedidos.', 'error');
    return;
  }
  openMvpModal('#dr-admin-orders-modal');
  const content = document.querySelector('#dr-admin-orders-content');
  content.innerHTML = `<div class="dr-mvp-heading"><span>GESTÃO</span><h2 id="dr-admin-orders-title">Pedidos</h2></div><div class="dr-loading">Carregando pedidos...</div>`;
  await renderAdminOrders(content);
}

async function renderAdminOrders(content) {
  let orders = [];
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('id,code,customer_name,phone,email,store_id,fulfillment,address,payment_method,total,status,created_at,order_items(product_name,quantity,unit_price,total)')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    orders = data || [];
  } catch (error) {
    content.innerHTML = `
      <div class="dr-mvp-heading"><span>GESTÃO</span><h2 id="dr-admin-orders-title">Pedidos</h2></div>
      <div class="dr-warning">O módulo de pedidos está instalado no aplicativo, mas as tabelas do banco ainda precisam receber a migração <strong>20260818_mvp_platform.sql</strong>.</div>`;
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const todayOrders = orders.filter(order => String(order.created_at).slice(0, 10) === today);
  const openOrders = orders.filter(order => !['delivered', 'cancelled'].includes(order.status));
  const revenue = orders.filter(order => order.status !== 'cancelled').reduce((sum, order) => sum + Number(order.total || 0), 0);

  content.innerHTML = `
    <div class="dr-mvp-heading"><span>GESTÃO</span><h2 id="dr-admin-orders-title">Pedidos</h2><p>Acompanhe e atualize os pedidos recebidos pelo aplicativo.</p></div>
    <div class="dr-admin-metrics">
      <div><small>Pedidos hoje</small><strong>${todayOrders.length}</strong></div>
      <div><small>Em andamento</small><strong>${openOrders.length}</strong></div>
      <div><small>Total registrado</small><strong>${money(revenue)}</strong></div>
    </div>
    <div class="dr-admin-filter">
      <label>Status<select data-admin-filter-status><option value="all">Todos</option>${Object.entries(STATUS).map(([value,label]) => `<option value="${value}">${label}</option>`).join('')}</select></label>
      <label>Loja<select data-admin-filter-store><option value="all">Todas</option>${STORES.map(store => `<option value="${store.id}">${store.name}</option>`).join('')}</select></label>
    </div>
    <div class="dr-orders-list" data-admin-orders-list>${orders.length ? orders.map(order => orderCard(order, true)).join('') : '<div class="dr-empty">Nenhum pedido recebido ainda.</div>'}</div>`;

  const rerenderFiltered = () => {
    const status = content.querySelector('[data-admin-filter-status]').value;
    const store = content.querySelector('[data-admin-filter-store]').value;
    const filtered = orders.filter(order =>
      (status === 'all' || order.status === status) &&
      (store === 'all' || Number(order.store_id) === Number(store))
    );
    content.querySelector('[data-admin-orders-list]').innerHTML = filtered.length ? filtered.map(order => orderCard(order, true)).join('') : '<div class="dr-empty">Nenhum pedido com esses filtros.</div>';
    bindAdminStatus(content, orders);
  };

  content.querySelector('[data-admin-filter-status]').addEventListener('change', rerenderFiltered);
  content.querySelector('[data-admin-filter-store]').addEventListener('change', rerenderFiltered);
  bindAdminStatus(content, orders);
}

function bindAdminStatus(content, orders) {
  content.querySelectorAll('[data-save-order-status]').forEach((button) => {
    button.addEventListener('click', async () => {
      const card = button.closest('[data-order-id]');
      const id = card.dataset.orderId;
      const status = card.querySelector('[data-order-status]').value;
      button.disabled = true;
      button.textContent = 'Salvando...';
      const { error } = await supabase.from('orders').update({ status }).eq('id', id);
      button.disabled = false;
      button.textContent = 'Salvar';
      if (error) {
        if (String(id).startsWith('local-')) {
          updateLocalOrder(id, { status });
          toast('Status atualizado neste aparelho.');
        } else {
          toast('Não foi possível atualizar o pedido.', 'error');
        }
        return;
      }
      const order = orders.find(item => String(item.id) === String(id));
      if (order) order.status = status;
      card.querySelector('.dr-status').className = `dr-status dr-status-${status}`;
      card.querySelector('.dr-status').textContent = STATUS[status];
      toast('Status do pedido atualizado.');
    });
  });
}

function observeApp() {
  const observer = new MutationObserver(() => {
    injectAccountButton();
    injectAdminOrdersButton();
    const checkout = document.querySelector('#checkout');
    if (checkout) enhanceCheckout(checkout);
  });
  observer.observe(document.documentElement, { subtree: true, childList: true });
  injectAccountButton();
  injectAdminOrdersButton();
}

document.addEventListener('submit', submitEnhancedCheckout, true);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') document.querySelectorAll('.dr-mvp-modal.open').forEach(closeMvpModal);
});

createRoot();
observeApp();

window.DrogariaRochaMVP = {
  openAccount,
  openMyOrders,
  openAdminOrders,
  version: '1.0.0'
};
