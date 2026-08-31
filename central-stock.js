
(function(){
  const SB_URL="https://khmowqmmwdrornfgrbpi.supabase.co";
  const SB_KEY="sb_publishable_oUgMPwAr5mUSeW3Pxgl6DA_p_-7CwZx";
  const AUTH_KEY="drogaria_rocha_central_auth_v1";
  const STORE_KEY="drogaria_rocha_central_store_v1";
  const EMAIL_KEY="drogaria_rocha_admin_email_v1";
  const LAB_TO_SUPPLIER={"Eurofarma":"eurofarma","Medley":"medley","Biolab":"biolab"};
  const SUPPLIER_TO_LAB={eurofarma:"Eurofarma",medley:"Medley",biolab:"Biolab"};

  let auth=null;
  try{auth=JSON.parse(localStorage.getItem(AUTH_KEY)||"null");}catch(e){}
  let currentStore=Number(localStorage.getItem(STORE_KEY)||1);
  let centralProducts=[];
  let centralInventory=[];
  let centralLoaded=false;
  let loadingCentral=false;
  const localBackup=JSON.parse(JSON.stringify(typeof state!=="undefined"?state:{}));

  function esc2(v){
    return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  }
  function cleanEan(v){return String(v||"").replace(/\D/g,"");}
  function norm(v){
    if(typeof normalizeProductName==="function") return normalizeProductName(v);
    return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/[^A-Z0-9]+/g," ").replace(/\s+/g," ").trim();
  }
  function centralStatus(text,type){
    const el=document.getElementById("central-sync-status");
    if(!el)return;
    el.textContent=text||"";
    el.className="central-sync-status "+(type||"");
  }

  function injectUI(){
    const style=document.createElement("style");
    style.textContent=
      '.central-login{position:fixed;inset:0;background:rgba(18,31,25,.78);z-index:20000;display:none;align-items:center;justify-content:center;padding:16px}'+
      '.central-login-box{width:min(420px,100%);background:#fff;border-radius:14px;padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.35)}'+
      '.central-login-title{font-size:20px;font-weight:800;color:var(--green);margin-bottom:6px}'+
      '.central-login-sub{font-size:13px;color:var(--muted);margin-bottom:14px;line-height:1.4}'+
      '.central-login label{display:block;font-size:12px;font-weight:700;margin:10px 0 5px}'+
      '.central-login input{width:100%}'+
      '.central-login-actions{display:flex;gap:8px;margin-top:14px}'+
      '.central-login-msg{margin-top:10px;font-size:12px;color:#a61b13;min-height:16px}'+
      '.central-bar{max-width:1180px;margin:10px auto 0;padding:9px 14px;background:#f7faf8;border:1px solid var(--border);border-radius:9px;display:none;align-items:center;gap:10px;flex-wrap:wrap}'+
      '.central-bar label{font-size:12px;font-weight:700;color:var(--text)}'+
      '.central-bar select{padding:7px;min-width:190px}'+
      '.central-sync-status{font-size:12px;color:var(--muted);margin-left:auto}'+
      '.central-sync-status.ok{color:#1f6b4f;font-weight:700}'+
      '.central-sync-status.error{color:#a61b13;font-weight:700}'+
      '.central-logout{border:0;background:transparent;color:#6c757d;font-size:12px;cursor:pointer;text-decoration:underline}'+
      '@media(max-width:760px){.central-bar{margin:8px 10px 0}.central-sync-status{width:100%;margin-left:0}}';
    document.head.appendChild(style);

    const login=document.createElement("div");
    login.id="central-login";
    login.className="central-login";
    login.innerHTML=
      '<div class="central-login-box">'+
        '<div class="central-login-title">Estoque central</div>'+
        '<div class="central-login-sub">Entre com o acesso administrativo da Drogaria Rocha para sincronizar o estoque entre computador e celular.</div>'+
        '<label>E-mail</label>'+
        '<input id="central-email" type="email" autocomplete="username" placeholder="E-mail do administrador">'+
        '<label>Senha</label>'+
        '<input id="central-password" type="password" autocomplete="current-password" placeholder="Senha">'+
        '<div class="central-login-actions"><button type="button" class="btn" id="central-login-btn">Entrar</button></div>'+
        '<div id="central-login-msg" class="central-login-msg"></div>'+
      '</div>';
    document.body.appendChild(login);
    document.getElementById("central-email").value=localStorage.getItem(EMAIL_KEY)||"";
    document.getElementById("central-login-btn").onclick=loginCentral;
    document.getElementById("central-password").addEventListener("keydown",e=>{if(e.key==="Enter")loginCentral();});

    const bar=document.createElement("div");
    bar.id="central-bar";
    bar.className="central-bar";
    bar.innerHTML=
      '<label>Loja</label><select id="central-store"></select>'+
      '<span id="central-sync-status" class="central-sync-status">Conectando…</span>'+
      '<button type="button" class="central-logout" id="central-logout">Sair</button>';
    const nav=document.querySelector("nav");
    if(nav) nav.insertAdjacentElement("afterend",bar);
    document.getElementById("central-store").onchange=async function(){
      currentStore=Number(this.value||1);
      localStorage.setItem(STORE_KEY,String(currentStore));
      await loadCentralStock(true);
    };
    document.getElementById("central-logout").onclick=function(){
      localStorage.removeItem(AUTH_KEY);
      auth=null;
      centralLoaded=false;
      document.getElementById("central-bar").style.display="none";
      showLogin("Sessão encerrada.");
    };

    const footer=document.querySelector("footer");
    if(footer) footer.textContent="Estoque sincronizado no banco central da Drogaria Rocha.";
  }

  function showLogin(msg){
    const login=document.getElementById("central-login");
    if(login) login.style.display="flex";
    const m=document.getElementById("central-login-msg");
    if(m) m.textContent=msg||"";
  }
  function hideLogin(){
    const login=document.getElementById("central-login");
    if(login) login.style.display="none";
    const bar=document.getElementById("central-bar");
    if(bar) bar.style.display="flex";
  }

  async function authRequest(path,body){
    const r=await fetch(SB_URL+path,{
      method:"POST",
      headers:{"apikey":SB_KEY,"Content-Type":"application/json"},
      body:JSON.stringify(body)
    });
    const data=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(data.msg||data.error_description||data.message||"Falha de autenticação");
    return data;
  }
  async function loginCentral(){
    const email=document.getElementById("central-email").value.trim();
    const password=document.getElementById("central-password").value;
    const msg=document.getElementById("central-login-msg");
    if(!email||!password){msg.textContent="Informe e-mail e senha.";return;}
    msg.textContent="Entrando…";
    try{
      auth=await authRequest("/auth/v1/token?grant_type=password",{email,password});
      localStorage.setItem(AUTH_KEY,JSON.stringify(auth));
      localStorage.setItem(EMAIL_KEY,email);
      document.getElementById("central-password").value="";
      hideLogin();
      await loadStores();
      await loadCentralStock(true);
    }catch(e){
      console.error(e);
      msg.textContent="Não foi possível entrar. Verifique o acesso administrativo.";
    }
  }
  async function refreshAuth(){
    if(!auth?.refresh_token) throw new Error("Sem sessão");
    auth=await authRequest("/auth/v1/token?grant_type=refresh_token",{refresh_token:auth.refresh_token});
    localStorage.setItem(AUTH_KEY,JSON.stringify(auth));
    return auth;
  }
  async function sbFetch(path,opts={},retry=true){
    if(!auth?.access_token) throw new Error("LOGIN_REQUIRED");
    const headers=Object.assign({
      "apikey":SB_KEY,
      "Authorization":"Bearer "+auth.access_token,
      "Content-Type":"application/json"
    },opts.headers||{});
    const r=await fetch(SB_URL+path,Object.assign({},opts,{headers}));
    if(r.status===401 && retry && auth?.refresh_token){
      await refreshAuth();
      return sbFetch(path,opts,false);
    }
    if(!r.ok){
      const data=await r.json().catch(()=>({}));
      throw new Error(data.message||data.error||("Erro "+r.status));
    }
    if(r.status===204)return null;
    const txt=await r.text();
    return txt?JSON.parse(txt):null;
  }
  async function publicFetch(path){
    const r=await fetch(SB_URL+path,{headers:{"apikey":SB_KEY}});
    if(!r.ok) throw new Error("Falha ao carregar lojas");
    return r.json();
  }

  async function loadStores(){
    const stores=await publicFetch("/rest/v1/stores?select=id,name&active=eq.true&order=id.asc");
    const sel=document.getElementById("central-store");
    sel.innerHTML="";
    stores.forEach(s=>{
      const o=document.createElement("option");
      o.value=s.id;o.textContent=s.name;
      if(Number(s.id)===currentStore)o.selected=true;
      sel.appendChild(o);
    });
    if(!stores.some(s=>Number(s.id)===currentStore) && stores.length){
      currentStore=Number(stores[0].id);
      sel.value=String(currentStore);
      localStorage.setItem(STORE_KEY,String(currentStore));
    }
  }

  function mapCentralProducts(){
    const byLab={eurofarma:[],medley:[],biolab:[]};
    centralProducts.forEach(cp=>{
      const s=LAB_TO_SUPPLIER[cp.laboratory];
      if(s)byLab[s].push(cp);
    });

    ["eurofarma","medley","biolab"].forEach(s=>{
      (DATA[s]||[]).forEach(p=>{delete p.centralId;});
      byLab[s].forEach(cp=>{
        const e=cleanEan(cp.ean);
        let idx=-1;
        if(e) idx=DATA[s].findIndex(p=>cleanEan(p.ean||ps(s,DATA[s].indexOf(p)).eanOverride||"")===e);
        if(idx<0) idx=DATA[s].findIndex(p=>norm(p.produto)===norm(cp.name));
        if(idx<0){
          DATA[s].push({produto:cp.name,ean:cp.ean||"",tipo:cp.medicine_type,centralCustom:true});
          idx=DATA[s].length-1;
        }
        DATA[s][idx].centralId=Number(cp.id);
        if(cp.ean)DATA[s][idx].ean=cp.ean;
        DATA[s][idx].tipo=cp.medicine_type;
      });
    });
  }

  function applyCentralInventory(){
    const invMap=new Map(centralInventory.map(i=>[Number(i.stock_product_id),i]));
    ["eurofarma","medley","biolab"].forEach(s=>{
      DATA[s].forEach((p,i)=>{
        if(!p.centralId)return;
        const inv=invMap.get(Number(p.centralId))||{};
        const st=ps(s,i);
        st.centralId=Number(p.centralId);
        st.stock=Number(inv.quantity||0);
        st.min=Number(inv.minimum_stock||0);
        if(inv.last_cost!==null&&inv.last_cost!==undefined)st.lastCost=Number(inv.last_cost);
        else delete st.lastCost;
        if(inv.last_gross_cost!==null&&inv.last_gross_cost!==undefined)st.lastGross=Number(inv.last_gross_cost);
        if(inv.last_discount!==null&&inv.last_discount!==undefined)st.lastDiscount=Number(inv.last_discount);
        st.lastEntry=inv.last_entry_at||"";
        st.lastNfeKey=inv.last_nfe_key||"";
        st.lastNfe=inv.last_nfe_number||"";
      });
      try{renderProducts(s);}catch(e){console.error(e);}
    });
    try{save();}catch(e){}
  }

  function findCentralForSnapshot(s,p,st){
    const e=cleanEan(p?.ean||st?.eanOverride||"");
    if(e){
      const cp=centralProducts.find(x=>cleanEan(x.ean)===e);
      if(cp)return cp;
    }
    if(p){
      const lab=SUPPLIER_TO_LAB[s];
      const cp=centralProducts.find(x=>x.laboratory===lab&&norm(x.name)===norm(p.produto));
      if(cp)return cp;
      try{
        if(typeof findProductMatch==="function"){
          const m=findProductMatch(e,p.produto);
          if(m?.product?.centralId){
            return centralProducts.find(x=>Number(x.id)===Number(m.product.centralId))||null;
          }
        }
      }catch(e){}
    }
    return null;
  }

  function collectSnapshot(){
    const merged=new Map();
    ["eurofarma","medley","biolab"].forEach(s=>{
      const bucket=localBackup[s]||{};
      Object.keys(bucket).forEach(k=>{
        const st=bucket[k]||{};
        const qty=Number(st.stock||0), min=Number(st.min||0);
        const hasCost=st.lastCost!==undefined&&st.lastCost!==null&&st.lastCost!=="";
        if(qty<=0&&min<=0&&!hasCost)return;
        const p=DATA[s]?.[Number(k)]||null;
        const cp=findCentralForSnapshot(s,p,st);
        if(!cp)return;
        const item={
          stock_product_id:Number(cp.id),
          ean:cp.ean||st.eanOverride||"",
          laboratory:cp.laboratory,
          name:cp.name,
          quantity:Math.max(0,Math.round(qty)),
          minimum_stock:Math.max(0,Math.round(min)),
          last_cost:hasCost?Number(st.lastCost):null,
          last_gross_cost:st.lastGross!==undefined?Number(st.lastGross):null,
          last_discount:st.lastDiscount!==undefined?Number(st.lastDiscount):null,
          last_entry_at:st.lastEntry||null,
          last_nfe_key:st.lastNfeKey||null,
          last_nfe_number:st.lastNfe||null
        };
        const old=merged.get(item.stock_product_id);
        if(!old||item.quantity>old.quantity||item.minimum_stock>old.minimum_stock)merged.set(item.stock_product_id,item);
      });
    });
    return Array.from(merged.values());
  }

  async function migrateLocalIfNeeded(){
    const flag="drogaria_rocha_snapshot_migrated_v2_store_"+currentStore;
    if(localStorage.getItem(flag)==="1")return false;
    const items=collectSnapshot();
    if(!items.length)return false;
    centralStatus("Recuperando estoque salvo neste aparelho…","");
    const result=await sbFetch("/rest/v1/rpc/stock_import_snapshot",{
      method:"POST",
      body:JSON.stringify({p_store_id:currentStore,p_items:items})
    });
    localStorage.setItem(flag,"1");
    return Number(result?.imported||0)>0;
  }

  async function loadCentralStock(tryMigration){
    if(loadingCentral)return;
    loadingCentral=true;
    centralStatus("Sincronizando…","");
    try{
      centralProducts=await sbFetch("/rest/v1/stock_products?select=id,name,ean,laboratory,medicine_type,source&active=eq.true&order=id.asc&limit=2000");
      mapCentralProducts();

      if(tryMigration){
        const migrated=await migrateLocalIfNeeded();
        if(migrated) centralStatus("Estoque antigo recuperado. Atualizando…","ok");
      }

      centralInventory=await sbFetch("/rest/v1/stock_inventory?select=stock_product_id,quantity,minimum_stock,last_cost,last_gross_cost,last_discount,last_entry_at,last_nfe_key,last_nfe_number&store_id=eq."+currentStore+"&limit=2000");
      applyCentralInventory();
      centralLoaded=true;
      await renderCentralHistory();
      centralStatus("Sincronizado","ok");
    }catch(e){
      console.error("Central stock:",e);
      centralLoaded=false;
      if(String(e.message).includes("LOGIN_REQUIRED")||String(e.message).toLowerCase().includes("jwt")){
        localStorage.removeItem(AUTH_KEY);auth=null;showLogin("Faça login para acessar o estoque.");
      }else{
        centralStatus("Erro de sincronização","error");
        if(String(e.message).toLowerCase().includes("authorized")||String(e.message).includes("403")) showLogin("Este acesso não possui permissão de administrador.");
      }
    }finally{
      loadingCentral=false;
    }
  }

  async function updateInventoryField(s,i,field,value){
    if(!auth){showLogin("Faça login para alterar o estoque.");return;}
    const p=DATA[s]?.[i];
    const id=Number(p?.centralId||0);
    if(!id){alert("Produto ainda não está vinculado ao banco central.");return;}
    const st=ps(s,i);
    const numeric=Math.max(0,Math.floor(Number(value)||0));
    if(field==="stock")st.stock=numeric;
    if(field==="min")st.min=numeric;
    try{renderProducts(s);}catch(e){}
    centralStatus("Salvando…","");
    const body=field==="stock"?{quantity:numeric,updated_at:new Date().toISOString()}:{minimum_stock:numeric,updated_at:new Date().toISOString()};
    try{
      await sbFetch("/rest/v1/stock_inventory?store_id=eq."+currentStore+"&stock_product_id=eq."+id,{
        method:"PATCH",
        headers:{"Prefer":"return=minimal"},
        body:JSON.stringify(body)
      });
      centralStatus("Salvo","ok");
    }catch(e){
      console.error(e);
      centralStatus("Falha ao salvar","error");
      await loadCentralStock(false);
    }
  }

  async function registerCurrentNfeProduct(){
    try{
      if(typeof itemIndex!=="undefined"){}
    }catch(e){}
    const modal=document.getElementById("register-product-modal");
    const name=document.getElementById("register-product-name")?.textContent||"";
    const eanText=document.getElementById("register-product-ean")?.textContent||"";
    const ean=cleanEan(eanText);
    const supplier=document.getElementById("register-product-supplier")?.value||"biolab";
    const tipo=document.getElementById("register-product-type")?.value||"A confirmar";
    if(!currentNfe){alert("A nota não está carregada.");return;}

    let targetIndex=-1;
    for(let x=0;x<currentNfe.items.length;x++){
      const it=currentNfe.items[x];
      if((ean&&cleanEan(it.ean)===ean)||(!ean&&it.name===name)){targetIndex=x;break;}
    }
    if(targetIndex<0){alert("Não consegui localizar o item da nota.");return;}

    const it=currentNfe.items[targetIndex];
    const lab=SUPPLIER_TO_LAB[supplier];
    centralStatus("Cadastrando produto…","");
    try{
      const id=await sbFetch("/rest/v1/rpc/stock_register_product",{
        method:"POST",
        body:JSON.stringify({p_name:it.name,p_ean:it.ean||"",p_laboratory:lab,p_medicine_type:tipo})
      });
      await loadCentralStock(false);
      const idx=DATA[supplier].findIndex(p=>Number(p.centralId)===Number(id));
      if(idx>=0)it.match={supplier,index:idx,product:DATA[supplier][idx]};
      if(typeof closeNfeProductRegistration==="function")closeNfeProductRegistration();
      else if(modal)modal.style.display="none";
      renderNfe();
      nfeMessage("Produto cadastrado no estoque central.","success");
    }catch(e){
      console.error(e);
      const msg=document.getElementById("register-product-message");
      if(msg){msg.textContent="Não foi possível salvar no banco central.";msg.className="register-message error";}
      centralStatus("Falha ao cadastrar","error");
    }
  }

  async function confirmNfeCentral(){
    if(!auth){showLogin("Faça login para lançar a nota.");return;}
    if(!currentNfe){alert("Importe o XML da NF-e primeiro.");return;}
    const items=[];
    const missing=[];
    currentNfe.items.forEach(it=>{
      let id=0;
      if(it.match){
        id=Number(DATA[it.match.supplier]?.[it.match.index]?.centralId||0);
      }
      if(!id&&it.ean){
        const cp=centralProducts.find(p=>cleanEan(p.ean)===cleanEan(it.ean));
        if(cp)id=Number(cp.id);
      }
      if(!id){missing.push(it.name);return;}
      items.push({
        stock_product_id:id,
        product_name:it.name,
        ean:it.ean||"",
        quantity:Number(it.qty||0),
        unit_price:Number(it.unit||0),
        discount:Number(it.discount||0),
        net_unit_cost:Number(it.netUnit||0)
      });
    });
    if(missing.length){
      alert("Ainda há "+missing.length+" produto(s) não cadastrados. Use o botão Cadastrar antes de confirmar a entrada.");
      return;
    }
    if(!items.length){alert("Nenhum item válido para lançar.");return;}

    centralStatus("Lançando NF-e…","");
    try{
      const result=await sbFetch("/rest/v1/rpc/stock_apply_nfe",{
        method:"POST",
        body:JSON.stringify({
          p_store_id:currentStore,
          p_header:{
            access_key:currentNfe.key||document.getElementById("nfe-key")?.value||"",
            number:currentNfe.number||"",
            series:currentNfe.series||"",
            supplier_name:currentNfe.supplier||"",
            supplier_cnpj:currentNfe.cnpj||"",
            issue_date:currentNfe.date||null,
            total:Number(currentNfe.total||0)
          },
          p_items:items
        })
      });
      await loadCentralStock(false);
      nfeMessage("Entrada confirmada no estoque central: "+Number(result?.items||items.length)+" item(ns).","success");
      centralStatus("NF-e lançada","ok");
    }catch(e){
      console.error(e);
      const msg=String(e.message||"");
      if(msg.toLowerCase().includes("already entered")||msg.toLowerCase().includes("already")){
        alert("Esta NF-e já foi lançada nesta loja.");
      }else{
        alert("Não foi possível lançar a NF-e: "+msg);
      }
      centralStatus("Falha ao lançar NF-e","error");
    }
  }

  async function renderCentralHistory(){
    if(!auth)return;
    try{
      const rows=await sbFetch("/rest/v1/stock_nfe_entries?select=id,created_at,number,supplier_name,total&store_id=eq."+currentStore+"&order=created_at.desc&limit=20");
      const body=document.getElementById("nfe-history-body");
      if(!body)return;
      body.innerHTML="";
      if(!rows.length){
        body.innerHTML='<tr><td colspan="5" class="empty-row">Nenhuma entrada registrada nesta loja.</td></tr>';
        return;
      }
      rows.forEach(h=>{
        const tr=document.createElement("tr");
        tr.innerHTML='<td>'+formatDateBR(h.created_at)+'</td><td>'+esc2(h.number||"—")+'</td><td>'+esc2(h.supplier_name||"—")+'</td><td>—</td><td>'+money(h.total||0)+'</td>';
        body.appendChild(tr);
      });
    }catch(e){console.error(e);}
  }

  injectUI();

  // Sobrescreve apenas as operações que precisam persistir no banco central.
  window.setStockField=updateInventoryField;
  try{setStockField=updateInventoryField;}catch(e){}
  window.confirmNfeEntry=confirmNfeCentral;
  try{confirmNfeEntry=confirmNfeCentral;}catch(e){}
  window.saveNfeProductRegistration=registerCurrentNfeProduct;
  try{saveNfeProductRegistration=registerCurrentNfeProduct;}catch(e){}
  window.renderNfeHistory=renderCentralHistory;
  try{renderNfeHistory=renderCentralHistory;}catch(e){}

  (async function start(){
    try{await loadStores();}catch(e){}
    if(auth?.access_token){
      hideLogin();
      await loadCentralStock(true);
    }else{
      showLogin("");
    }
  })();
})();
