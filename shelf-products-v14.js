(() => {
  const I=window.ROCHA_SHELF_IMAGES||{};
  const RAW=[[1001,"Principia Sérum Capilar SC-01","Sérum capilar com Baicapil, cafeína e complexo fortalecedor.","tratamento-capilar","principia-serum-capilar"],[1002,"Principia Shampoo Antiqueda AQ-01","Shampoo para cuidados contra queda e enfraquecimento dos fios • 250 ml.","shampoo","principia-shampoo-antiqueda"],[1003,"Principia Condicionador Antiqueda AQ-01","Condicionador para cuidados contra queda e fortalecimento dos fios • 250 ml.","tratamento-capilar","principia-condicionador-antiqueda"],[1004,"Principia Loção Hidratante LH-02 200 ml","Loção hidratante para pele sensível, seca e extrasseca.","hidratacao","principia-lh02"],[1005,"Principia Loção Hidratante LH-02 500 ml","Loção hidratante para pele sensível, seca e extrasseca • embalagem econômica.","hidratacao","principia-lh02"],[1006,"Principia Loção Hidratante LH-01","Loção hidratante corporal com ureia, glicerina e óleo vegetal.","hidratacao","principia-lh02"],[1007,"Principia Emulsão Corporal EC-01","Emulsão corporal para hidratação e cuidado diário da pele.","hidratacao","principia-lh02"],[1008,"Principia Gel de Limpeza GL-01","Gel de limpeza facial para oleosidade e poros.","limpeza","principia-gl01"],[1009,"Principia Gel de Limpeza GL-02","Gel de limpeza facial para oleosidade, viço e poros dilatados.","limpeza","principia-gl01"],[1010,"Principia Gel de Limpeza GL-03","Gel de limpeza para pele sensível e seca.","limpeza","principia-gl01"],[1011,"Principia Protetor Solar PS-01 FPS 40","Protetor solar facial fluido, toque seco e alta proteção.","protecao","principia-ps01-fps60"],[1012,"Principia Protetor Solar PS-01 FPS 60","Protetor solar facial fluido, toque seco e alta proteção.","protecao","principia-ps01-fps60"],[1013,"Principia Protetor Solar PS-01 FPS 99","Protetor solar facial fluido, toque seco e alta proteção.","protecao","principia-ps01-fps60"],[1014,"Principia Protetor Solar com Cor PS-05 FPS 70","Protetor solar facial com cor e cobertura de base.","protecao","principia-ps01-fps60"],[1015,"Principia Protetor Solar Corporal PS-03","Protetor solar corporal em diferentes fatores de proteção.","protecao","principia-ps01-fps60"],[1016,"Principia Gel Hidratante GH-01","Gel hidratante facial com ácidos hialurônicos e glicerina • 50 g.","hidratacao","principia-facial-serums"],[1017,"Principia Creme Calmante Multirreparador CM-01","Creme calmante e multirreparador para pele sensibilizada • 40 g.","hidratacao","principia-facial-serums"],[1018,"Principia Tônico AL-7","Tônico facial para oleosidade, impurezas e poros • 120 ml.","limpeza","principia-facial-serums"],[1019,"Principia Creme para Área dos Olhos CO-01","Creme para cuidados de rugas, linhas finas, olheiras e bolsas • 15 g.","rejuvenescimento","principia-facial-serums"],[1020,"Principia Sérum Facial VC-10","Sérum facial de vitamina C para cuidados antioxidantes • 30 ml.","rejuvenescimento","principia-facial-serums"],[1021,"Principia Sérum Facial Retinol RN-0.3","Sérum facial com retinol para rotina de cuidados com a pele • 30 ml.","rejuvenescimento","principia-facial-serums"],[1022,"Principia Sérum Facial Mix-01","Sérum facial para oleosidade, poros e textura da pele • 30 ml.","rejuvenescimento","principia-facial-serums"],[1023,"Principia Sérum Facial Mix-02","Sérum facial para cuidados com olheiras e tonalidade da pele • 30 ml.","rejuvenescimento","principia-facial-serums"],[1024,"Principia Sérum Facial Mix-03","Sérum facial para hidratação, textura e cuidado diário • 30 ml.","rejuvenescimento","principia-facial-serums"],[1025,"Principia Sérum Facial AM-10","Sérum facial para cuidados com acne, oleosidade e uniformidade.","rejuvenescimento","principia-facial-serums"],[1026,"Dermage Photoage Water Sport FPS 50","Protetor solar facial resistente à água e ao suor.","protecao","dermage-photoage-water-sport"],[1027,"Dermage Photoage Mineral Fluido FPS 50","Protetor solar facial mineral em textura fluida.","protecao","dermage-photoage-mineral-fluido"],[1028,"Dermage Photoage Stick Color","Protetor solar em bastão com opções de cor e alta proteção.","protecao","dermage-photoage-stick"],[1029,"Dermage Improve C","Produto antioxidante para rotina de cuidados faciais.","rejuvenescimento","dermage-improve-c"],[1030,"Dermage Improve C10","Sérum antioxidante para cuidados diários da pele.","rejuvenescimento","dermage-acqua-filler"],[1031,"Dermage Improve C20","Sérum antioxidante de maior concentração para rotina facial.","rejuvenescimento","dermage-acqua-filler"],[1032,"Dermage Acqua Filler","Hidratante facial para cuidado e hidratação diária.","hidratacao","dermage-acqua-filler"],[1033,"Dermage Photoage Bruma FPS 50","Bruma facial com proteção solar.","protecao","dermage-acqua-filler"],[1034,"Dermage Secatriz Acne Free Spray","Spray secativo corporal para cuidados com pele acneica.","limpeza","dermage-secatriz-acne-free"],[1035,"Dermage Secatriz Acne Spot","Produto secativo localizado para cuidados com acne.","limpeza","dermage-secatriz-acne-free"],[1036,"Bepantol Derma Regenerador Labial","Balm labial para hidratação e regeneração dos lábios.","hidratacao","bepantol-regenerador-labial"],[1037,"Bepantol Derma Toque Seco","Hidratante de toque seco para áreas ressecadas.","hidratacao","bepantol-toque-seco"],[1038,"Bepantol Derma Hidratante Multirrestaurador Rosa Mosqueta","Hidratante multirrestaurador para cuidado da pele.","hidratacao","bepantol-toque-seco"],[1039,"Bepantol Tattoo Creme Restaurador","Creme restaurador para cuidado da pele tatuada.","hidratacao","bepantol-tattoo"],[1040,"Calamed Pós-Sol Loção","Loção pós-sol para cuidado e conforto da pele.","hidratacao","calamed-pos-sol"],[1041,"Caladryl Loção Pós-Sol","Loção pós-sol para cuidado da pele após exposição solar.","hidratacao","caladryl-pos-sol"],[1042,"Neutrogena Body Care Intensive Hidrata & Repara","Loção corporal intensiva para pele seca e extrasseca.","hidratacao","neutrogena-bodycare-repara"],[1043,"Neutrogena Body Care Intensive Hidrata & Suaviza","Loção corporal para hidratação diária da pele.","hidratacao","neutrogena-bodycare-repara"],[1044,"Neutrogena Sun Fresh Facial FPS 30","Protetor solar facial para uso diário.","protecao","neutrogena-sun"],[1045,"Neutrogena Sun Fresh Facial FPS 70","Protetor solar facial de alta proteção.","protecao","neutrogena-sun"],[1046,"Neutrogena Sun Fresh Derm Care FPS 70","Protetor solar facial da linha Derm Care.","protecao","neutrogena-sun"],[1047,"Neutrogena Sun Fresh Derm Care FPS 80","Protetor solar facial fluido de alta proteção.","protecao","neutrogena-sun"],[1048,"Labotrat Sabonete Esfoliante Antiacne","Sabonete facial esfoliante para rotina de limpeza da pele.","limpeza","labotrat-antiacne"],[1049,"Labotrat Sabonete Facial Antiacne","Sabonete facial para rotina de cuidados com pele acneica.","limpeza","labotrat-line"],[1050,"Labotrat Sabonete Facial Ácido Glicólico","Sabonete facial com ácido glicólico para rotina de limpeza.","limpeza","labotrat-line"],[1051,"Labotrat Sabonete Facial Clareador","Sabonete facial para limpeza e uniformização da aparência da pele.","limpeza","labotrat-line"],[1052,"Labotrat Sabonete Facial Vitamina C","Sabonete facial com vitamina C.","limpeza","labotrat-line"],[1053,"Labotrat Kit Vitamina C","Kit de cuidados faciais com sabonete, água micelar e sérum.","rejuvenescimento","labotrat-line"],[1054,"Cicatricure Creme Corporal Antiestrias","Creme corporal para rotina de cuidados com estrias.","rejuvenescimento","cicatricure-line"],[1055,"Cicatricure Protetor Solar FPS 50","Protetor solar facial com alta proteção.","protecao","cicatricure-line"],[1056,"Cicatricure Gold Lift Creme Diurno FPS 30","Creme facial diurno com proteção solar.","rejuvenescimento","cicatricure-line"],[1057,"Cicatricure Gold Lift Creme Noturno","Creme facial noturno para rotina de cuidados com a pele.","rejuvenescimento","cicatricure-line"],[1058,"Cicatricure Rugas, Bolsas e Olheiras","Produto para cuidados da área dos olhos.","rejuvenescimento","cicatricure-line"],[1059,"Cicatricure Água Micelar 5 em 1","Água micelar para limpeza diária do rosto, olhos e lábios.","limpeza","cicatricure-line"],[1060,"Anasol CC Cream FPS 50","Protetor solar facial com cor em textura de CC Cream.","protecao","anasol-line"],[1061,"Anasol BB Cream FPS 50","Protetor solar facial com cor em textura de BB Cream.","protecao","anasol-line"],[1062,"Anasol Protetor Solar FPS 30","Protetor solar corporal de uso diário.","protecao","anasol-line"],[1063,"Anasol Protetor Solar FPS 50","Protetor solar corporal de alta proteção.","protecao","anasol-line"],[1064,"Australian Gold Antiox Complex","Protetor solar corporal com complexo antioxidante.","protecao","australian-gold"]];
  const EXTRAS=RAW.map(([id,name,description,category,imageKey])=>({id,name,description,category,price:0,badge:'Em loja',image_url:I[imageKey]||'',active:true}));
  const imported=(id)=>Number(id)>=1000&&Number(id)<2000;
  const originalFetch=window.fetch.bind(window);

  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:(input&&input.url)||'';
    const method=String((init&&init.method)||(input&&input.method)||'GET').toUpperCase();
    const res=await originalFetch(input,init);
    if(method!=='GET'||!url.includes('/rest/v1/products')) return res;
    try{
      const data=await res.clone().json();
      if(!Array.isArray(data)) return res;
      const ids=new Set(data.map(x=>Number(x.id)));
      const merged=data.concat(EXTRAS.filter(x=>!ids.has(Number(x.id))));
      const headers=new Headers(res.headers);
      headers.set('content-type','application/json; charset=utf-8');
      return new Response(JSON.stringify(merged),{status:res.status,statusText:res.statusText,headers});
    }catch(_){return res;}
  };

  function cartHasImported(){return [...document.querySelectorAll('#conteudo-carrinho [data-cart-add]')].some(b=>imported(b.dataset.cartAdd));}

  function polish(){
    document.querySelectorAll('.produto[data-product]').forEach(card=>{
      if(!imported(card.dataset.product)) return;
      card.classList.add('produto-importado-foto');
      const price=card.querySelector('.preco-info>strong,.produto-preco,.preco');
      const note=card.querySelector('.preco-info>small');
      if(price) price.textContent='Consultar';
      if(note) note.textContent='Preço confirmado pela loja';
    });
    const detailId=document.querySelector('#conteudo-produto [data-detail-add]')?.dataset.detailAdd;
    if(imported(detailId)){
      const strong=document.querySelector('#conteudo-produto .detalhe-preco strong');
      const small=document.querySelector('#conteudo-produto .detalhe-preco small');
      const p=document.querySelector('#conteudo-produto .detalhe-preco p');
      if(strong) strong.textContent='Consultar preço';
      if(small) small.textContent='Preço e estoque na loja';
      if(p) p.textContent='A Drogaria Rocha confirmará o valor e a disponibilidade antes da finalização.';
    }
    document.querySelectorAll('#conteudo-carrinho .item-carrinho').forEach(row=>{
      const id=row.querySelector('[data-cart-add]')?.dataset.cartAdd;
      if(!imported(id)) return;
      const small=row.querySelector(':scope>div>small');
      if(small) small.textContent='Preço a confirmar';
    });
    if(cartHasImported()){
      const strong=document.querySelector('#conteudo-carrinho .resumo strong');
      const small=document.querySelector('#conteudo-carrinho .resumo small');
      if(strong) strong.textContent='A confirmar';
      if(small) small.textContent='A equipe confirmará os valores e a disponibilidade antes de fechar o pedido.';
    }
    const admin=document.querySelector('#conteudo-admin .admin-lista');
    if(admin){
      admin.querySelectorAll('.admin-produto[data-id]').forEach(form=>{if(imported(form.dataset.id)) form.remove();});
      if(!document.querySelector('#shelf-import-notice')){
        const n=document.createElement('div');
        n.id='shelf-import-notice';
        n.style.cssText='margin:12px 0;padding:12px 14px;border:1px solid #ffe0d0;border-radius:12px;background:#fff8f4;color:#63301a;font-size:11px;line-height:1.45';
        n.innerHTML='<strong>Produtos das fotos publicados</strong><br>Os 64 itens identificados nas fotos da loja estão no catálogo. Preços ficam como “Consultar” até a conferência.';
        admin.parentNode.insertBefore(n,admin);
      }
    }
  }

  document.addEventListener('submit',async(e)=>{
    if(!(e.target instanceof HTMLFormElement)||e.target.id!=='checkout'||!cartHasImported()) return;
    let session=null;
    try{session=JSON.parse(localStorage.getItem('dr-customer-session')||'null')}catch(_){}
    if(!session) return;
    const form=e.target;
    if(!form.reportValidity()) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const fd=new FormData(form);
    const rows=[...document.querySelectorAll('#conteudo-carrinho .item-carrinho')];
    const lines=rows.map(row=>{const name=row.querySelector(':scope>div>strong')?.textContent?.trim()||'Produto';const qty=row.querySelector('.controle b')?.textContent?.trim()||'1';return `• ${qty}x ${name}`;});
    const msg=['Olá, Drogaria Rocha! Gostaria de solicitar este pedido:','',...lines,'','Valores e disponibilidade: a confirmar pela drogaria.',`Cliente: ${fd.get('nome')}`,`Recebimento: ${fd.get('tipo')==='entrega'?'Entrega':'Retirada na drogaria'}`,fd.get('tipo')==='entrega'?`Endereço: ${fd.get('endereco')}`:'',fd.get('observacoes')?`Observações: ${fd.get('observacoes')}`:'','','Aguardo a confirmação do valor final.'].filter(Boolean).join('\n');
    try{if(navigator.share) await navigator.share({title:'Pedido - Drogaria Rocha',text:msg});else window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`,'_blank','noopener,noreferrer');}
    catch(err){if(err?.name!=='AbortError'){try{await navigator.clipboard?.writeText(msg)}catch(_){}window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`,'_blank','noopener,noreferrer');}}
  },true);

  const observer=new MutationObserver(()=>requestAnimationFrame(polish));
  document.addEventListener('DOMContentLoaded',()=>{observer.observe(document.documentElement,{childList:true,subtree:true});setTimeout(polish,100);});
})();