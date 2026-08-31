
(function(){
  function ensureModal(){
    if(document.getElementById("register-product-modal")) return;
    const modal=document.createElement("div");
    modal.id="register-product-modal";
    modal.className="register-modal";
    modal.style.display="none";
    modal.innerHTML=
      '<div class="register-box">'+
        '<div class="register-title">Cadastrar produto</div>'+
        '<div class="register-product" id="register-product-name">—</div>'+
        '<div class="register-ean" id="register-product-ean">EAN: —</div>'+
        '<label class="register-label">Laboratório</label>'+
        '<select id="register-product-supplier">'+
          '<option value="biolab">Biolab</option>'+
          '<option value="eurofarma">Eurofarma</option>'+
          '<option value="medley">Medley</option>'+
        '</select>'+
        '<label class="register-label">Tipo</label>'+
        '<select id="register-product-type">'+
          '<option value="Genérico">Genérico</option>'+
          '<option value="Não genérico">Não genérico</option>'+
          '<option value="A confirmar" selected>A confirmar</option>'+
        '</select>'+
        '<div class="register-actions">'+
          '<button class="btn" id="register-save-btn">Salvar cadastro</button>'+
          '<button class="btn secondary" id="register-cancel-btn">Cancelar</button>'+
        '</div>'+
      '</div>';
    document.body.appendChild(modal);

    const style=document.createElement("style");
    style.textContent=
      '.register-modal{position:fixed;inset:0;background:rgba(0,0,0,.62);z-index:1000;align-items:center;justify-content:center;padding:16px}'+
      '.register-box{width:min(460px,100%);background:#fff;border-radius:12px;padding:18px;box-shadow:0 18px 50px rgba(0,0,0,.25)}'+
      '.register-title{font-size:18px;font-weight:800;color:var(--green);margin-bottom:10px}'+
      '.register-product{font-weight:700;line-height:1.3;margin-bottom:4px}'+
      '.register-ean{font-size:12px;color:var(--muted);font-family:monospace;margin-bottom:16px}'+
      '.register-label{display:block;font-size:12px;font-weight:700;margin:10px 0 5px;color:var(--text)}'+
      '.register-box select{width:100%}'+
      '.register-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}'+
      '.register-btn{border:0;border-radius:6px;padding:6px 9px;background:var(--green2);color:#fff;font-size:11px;font-weight:700;cursor:pointer}';
    document.head.appendChild(style);

    document.getElementById("register-save-btn").onclick=saveRegistration;
    document.getElementById("register-cancel-btn").onclick=closeRegistration;
  }

  function clean(v){return String(v||"").replace(/\D/g,"");}
  function loadCustom(){
    state.customProducts ??= {eurofarma:[],medley:[],biolab:[]};
    ["eurofarma","medley","biolab"].forEach(function(s){
      state.customProducts[s] ??= [];
      state.customProducts[s].forEach(function(cp){
        const exists=DATA[s].some(function(p){
          const a=clean(p.ean), b=clean(cp.ean);
          return (a&&b&&a===b) || (!a&&!b&&normalizeProductName(p.produto)===normalizeProductName(cp.produto));
        });
        if(!exists) DATA[s].push(Object.assign({},cp,{custom:true}));
      });
    });
  }

  function supplierLabel(s){
    return s==="eurofarma"?"Eurofarma":s==="medley"?"Medley":"Biolab";
  }
  function suggestedSupplier(name){
    const n=normalizeProductName(name);
    if(n.includes("MEDLEY")) return "medley";
    if(n.includes("EUROFARMA")) return "eurofarma";
    if(n.includes("BIOL")||n.includes("BIOLAB")) return "biolab";
    return "biolab";
  }

  let itemIndex=null;
  window.openProductRegistration=function(index){
    ensureModal();
    if(!currentNfe || !currentNfe.items[index]) return;
    itemIndex=index;
    const it=currentNfe.items[index];
    document.getElementById("register-product-name").textContent=it.name||"Produto";
    document.getElementById("register-product-ean").textContent="EAN: "+(it.ean||"sem GTIN");
    document.getElementById("register-product-supplier").value=suggestedSupplier(it.name);
    document.getElementById("register-product-type").value="A confirmar";
    document.getElementById("register-product-modal").style.display="flex";
  };

  function closeRegistration(){
    itemIndex=null;
    document.getElementById("register-product-modal").style.display="none";
  }

  function saveRegistration(){
    if(itemIndex===null || !currentNfe) return;
    const it=currentNfe.items[itemIndex];
    const supplier=document.getElementById("register-product-supplier").value;
    const tipo=normalizeTipo(document.getElementById("register-product-type").value);
    const ean=cleanEAN(it.ean);

    let existing=findProductMatch(ean,it.name);
    if(existing){
      it.match=existing;
      const st=ps(existing.supplier,existing.index);
      if(tipo!=="A confirmar") st.tipoOverride=tipo;
      if(ean && !existing.product.ean && !st.eanOverride) st.eanOverride=ean;
      save();
      closeRegistration();
      renderNfe();
      return;
    }

    const product={produto:it.name,ean:ean||"",tipo:tipo,custom:true};
    DATA[supplier].push(product);
    const index=DATA[supplier].length-1;

    state.customProducts ??= {eurofarma:[],medley:[],biolab:[]};
    state.customProducts[supplier] ??= [];
    state.customProducts[supplier].push(product);

    it.match={supplier:supplier,index:index,product:product};
    const st=ps(supplier,index);
    st.tipoOverride=tipo;
    if(ean) st.eanOverride=ean;
    save();

    closeRegistration();
    renderProducts(supplier);
    renderNfe();
    nfeMessage("Produto cadastrado. Agora você pode confirmar a entrada da NF-e.","success");
  }

  const originalRenderNfe=window.renderNfe || renderNfe;
  window.renderNfe=function(){
    if(!currentNfe) return;
    document.getElementById("nfe-summary").style.display="grid";
    document.getElementById("nfe-items-wrap").style.display="block";
    document.getElementById("nfe-actions").style.display="flex";
    document.getElementById("nfe-supplier").textContent=currentNfe.supplier||"—";
    document.getElementById("nfe-number").textContent=(currentNfe.number||"—")+(currentNfe.series?" / Série "+currentNfe.series:"");
    document.getElementById("nfe-date").textContent=formatDateBR(currentNfe.date);
    document.getElementById("nfe-total").textContent=money(currentNfe.total);

    let matched=0;
    const body=document.getElementById("nfe-items-body");
    body.innerHTML="";
    currentNfe.items.forEach(function(it,index){
      if(it.match) matched++;
      const tr=document.createElement("tr");
      if(!it.match) tr.classList.add("unmatched");
      tr.innerHTML=
        '<td><div class="nfe-product-name">'+esc(it.name)+'</div><div class="product-ean">EAN: '+esc(it.ean||"sem GTIN")+'</div></td>'+
        '<td>'+(it.match?typeBadge(getProductType(it.match.supplier,it.match.index)):typeBadge("A confirmar"))+'</td>'+
        '<td>'+it.qty+'</td>'+
        '<td>'+money(it.unit)+'</td>'+
        '<td>'+money(it.discount)+'</td>'+
        '<td><b>'+money(it.netUnit)+'</b></td>'+
        '<td>'+(it.match?'<span class="status ok">'+esc(supplierLabel(it.match.supplier))+'</span>':'<button class="register-btn" onclick="openProductRegistration('+index+')">Cadastrar</button>')+'</td>';
      body.appendChild(tr);
    });
    const missing=currentNfe.items.length-matched;
    nfeMessage(
      currentNfe.items.length+" itens lidos • "+matched+" cadastrados"+(missing?" • "+missing+" para cadastrar":""),
      missing?"warn":"success"
    );
  };

  loadCustom();
  ensureModal();
  try{renderProducts("eurofarma");}catch(e){}
  try{renderProducts("medley");}catch(e){}
  try{renderProducts("biolab");}catch(e){}
})();
