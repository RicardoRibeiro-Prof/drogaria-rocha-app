(() => {
  const defs = [
    { key:'protecao', labels:['protecao solar'], title:'Proteção Solar', subtitle:'Protetores faciais, corporais e opções com cor para o dia a dia.' },
    { key:'limpeza', labels:['limpeza'], title:'Limpeza Facial', subtitle:'Sabonetes, géis e produtos para manter a pele limpa e equilibrada.' },
    { key:'hidratacao', labels:['hidratacao'], title:'Hidratação', subtitle:'Cuidados para rosto, corpo e áreas ressecadas.' },
    { key:'rejuvenescimento', labels:['rejuvenescimento'], title:'Tratamento e Rejuvenescimento', subtitle:'Séruns, cremes e cuidados especiais para a rotina de skincare.' },
    { key:'shampoo', labels:['shampoos'], title:'Shampoos', subtitle:'Cuidados de limpeza para diferentes necessidades dos cabelos.' },
    { key:'tratamento-capilar', labels:['tratamento capilar'], title:'Tratamento Capilar', subtitle:'Condicionadores, séruns e tratamentos para fortalecimento dos fios.' },
    { key:'coloracao', labels:['coloracao'], title:'Coloração', subtitle:'Tinturas e opções para renovar a cor dos cabelos.' }
  ];

  let busy = false;
  let scheduled = false;

  const norm = (value='') => String(value)
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .trim().toLowerCase();

  function searchActive(){
    const a = document.querySelector('#busca')?.value?.trim();
    const b = document.querySelector('#busca-mobile')?.value?.trim();
    return Boolean(a || b);
  }

  function updateCatalogTitle(mode){
    const catalog = document.querySelector('.secao.catalogo');
    const title = catalog?.querySelector('.secao-titulo h2');
    if (!catalog || !title) return;
    if (mode === 'home') {
      catalog.classList.add('rocha-catalog-home');
      title.textContent = 'Produtos por categoria';
      document.body.classList.remove('rocha-search-mode');
    } else if (mode === 'search') {
      catalog.classList.remove('rocha-catalog-home');
      title.textContent = 'Resultados da busca';
      document.body.classList.add('rocha-search-mode');
    } else {
      catalog.classList.remove('rocha-catalog-home');
      document.body.classList.remove('rocha-search-mode');
    }
  }

  function unwrap(list){
    const cards = [...list.querySelectorAll('.rocha-section-row > .produto[data-product]')];
    if (!cards.length) {
      list.classList.remove('rocha-sectioned');
      list.dataset.rochaSectioned = '0';
      return;
    }
    list.replaceChildren(...cards);
    list.classList.remove('rocha-sectioned');
    list.dataset.rochaSectioned = '0';
  }

  function openCategory(key){
    const target = document.querySelector(`.categorias [data-category="${key}"]`) || document.querySelector(`.vitrine-categorias-lista [data-category="${key}"]`);
    if (target) target.click();
  }

  function categoryFromCard(card){
    const label = norm(card.querySelector('.produto-corpo > small')?.textContent || card.querySelector('.produto-corpo small')?.textContent || '');
    const def = defs.find(d => d.labels.includes(label));
    return def?.key || 'outros';
  }

  function makeSection(def, cards){
    const section = document.createElement('section');
    section.className = 'rocha-home-section';
    section.dataset.section = def.key;

    const head = document.createElement('div');
    head.className = 'rocha-section-head';
    head.innerHTML = `<div class="rocha-section-copy"><span class="rocha-section-kicker">${cards.length} ${cards.length === 1 ? 'produto' : 'produtos'}</span><h3>${def.title}</h3><p>${def.subtitle}</p></div><button type="button">Ver todos →</button>`;
    head.querySelector('button').addEventListener('click', () => openCategory(def.key));

    const row = document.createElement('div');
    row.className = 'rocha-section-row';
    cards.forEach(card => row.appendChild(card));

    section.append(head, row);
    return section;
  }

  function organize(){
    scheduled = false;
    if (busy) return;
    const list = document.querySelector('#lista-produtos');
    if (!list) return;

    const categoryMode = document.body.classList.contains('category-page-mode');
    const searching = searchActive();

    if (categoryMode || searching) {
      busy = true;
      try {
        if (list.classList.contains('rocha-sectioned')) unwrap(list);
        updateCatalogTitle(categoryMode ? 'category' : 'search');
      } finally { busy = false; }
      return;
    }

    if (list.classList.contains('rocha-sectioned') && list.querySelector('.rocha-home-section')) {
      updateCatalogTitle('home');
      return;
    }

    const cards = [...list.querySelectorAll(':scope > .produto[data-product]')];
    if (!cards.length) return;

    busy = true;
    try {
      const buckets = new Map(defs.map(d => [d.key, []]));
      const others = [];
      cards.forEach(card => {
        const key = categoryFromCard(card);
        if (buckets.has(key)) buckets.get(key).push(card);
        else others.push(card);
      });

      const fragment = document.createDocumentFragment();
      defs.forEach((def, index) => {
        const group = buckets.get(def.key);
        if (!group?.length) return;
        fragment.appendChild(makeSection(def, group));
        const remaining = defs.slice(index + 1).some(next => buckets.get(next.key)?.length) || others.length;
        if (remaining) {
          const divider = document.createElement('div');
          divider.className = 'rocha-section-divider';
          fragment.appendChild(divider);
        }
      });

      if (others.length) {
        fragment.appendChild(makeSection({key:'todos', title:'Outros produtos', subtitle:'Mais opções disponíveis na Drogaria Rocha.'}, others));
      }

      list.replaceChildren(fragment);
      list.classList.add('rocha-sectioned');
      list.dataset.rochaSectioned = '1';
      updateCatalogTitle('home');
    } finally { busy = false; }
  }

  function schedule(){
    if (scheduled || busy) return;
    scheduled = true;
    requestAnimationFrame(() => setTimeout(organize, 0));
  }

  function init(){
    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, { childList:true, subtree:true });
    document.addEventListener('input', (event) => {
      if (event.target?.matches?.('#busca, #busca-mobile')) setTimeout(schedule, 0);
    }, true);
    window.addEventListener('hashchange', () => setTimeout(schedule, 20));
    document.addEventListener('click', (event) => {
      if (event.target.closest('[data-category], .category-back')) setTimeout(schedule, 80);
    }, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
