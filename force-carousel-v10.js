(() => {
  const MANIFEST_URL = 'https://jduynqhrblvogqltmabk.supabase.co/storage/v1/object/public/product-images/banners/manifest.json';
  const DEFAULTS = [
    { id: 'default-higiene', image: '/drogaria-rocha-app/assets/banner-aprovado-higiene.webp', title: 'Ofertas de higiene e beleza', link: '#catalogo', active: true, order: 1 },
    { id: 'default-vitaminas', image: '/drogaria-rocha-app/assets/banner-aprovado-vitaminas.webp', title: 'Vitaminas para o seu dia', link: '#catalogo', active: true, order: 2 },
    { id: 'default-app', image: '/drogaria-rocha-app/assets/banner-aprovado-app.webp', title: 'Peça pelo app e receba com facilidade', link: '#catalogo', active: true, order: 3 }
  ];

  let section;
  let items = [];
  let current = 0;
  let timer;

  async function loadItems() {
    try {
      const response = await fetch(`${MANIFEST_URL}?t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('manifest unavailable');
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('invalid manifest');
      return data
        .filter((item) => item && item.image && item.active !== false)
        .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
    } catch (_) {
      return DEFAULTS;
    }
  }

  function goToLink(link) {
    const target = link || '#catalogo';
    if (target.startsWith('#')) {
      document.querySelector(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (/^https?:\/\//i.test(target)) {
      window.open(target, '_blank', 'noopener,noreferrer');
      return;
    }
    window.location.href = target;
  }

  function show(index) {
    if (!section || !items.length) return;
    current = (index + items.length) % items.length;
    section.querySelectorAll('.rocha-force-slide').forEach((slide, i) => slide.classList.toggle('ativo', i === current));
    section.querySelectorAll('.rocha-force-dots button').forEach((dot, i) => dot.classList.toggle('ativo', i === current));
  }

  function startTimer() {
    clearInterval(timer);
    if (items.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    timer = setInterval(() => show(current + 1), 5000);
  }

  function render() {
    if (!section) return;
    if (!items.length) {
      section.hidden = true;
      return;
    }
    section.hidden = false;
    section.innerHTML = `
      <div class="rocha-force-window">
        ${items.map((item, i) => `<button class="rocha-force-slide ${i === 0 ? 'ativo' : ''}" type="button" data-i="${i}" aria-label="${String(item.title || `Banner ${i + 1}`).replace(/"/g, '&quot;')}"><img src="${item.image}" alt="${String(item.title || '').replace(/"/g, '&quot;')}" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}></button>`).join('')}
      </div>
      <div class="rocha-force-dots">${items.map((_, i) => `<button type="button" class="${i === 0 ? 'ativo' : ''}" data-i="${i}" aria-label="Exibir banner ${i + 1}"></button>`).join('')}</div>`;

    section.querySelectorAll('.rocha-force-slide').forEach((slide, i) => slide.addEventListener('click', () => goToLink(items[i].link)));
    section.querySelectorAll('.rocha-force-dots button').forEach((dot, i) => dot.addEventListener('click', () => { show(i); startTimer(); }));
    current = 0;
    startTimer();
  }

  async function reload() {
    items = await loadItems();
    render();
  }

  function mount() {
    if (document.querySelector('#rocha-force-carousel')) {
      section = document.querySelector('#rocha-force-carousel');
      reload();
      return true;
    }
    const anchor = document.querySelector('.vitrine-categorias') || document.querySelector('.atalhos') || document.querySelector('#catalogo') || document.querySelector('main#inicio');
    if (!anchor?.parentNode) return false;
    section = document.createElement('section');
    section.id = 'rocha-force-carousel';
    section.setAttribute('aria-label', 'Destaques Drogaria Rocha');
    anchor.parentNode.insertBefore(section, anchor);
    reload();
    return true;
  }

  if (!mount()) {
    const observer = new MutationObserver(() => { if (mount()) observer.disconnect(); });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 15000);
  }

  window.addEventListener('rocha-banners-updated', reload);
})();
