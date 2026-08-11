(() => {
  const icons = {
    cart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.1 10.1a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L20.3 8H6.2"/><circle cx="10" cy="19" r="1.2"/><circle cx="18" cy="19" r="1.2"/></svg>',
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>',
    grid: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>',
    tag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 13 11 22l-9-9V4a2 2 0 0 1 2-2h9z"/><circle cx="8" cy="8" r="1.5"/></svg>',
    user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    pill: '<svg viewBox="0 0 24 24"><path d="M8.2 19.8a5 5 0 0 1-7-7l7.6-7.6a5 5 0 1 1 7 7z"/><path d="m6 8 7 7"/></svg>',
    bottle: '<svg viewBox="0 0 24 24"><path d="M9 3h6"/><path d="M10 3v4l-2 2v11h8V9l-2-2V3"/><path d="M10 12h4"/></svg>',
    sparkle: '<svg viewBox="0 0 24 24"><path d="M12 3l1.3 4.2L17 9l-3.7 1.8L12 15l-1.3-4.2L7 9l3.7-1.8z"/><path d="m19 14 .7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7z"/></svg>',
    baby: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="7"/><path d="M12 6c-1-2 1-4 3-3"/><circle cx="9.5" cy="12" r=".6" fill="currentColor"/><circle cx="14.5" cy="12" r=".6" fill="currentColor"/><path d="M9 15c1.5 1.4 4.5 1.4 6 0"/></svg>',
    leaf: '<svg viewBox="0 0 24 24"><path d="M20 4C10 4 5 9 5 17c8 0 13-5 15-13Z"/><path d="M5 20c2-6 6-9 12-12"/></svg>'
  };

  const categoryPresentation = [
    { icon: icons.pill, label: 'Medicamentos' },
    { icon: icons.bottle, label: 'Higiene' },
    { icon: icons.sparkle, label: 'Beleza' },
    { icon: icons.baby, label: 'Infantil' },
    { icon: icons.leaf, label: 'Vitaminas' },
    { icon: icons.tag, label: 'Ofertas' }
  ];

  function smoothTo(target) {
    document.querySelector(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function enhance() {
    if (!document.querySelector('.cabecalho') || document.documentElement.dataset.rochaApproved === '1') return false;
    document.documentElement.dataset.rochaApproved = '1';

    const theme = document.querySelector('meta[name="theme-color"]');
    if (theme) theme.setAttribute('content', '#ffffff');

    const search = document.querySelector('#busca-mobile');
    if (search) search.placeholder = 'Buscar produtos, marcas e muito mais...';

    const location = document.querySelector('.localizacao');
    if (location) {
      const small = location.querySelector('span');
      const strong = location.querySelector('strong');
      if (small) small.textContent = 'Entregar ou retirar';
      if (strong) strong.textContent = 'Atendimento local';
    }

    const topCartIcon = document.querySelector('.botao-carrinho.topo > span:first-child');
    if (topCartIcon) topCartIcon.innerHTML = icons.cart;

    const slides = [...document.querySelectorAll('.banner-slide')];
    const heroCopy = [
      { badge: 'CUIDADO DIÁRIO', title: 'Sua rotina de bem-estar começa aqui', text: 'Cuidados, beleza e saúde com praticidade para o seu dia a dia.' },
      { badge: 'BELEZA E CUIDADO', title: 'Renove o visual do seu jeito', text: 'Produtos selecionados para cabelo, beleza e autocuidado.' },
      { badge: 'PROTEÇÃO TODOS OS DIAS', title: 'Proteção para acompanhar sua rotina', text: 'Encontre cuidados para pele e bem-estar em poucos toques.' }
    ];
    slides.forEach((slide, index) => {
      const copy = heroCopy[index];
      if (!copy) return;
      const badge = slide.querySelector('.banner-conteudo > span');
      const title = slide.querySelector('.banner-conteudo h1');
      const text = slide.querySelector('.banner-conteudo p');
      if (badge) badge.textContent = copy.badge;
      if (title) title.textContent = copy.title;
      if (text) text.textContent = copy.text;
    });

    document.querySelectorAll('.vitrine-categorias-lista button').forEach((button, index) => {
      const presentation = categoryPresentation[index];
      if (!presentation) return;
      const icon = button.querySelector('i');
      const label = button.querySelector('strong');
      if (icon) icon.innerHTML = presentation.icon;
      if (label) label.textContent = presentation.label;
      button.setAttribute('aria-label', presentation.label);
    });

    const catalogTitle = document.querySelector('.secao.catalogo .secao-titulo h2');
    if (catalogTitle) catalogTitle.textContent = 'Ofertas do Dia';
    const titleRow = document.querySelector('.secao.catalogo .secao-titulo');
    if (titleRow && !titleRow.querySelector('.catalogo-ver-todas')) {
      const more = document.createElement('span');
      more.className = 'catalogo-ver-todas';
      more.textContent = 'Ver todas ›';
      titleRow.appendChild(more);
    }

    const nav = document.querySelector('.navegacao-mobile');
    if (nav) {
      nav.innerHTML = `
        <button class="ativo" type="button" data-approved-nav="home"><span>${icons.home}</span><small>Início</small></button>
        <button type="button" data-approved-nav="categories"><span>${icons.grid}</span><small>Categorias</small></button>
        <button type="button" data-approved-nav="offers"><span>${icons.tag}</span><small>Ofertas</small></button>
        <button type="button" data-approved-nav="cart"><span>${icons.cart}</span><small>Carrinho</small><b data-cart-count hidden>0</b></button>
        <button type="button" data-approved-nav="account"><span>${icons.user}</span><small>Conta</small></button>`;

      nav.querySelectorAll('button').forEach((button) => {
        button.addEventListener('click', () => {
          nav.querySelectorAll('button').forEach((item) => item.classList.remove('ativo'));
          button.classList.add('ativo');
          const action = button.dataset.approvedNav;
          if (action === 'home') window.scrollTo({ top: 0, behavior: 'smooth' });
          if (action === 'categories') smoothTo('.vitrine-categorias');
          if (action === 'offers') smoothTo('#catalogo');
          if (action === 'cart') document.querySelector('.botao-carrinho.topo')?.click();
          if (action === 'account') smoothTo('#atendimento');
        });
      });
    }

    // Mantém o contador novo sincronizado com o contador original.
    const originalCounter = document.querySelector('.botao-carrinho.topo [data-cart-count]');
    if (originalCounter) {
      const syncCount = () => {
        const value = originalCounter.textContent || '0';
        document.querySelectorAll('.navegacao-mobile [data-cart-count]').forEach((counter) => {
          counter.textContent = value;
          counter.hidden = originalCounter.hidden || value === '0';
        });
      };
      syncCount();
      new MutationObserver(syncCount).observe(originalCounter, { childList: true, attributes: true, subtree: true });
    }

    return true;
  }

  function boot() {
    if (enhance()) return;
    const observer = new MutationObserver(() => {
      if (enhance()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 8000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => window.setTimeout(boot, 0));
  else window.setTimeout(boot, 0);
})();
