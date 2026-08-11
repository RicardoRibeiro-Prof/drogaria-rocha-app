(() => {
  const SUPABASE_URL = 'https://jduynqhrblvogqltmabk.supabase.co';
  const API_KEY = 'sb_publishable_8e-UiAHrdjYMT6_-R39MMA_WZVVtKQz';
  const BUCKET = 'product-images';
  const MANIFEST_PATH = 'banners/manifest.json';
  const MANIFEST_PUBLIC = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${MANIFEST_PATH}`;
  const AUTH_KEY = 'sb-jduynqhrblvogqltmabk-auth-token';
  const DEFAULTS = [
    { id: 'default-higiene', image: '/drogaria-rocha-app/assets/banner-aprovado-higiene.webp', title: 'Ofertas de higiene e beleza', link: '#catalogo', active: true, order: 1 },
    { id: 'default-vitaminas', image: '/drogaria-rocha-app/assets/banner-aprovado-vitaminas.webp', title: 'Vitaminas para o seu dia', link: '#catalogo', active: true, order: 2 },
    { id: 'default-app', image: '/drogaria-rocha-app/assets/banner-aprovado-app.webp', title: 'Peça pelo app e receba com facilidade', link: '#catalogo', active: true, order: 3 }
  ];

  let items = [];
  let editingId = null;
  let modal;

  const esc = (value = '') => String(value).replace(/[&<>'"]/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]));
  const pathEncode = (path) => path.split('/').map(encodeURIComponent).join('/');

  function getToken() {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      if (!raw) return '';
      const parsed = JSON.parse(raw);
      return parsed?.access_token || parsed?.currentSession?.access_token || parsed?.session?.access_token || '';
    } catch (_) { return ''; }
  }

  async function verifyAdmin(token) {
    if (!token) return false;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_admin`, {
        method: 'POST',
        headers: { apikey: API_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: '{}'
      });
      if (!res.ok) return false;
      return (await res.json()) === true;
    } catch (_) { return false; }
  }

  async function loadManifest() {
    try {
      const res = await fetch(`${MANIFEST_PUBLIC}?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error();
      items = data.map((item, index) => ({ ...item, order: Number(item.order || index + 1), active: item.active !== false }));
    } catch (_) {
      items = DEFAULTS.map((item) => ({ ...item }));
    }
    normalizeOrder();
  }

  function normalizeOrder() {
    items.sort((a,b) => Number(a.order || 0) - Number(b.order || 0));
    items.forEach((item, index) => item.order = index + 1);
  }

  async function saveManifest(token) {
    normalizeOrder();
    const body = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${pathEncode(MANIFEST_PATH)}`, {
      method: 'POST',
      headers: { apikey: API_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'x-upsert': 'true' },
      body
    });
    if (!res.ok) throw new Error(await res.text());
    window.dispatchEvent(new Event('rocha-banners-updated'));
  }

  async function uploadImage(file, token) {
    if (!file?.size) throw new Error('Selecione uma imagem.');
    if (!file.type.startsWith('image/')) throw new Error('Escolha um arquivo de imagem.');
    if (file.size > 6 * 1024 * 1024) throw new Error('A imagem deve ter no máximo 6 MB.');
    const ext = (file.name.split('.').pop() || 'webp').toLowerCase().replace(/[^a-z0-9]/g, '') || 'webp';
    const storagePath = `banners/banner-${Date.now()}-${Math.random().toString(36).slice(2,7)}.${ext}`;
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${pathEncode(storagePath)}`, {
      method: 'POST',
      headers: { apikey: API_KEY, Authorization: `Bearer ${token}`, 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'true' },
      body: file
    });
    if (!res.ok) throw new Error('Não foi possível enviar a imagem.');
    return { image: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`, storagePath };
  }

  async function tryDeleteStorage(storagePath, token) {
    if (!storagePath) return;
    try {
      await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${pathEncode(storagePath)}`, {
        method: 'DELETE',
        headers: { apikey: API_KEY, Authorization: `Bearer ${token}` }
      });
    } catch (_) {}
  }

  function ensureModal() {
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'rocha-banner-admin-modal';
    modal.className = 'rocha-banner-admin-modal';
    modal.hidden = true;
    modal.innerHTML = `
      <div class="rocha-banner-backdrop" data-banner-close></div>
      <section class="rocha-banner-panel" role="dialog" aria-modal="true" aria-labelledby="rocha-banner-title">
        <header><div><span>BANNERS DA HOME</span><h2 id="rocha-banner-title">Gerenciar banners</h2></div><button type="button" data-banner-close aria-label="Fechar">×</button></header>
        <div class="rocha-banner-layout">
          <form id="rocha-banner-form" class="rocha-banner-form">
            <input type="hidden" name="id">
            <div class="rocha-banner-preview"><span>Pré-visualização</span><img alt="Prévia do banner" hidden></div>
            <label>Imagem do banner<input type="file" name="imagem" accept="image/jpeg,image/png,image/webp"></label>
            <small class="rocha-banner-help">Recomendado: imagem horizontal, aproximadamente 1600 × 900 px, até 6 MB.</small>
            <label>Título opcional<input type="text" name="titulo" maxlength="100" placeholder="Ex.: Ofertas de verão"></label>
            <label>Destino ao clicar<input type="text" name="link" placeholder="#catalogo ou https://..."></label>
            <label class="rocha-banner-check"><input type="checkbox" name="ativo" checked> Banner ativo</label>
            <p class="rocha-banner-status" role="status"></p>
            <div class="rocha-banner-form-actions"><button type="submit" class="botao primario">Adicionar banner</button><button type="button" class="botao secundario" data-banner-cancel-edit hidden>Cancelar edição</button></div>
          </form>
          <div class="rocha-banner-list-wrap"><div class="rocha-banner-list-head"><strong>Banners publicados</strong><small>Arraste pela ordem usando as setas.</small></div><div id="rocha-banner-list" class="rocha-banner-list"></div></div>
        </div>
      </section>`;
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-banner-close]').forEach((el) => el.addEventListener('click', closeModal));
    modal.querySelector('[data-banner-cancel-edit]').addEventListener('click', resetForm);
    modal.querySelector('#rocha-banner-form').addEventListener('submit', submitForm);
    modal.querySelector('input[name="imagem"]').addEventListener('change', previewFile);
    return modal;
  }

  function previewFile(event) {
    const file = event.target.files?.[0];
    const img = modal.querySelector('.rocha-banner-preview img');
    if (!file) return;
    img.src = URL.createObjectURL(file);
    img.hidden = false;
  }

  function renderList() {
    const list = modal.querySelector('#rocha-banner-list');
    if (!items.length) {
      list.innerHTML = '<div class="rocha-banner-empty">Nenhum banner cadastrado.</div>';
      return;
    }
    list.innerHTML = items.map((item, index) => `
      <article class="rocha-banner-item ${item.active === false ? 'inativo' : ''}" data-id="${esc(item.id)}">
        <img src="${esc(item.image)}" alt="${esc(item.title || 'Banner')}">
        <div class="rocha-banner-item-info"><strong>${esc(item.title || `Banner ${index + 1}`)}</strong><small>${item.active === false ? 'Inativo' : 'Ativo'} · posição ${index + 1}</small></div>
        <div class="rocha-banner-item-actions">
          <button type="button" data-action="up" title="Mover para cima" ${index === 0 ? 'disabled' : ''}>↑</button>
          <button type="button" data-action="down" title="Mover para baixo" ${index === items.length - 1 ? 'disabled' : ''}>↓</button>
          <button type="button" data-action="toggle">${item.active === false ? 'Ativar' : 'Desativar'}</button>
          <button type="button" data-action="edit">Editar</button>
          <button type="button" data-action="delete" class="perigo">Excluir</button>
        </div>
      </article>`).join('');
    list.querySelectorAll('.rocha-banner-item').forEach((row) => row.addEventListener('click', handleItemAction));
  }

  async function handleItemAction(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const row = event.currentTarget;
    const index = items.findIndex((item) => String(item.id) === row.dataset.id);
    if (index < 0) return;
    const action = button.dataset.action;
    if (action === 'edit') { editItem(items[index]); return; }
    const token = getToken();
    if (!(await verifyAdmin(token))) { setStatus('Sua sessão administrativa expirou. Entre novamente.', true); return; }
    try {
      if (action === 'up' && index > 0) [items[index - 1], items[index]] = [items[index], items[index - 1]];
      if (action === 'down' && index < items.length - 1) [items[index + 1], items[index]] = [items[index], items[index + 1]];
      if (action === 'toggle') items[index].active = items[index].active === false;
      if (action === 'delete') {
        if (!window.confirm('Excluir este banner da Home?')) return;
        const removed = items.splice(index, 1)[0];
        await tryDeleteStorage(removed.storagePath, token);
      }
      await saveManifest(token);
      renderList();
      setStatus('Banners atualizados.');
    } catch (_) { setStatus('Não foi possível atualizar os banners.', true); }
  }

  function editItem(item) {
    editingId = item.id;
    const form = modal.querySelector('#rocha-banner-form');
    form.elements.id.value = item.id;
    form.elements.titulo.value = item.title || '';
    form.elements.link.value = item.link || '';
    form.elements.ativo.checked = item.active !== false;
    const img = modal.querySelector('.rocha-banner-preview img');
    img.src = item.image;
    img.hidden = false;
    form.querySelector('button[type="submit"]').textContent = 'Salvar alterações';
    modal.querySelector('[data-banner-cancel-edit]').hidden = false;
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function resetForm() {
    editingId = null;
    const form = modal.querySelector('#rocha-banner-form');
    form.reset();
    form.elements.ativo.checked = true;
    modal.querySelector('.rocha-banner-preview img').hidden = true;
    form.querySelector('button[type="submit"]').textContent = 'Adicionar banner';
    modal.querySelector('[data-banner-cancel-edit]').hidden = true;
    setStatus('');
  }

  function setStatus(text, error = false) {
    const el = modal?.querySelector('.rocha-banner-status');
    if (!el) return;
    el.textContent = text;
    el.classList.toggle('erro', error);
  }

  async function submitForm(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector('button[type="submit"]');
    const token = getToken();
    if (!(await verifyAdmin(token))) { setStatus('Sua sessão administrativa expirou. Entre novamente.', true); return; }
    const file = form.elements.imagem.files?.[0];
    const title = form.elements.titulo.value.trim();
    const link = form.elements.link.value.trim() || '#catalogo';
    const active = form.elements.ativo.checked;
    submit.disabled = true;
    submit.textContent = 'Salvando...';
    try {
      if (editingId) {
        const item = items.find((entry) => String(entry.id) === String(editingId));
        if (!item) throw new Error();
        if (file) {
          const oldPath = item.storagePath;
          const uploaded = await uploadImage(file, token);
          item.image = uploaded.image;
          item.storagePath = uploaded.storagePath;
          await tryDeleteStorage(oldPath, token);
        }
        item.title = title || item.title || 'Banner';
        item.link = link;
        item.active = active;
      } else {
        if (!file) throw new Error('Selecione uma imagem para o novo banner.');
        const uploaded = await uploadImage(file, token);
        items.push({ id: `banner-${Date.now()}`, image: uploaded.image, storagePath: uploaded.storagePath, title: title || 'Banner', link, active, order: items.length + 1 });
      }
      await saveManifest(token);
      renderList();
      setStatus(editingId ? 'Banner atualizado.' : 'Banner adicionado.');
      resetForm();
    } catch (error) {
      setStatus(error?.message || 'Não foi possível salvar o banner.', true);
    } finally {
      submit.disabled = false;
      submit.textContent = editingId ? 'Salvar alterações' : 'Adicionar banner';
    }
  }

  async function openModal() {
    ensureModal();
    const token = getToken();
    if (!(await verifyAdmin(token))) {
      window.alert('Faça login como administrador antes de gerenciar os banners.');
      return;
    }
    modal.hidden = false;
    document.body.classList.add('rocha-banner-modal-open');
    setStatus('Carregando banners...');
    await loadManifest();
    renderList();
    resetForm();
  }

  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove('rocha-banner-modal-open');
  }

  function injectAdminButton() {
    const adminTop = document.querySelector('#conteudo-admin .admin-topo');
    if (!adminTop || adminTop.querySelector('[data-manage-home-banners]')) return false;
    const actions = adminTop.querySelector('div:last-child') || adminTop;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'botao secundario rocha-manage-banners';
    button.setAttribute('data-manage-home-banners', '');
    button.textContent = '▣ Banners da Home';
    button.addEventListener('click', openModal);
    actions.insertBefore(button, actions.firstChild);
    return true;
  }

  injectAdminButton();
  const observer = new MutationObserver(injectAdminButton);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
