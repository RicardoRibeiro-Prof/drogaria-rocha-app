(() => {
  const defs = [
    { key:'protecao', labels:['protecao solar'], title:'Proteção Solar', subtitle:'Protetores faciais, corporais e opções com cor para o dia a dia.' },
    { key:'limpeza', labels:['limpeza'], title:'Limpeza Facial e Antiacne', subtitle:'Sabonetes, géis, águas micelares e cuidados para pele oleosa e acneica.' },
    { key:'hidratacao', labels:['hidratacao'], title:'Hidratação e Corpo', subtitle:'Cuidados para rosto, corpo, lábios e áreas ressecadas.' },
    { key:'rejuvenescimento', labels:['rejuvenescimento'], title:'Antissinais e Rejuvenescimento', subtitle:'Séruns, cremes e tratamentos para uma rotina completa de skincare.' },
    { key:'shampoo', labels:['shampoos'], title:'Shampoos', subtitle:'Cuidados de limpeza para diferentes necessidades dos cabelos.' },
    { key:'tratamento-capilar', labels:['tratamento capilar'], title:'Tratamento Capilar', subtitle:'Condicionadores, séruns e tratamentos para fortalecimento dos fios.' },
    { key:'coloracao', labels:['coloracao'], title:'Coloração', subtitle:'Tinturas e opções para renovar a cor dos cabelos.' }
  ];
  const brands=['Principia','Dermage','Bepantol','Neutrogena','Labotrat','Cicatricure','Anasol','Australian Gold','Calamed','Caladryl'];
  let busy=false, scheduled=false;

  const norm=(value='')=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
  const imported=(id)=>Number(id)>=1000&&Number(id)<2000;

  function searchActive(){
    return Boolean(document.querySelector('#busca')?.value?.trim() || document.querySelector('#busca-mobile')?.value?.trim());
  }

  function brandFromName(name=''){
    const lower=norm(name);
    const match=brands.find(b=>lower.startsWith(norm(b)) || lower.includes(norm(b)));
    return match || String(name).split(/\s+/)[0] || 'Drogaria Rocha';
  }

  function placeholderHTML(brand,detail=false){
    const initial=(brand||'R').charAt(0).toUpperCase();
    return `<div class="${detail?'rocha-detail-placeholder':'rocha-packshot-placeholder'}"><span class="rocha-packshot-mark">${initial}</span><strong class="rocha-packshot-brand">${brand}</strong><small class="rocha-packshot-note">${detail?'Imagem limpa do produto em atualização.':'Produto disponível em loja'}</small></div>`;
  }

  function polishImportedCard(card){
    if(!imported(card.dataset.product)) return;
    card.classList.add('produto-importado-foto');
    const wrap=card.querySelector('.produto-imagem');
    if(!wrap || wrap.querySelector('.rocha-packshot-placeholder')) return;
    const name=card.querySelector('h3')?.textContent?.trim()||'Produto';
    wrap.insertAdjacentHTML('beforeend',placeholderHTML(brandFromName(name),false));
  }

  function polishDetail(){
    const id=document.querySelector('#conteudo-produto [data-detail-add]')?.dataset.detailAdd;
    if(!imported(id)) return;
    const box=document.querySelector('#conteudo-produto .detalhe-imagem');
    if(!box || box.querySelector('.rocha-detail-placeholder')) return;
    const name=document.querySelector('#detalhe-nome')?.textContent?.trim()||'Produto';
    [...box.children].forEach(el=>{ if(!el.matches('b')) el.remove(); });
    box.insertAdjacentHTML('afterbegin',placeholderHTML(brandFromName(name),true));
  }

  function updateCatalogMode(mode){
    const catalog=document.querySelector('.secao.catalogo');
    if(!catalog) return;
    if(mode==='home'){
      catalog.classList.add('rocha-catalog-home');
      document.body.classList.add('rocha-home-sections-active');
      document.body.classList.remove('rocha-search-mode');
    }else{
      catalog.classList.remove('rocha-catalog-home');
      document.body.classList.remove('rocha-home-sections-active');
      document.body.classList.toggle('rocha-search-mode',mode==='search');
    }
  }

  function openCategory(key){
    const target=document.querySelector(`.categorias [data-category="${key}"]`)||document.querySelector(`.vitrine-categorias-lista [data-category="${key}"]`);
    if(target) target.click();
  }

  function categoryFromCard(card){
    const label=norm(card.querySelector('.produto-corpo > small')?.textContent||card.querySelector('.produto-corpo small')?.textContent||'');
    return defs.find(d=>d.labels.includes(label))?.key||'outros';
  }

  function ensureIntro(catalog){
    let intro=document.querySelector('#rocha-home-intro');
    if(intro) return intro;
    intro=document.createElement('section');
    intro.id='rocha-home-intro';
    intro.innerHTML=`<div class="rocha-home-intro-head"><div><span>COMPRE DO SEU JEITO</span><h2>Encontre por cuidado</h2></div><p>Uma vitrine organizada para você encontrar rápido o que precisa, sem misturar dezenas de produtos na mesma tela.</p></div><div class="rocha-brand-strip">${brands.map(b=>`<div class="rocha-brand-chip"><i>${b.charAt(0)}</i><strong>${b}</strong></div>`).join('')}</div>`;
    catalog.insertBefore(intro,catalog.querySelector('#lista-produtos'));
    return intro;
  }

  function makeSection(def,cards,total){
    const section=document.createElement('section');
    section.className='rocha-home-section';
    section.dataset.section=def.key;
    const head=document.createElement('div');
    head.className='rocha-section-head';
    head.innerHTML=`<div class="rocha-section-copy"><span class="rocha-section-kicker">${total} ${total===1?'produto':'produtos'}</span><h3>${def.title}</h3><p>${def.subtitle}</p></div><button type="button">Ver todos →</button>`;
    head.querySelector('button').addEventListener('click',()=>openCategory(def.key));
    const row=document.createElement('div');
    row.className='rocha-section-row';
    cards.forEach(card=>{polishImportedCard(card);row.appendChild(card)});
    section.append(head,row);
    return section;
  }

  function organize(){
    scheduled=false;
    if(busy) return;
    const list=document.querySelector('#lista-produtos');
    const catalog=document.querySelector('.secao.catalogo');
    if(!list||!catalog) return;

    polishDetail();
    [...list.querySelectorAll('.produto[data-product]')].forEach(polishImportedCard);

    const categoryMode=document.body.classList.contains('category-page-mode');
    const searching=searchActive();
    if(categoryMode||searching){
      updateCatalogMode(categoryMode?'category':'search');
      return;
    }

    const cards=[...list.querySelectorAll(':scope > .produto[data-product]')];
    if(!cards.length){
      if(list.classList.contains('rocha-sectioned')) return;
      return;
    }

    busy=true;
    try{
      ensureIntro(catalog);
      const buckets=new Map(defs.map(d=>[d.key,[]]));
      cards.forEach(card=>{
        const key=categoryFromCard(card);
        if(buckets.has(key)) buckets.get(key).push(card);
      });

      const fragment=document.createDocumentFragment();
      defs.forEach((def,index)=>{
        const group=buckets.get(def.key)||[];
        if(!group.length) return;
        fragment.appendChild(makeSection(def,group.slice(0,4),group.length));
        const more=defs.slice(index+1).some(next=>(buckets.get(next.key)||[]).length);
        if(more){const divider=document.createElement('div');divider.className='rocha-section-divider';fragment.appendChild(divider)}
      });
      list.replaceChildren(fragment);
      list.classList.add('rocha-sectioned');
      updateCatalogMode('home');
    }finally{busy=false}
  }

  function schedule(delay=30){
    if(scheduled||busy) return;
    scheduled=true;
    setTimeout(()=>requestAnimationFrame(organize),delay);
  }

  function init(){
    schedule(80);
    const observer=new MutationObserver(()=>schedule(60));
    observer.observe(document.documentElement,{childList:true,subtree:true});
    document.addEventListener('input',e=>{if(e.target?.matches?.('#busca,#busca-mobile')) schedule(40)},true);
    document.addEventListener('click',e=>{
      if(e.target.closest('[data-category],.category-back,[data-add],[data-remove],[data-detail-add],[data-detail-remove]')) schedule(100);
      setTimeout(polishDetail,60);
    },true);
    window.addEventListener('hashchange',()=>schedule(80));
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
