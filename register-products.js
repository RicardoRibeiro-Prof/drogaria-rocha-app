
(function(){
  let itemIndex = null;

  function clean(v){ return String(v||"").replace(/\D/g,""); }

  function supplierLabel(s){
    return s==="eurofarma" ? "Eurofarma" : s==="medley" ? "Medley" : "Biolab";
  }

  function suggestedSupplier(name){
    const n = normalizeProductName(name);
    if(n.includes("MEDLEY")) return "medley";
    if(n.includes("EUROFARMA")) return "eurofarma";
    if(n.includes("BIOL") || n.includes("BIOLAB")) return "biolab";
    return "biolab";
  }

  function suggestedType(name){
    const raw = String(name||"").toUpperCase();
    if(raw.includes("BGN-G") || raw.includes("GENÉRICO") || raw.includes("GENERICO")) return "Genérico";
    return "A confirmar";
  }

  function ensureCustomProducts(){
    state.customProducts ??= {eurofarma:[],medley:[],biolab:[]};
    ["eurofarma","medley","biolab"].forEach(function(s){
      state.customProducts[s] ??= [];
    });
  }

  function loadCustom(){
    ensureCustomProducts();
    ["eurofarma","medley","biolab"].forEach(function(s){
      state.customProducts[s].forEach(function(cp){
        const exists = DATA[s].some(function(p){
          const a=clean(p.ean), b=clean(cp.ean);
          return (a && b && a===b) ||
            (!a && !b && normalizeProductName(p.produto)===normalizeProductName(cp.produto));
        });
        if(!exists) DATA[s].push(Object.assign({},cp,{custom:true}));
      });
    });
  }

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
          '<option value="A confirmar">A confirmar</option>'+
        '</select>'+
        '<div id="register-product-message" class="register-message"></div>'+
        '<div class="register-actions">'+
          '<button type="button" class="btn register-save" onclick="saveNfeProductRegistration()">Salvar cadastro</button>'+
          '<button type="button" class="btn secondary" onclick="closeNfeProductRegistration()">Cancelar</button>'+
        '</div>'+
      '</div>';

    document.body.appendChild(modal);

    const style=document.createElement("style");
    style.textContent=
      '.register-modal{position:fixed;inset:0;background:rgba(0,0,0,.62);z-index:10000;align-items:center;justify-content:center;padding:16px;pointer-events:auto}'+
      '.register-box{position:relative;z-index:10001;width:min(460px,100%);background:#fff;border-radius:12px;padding:18px;box-shadow:0 18px 50px rgba(0,0,0,.25);pointer-events:auto}'+
      '.register-title{font-size:18px;font-weight:800;color:var(--green);margin-bottom:10px}'+
      '.register-product{font-weight:700;line-height:1.3;margin-bottom:4px}'+
      '.register-ean{font-size:12px;color:var(--muted);font-family:monospace;margin-bottom:16px}'+
      '.register-label{display:block;font-size:12px;font-weight:700;margin:10px 0 5px;color:var(--text)}'+
      '.register-box select{width:100%}'+
      '.register-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}'+
      '.register-actions button{pointer-events:auto;cursor:pointer;touch-action:manipulation}'+
      '.register-save{min-width:140px}'+
      '.register-message{display:none;margin-top:10px;padding:8px 10px;border-radius:7px;font-size:12px}'+
      '.register-message.error{display:block;background:#fde8e7;color:#a61b13}'+
      '.register-message.success{display:block;background:#e6f3eb;color:#1f6b4f}'+
      '.register-btn{border:0;border-radius:6px;padding:6px 9px;background:var(--green2);color:#fff;font-size:11px;font-weight:700;cursor:pointer}';
    document.head.appendChild(style);
  }

  function modalMessage(text,type){
    const el=document.getElementById("register-product-message");
    if(!el) return;
    el.textContent=text||"";
    el.className="register-message "+(type||"");
  }

  window.openProductRegistration=function(index){
    ensureModal();
    if(!currentNfe || !currentNfe.items || !currentNfe.items[index]){
      alert("Não consegui localizar este item da nota.");
      return;
    }
    itemIndex=index;
    const it=currentNfe.items[index];
    document.getElementById("register-product-name").textContent=it.name||"Produto";
    document.getElementById("register-product-ean").textContent="EAN: "+(it.ean||"sem GTIN");
    document.getElementById("register-product-supplier").value=suggestedSupplier(it.name);
    document.getElementById("register-product-type").value=suggestedType(it.name);
    modalMessage("","");
    document.getElementById("register-product-modal").style.display="flex";
  };

  window.closeNfeProductRegistration=function(){
    itemIndex=null;
    const modal=document.getElementById("register-product-modal");
    if(modal) modal.style.display="none";
  };

  window.saveNfeProductRegistration=function(){
    try{
      if(itemIndex===null || !currentNfe || !currentNfe.items || !currentNfe.items[itemIndex]){
        modalMessage("O item da nota não está mais disponível. Feche e abra o cadastro novamente.","error");
        return;
      }

      const it=currentNfe.items[itemIndex];
      const supplier=document.getElementById("register-product-supplier").value;
      const tipo=normalizeTipo(document.getElementById("register-product-type").value);
      const ean=cleanEAN(it.ean);

      if(!supplier || !DATA[supplier]){
        modalMessage("Selecione um laboratório válido.","error");
        return;
      }

      // Primeiro verifica se já existe cadastro pelo EAN ou nome.
      let existing=findProductMatch(ean,it.name);
      if(existing){
        it.match=existing;
        const st=ps(existing.supplier,existing.index);
        if(tipo!=="A confirmar") st.tipoOverride=tipo;
        if(ean && !existing.product.ean && !st.eanOverride) st.eanOverride=ean;
        save();
        modalMessage("Produto associado ao cadastro existente.","success");
        setTimeout(function(){
          closeNfeProductRegistration();
          renderNfe();
          renderProducts(existing.supplier);
        },250);
        return;
      }

      // Novo cadastro persistente.
      const product={
        produto:it.name,
        ean:ean||"",
        tipo:tipo,
        custom:true
      };

      DATA[supplier].push(product);
      const index=DATA[supplier].length-1;

      ensureCustomProducts();
      state.customProducts[supplier].push(product);

      it.match={supplier:supplier,index:index,product:product};

      const st=ps(supplier,index);
      st.tipoOverride=tipo;
      if(ean) st.eanOverride=ean;

      save();

      modalMessage("Cadastro salvo com sucesso.","success");

      setTimeout(function(){
        closeNfeProductRegistration();
        renderProducts(supplier);
        renderNfe();
        nfeMessage("Produto cadastrado. Agora você pode confirmar a entrada da NF-e.","success");
      },250);

    }catch(err){
      console.error("Erro ao cadastrar produto:",err);
      modalMessage("Não foi possível salvar o cadastro: "+(err && err.message ? err.message : "erro inesperado")+".","error");
    }
  };

  // Sobrescreve apenas a apresentação dos itens da NF para incluir o botão Cadastrar.
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
        '<td>'+(it.match
          ? '<span class="status ok">'+esc(supplierLabel(it.match.supplier))+'</span>'
          : '<button type="button" class="register-btn" onclick="openProductRegistration('+index+')">Cadastrar</button>')+
        '</td>';

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
