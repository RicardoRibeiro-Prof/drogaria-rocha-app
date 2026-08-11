(() => {
  const items = [
    ['/drogaria-rocha-app/assets/banner-aprovado-higiene.webp?v=9','Ofertas de higiene e beleza'],
    ['/drogaria-rocha-app/assets/banner-aprovado-vitaminas.webp?v=9','Vitaminas para o seu dia'],
    ['/drogaria-rocha-app/assets/banner-aprovado-app.webp?v=9','Peça pelo app e receba com facilidade']
  ];

  function mount(){
    if(document.querySelector('#rocha-force-carousel')) return true;
    const anchor = document.querySelector('.vitrine-categorias') || document.querySelector('.atalhos') || document.querySelector('#catalogo') || document.querySelector('main#inicio');
    if(!anchor) return false;

    const section=document.createElement('section');
    section.id='rocha-force-carousel';
    section.setAttribute('aria-label','Destaques Drogaria Rocha');
    section.innerHTML=`<div class="rocha-force-window">${items.map((it,i)=>`<div class="rocha-force-slide ${i===0?'ativo':''}" data-i="${i}"><img src="${it[0]}" alt="${it[1]}" ${i===0?'fetchpriority="high"':''}></div>`).join('')}</div><div class="rocha-force-dots">${items.map((_,i)=>`<button type="button" class="${i===0?'ativo':''}" data-i="${i}" aria-label="Banner ${i+1}"></button>`).join('')}</div>`;

    anchor.parentNode.insertBefore(section,anchor);
    let current=0;
    const slides=[...section.querySelectorAll('.rocha-force-slide')];
    const dots=[...section.querySelectorAll('.rocha-force-dots button')];
    const show=(n)=>{current=n;slides.forEach((s,i)=>s.classList.toggle('ativo',i===n));dots.forEach((d,i)=>d.classList.toggle('ativo',i===n));};
    dots.forEach((d,i)=>d.addEventListener('click',()=>show(i)));
    setInterval(()=>show((current+1)%items.length),5000);
    section.querySelector('.rocha-force-window').addEventListener('click',()=>document.querySelector('#catalogo')?.scrollIntoView({behavior:'smooth',block:'start'}));
    return true;
  }

  if(!mount()){
    const ob=new MutationObserver(()=>{if(mount()) ob.disconnect();});
    ob.observe(document.documentElement,{childList:true,subtree:true});
    setTimeout(()=>ob.disconnect(),15000);
  }
})();