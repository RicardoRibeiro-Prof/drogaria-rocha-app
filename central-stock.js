
(function(){
  const EDGE_URL = "https://khmowqmmwdrornfgrbpi.supabase.co/functions/v1/stock-control";
  const APP_KEY = "dr-stock-2026-83f4c2b1e7";
  const MIGRATION_KEY = "drogaria_rocha_local_migrated_to_central_v3";
  const LAB_TO_SUPPLIER = {"Eurofarma":"eurofarma","Medley":"medley","Biolab":"biolab"};
  const SUPPLIER_TO_LAB = {eurofarma:"Eurofarma",medley:"Medley",biolab:"Biolab"};
  const localBackup = JSON.parse(JSON.stringify(typeof state!=="undefined"?state:{}));

  let centralProducts = [];
  let centralInventory = [];
  let loading = false;

  function cleanEan(v){ return String(v||"").replace(/\D/g,""); }
  function norm(v){
    if(typeof normalizeProductName==="function") return normalizeProductName(v);
    return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase()
      .replace(/[^A-Z0-9]+/g," ").replace(/\s+/g," ").trim();
  }

  async function api(action,payload={}){
    const r = await fetch(EDGE_URL,{
      method:"POST",
      headers:{"Content-Type":"application/json","x-app-key":APP_KEY},
      body:JSON.stringify(Object.assign({action},payload))
    });
    const data = await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(data.error||("Erro "+r.status));
    return data;
  }

  function injectStatus(){
    if(document.getElementById("central-sync-status")) return;
    const style=document.createElement("style");
    style.textContent=
      '.central-status{max-width:1180px;margin:8px auto 0;padding:8px 12px;border-radius:8px;background:#f7faf8;border:1px solid var(--border);font-size:12px;color:var(--muted)}'+
      '.central-status.ok{color:#1f6b4f;font-weight:700}.central-status.error{color:#a61b13;font-weight:700}'+
      '@media(max-width:760px){.central-status{margin:8px 10px 0}}';
    document.head.appendChild(style);

    const el=document.createElement("div");
    el.id="central-sync-status";
    el.className="central-status";
    el.textContent="Sincronizando estoque…";
    const nav=document.querySelector("nav");
    if(nav) nav.insertAdjacentElement("afterend",el);

    const footer=document.querySelector("footer");
    if(footer) footer.textContent="Estoque salvo automaticamente no banco central da Drogaria Rocha.";
  }

  function status(text,type){
    const el=document.getElementById("central-sync-status");
    if(!el) return;
    el.textContent=text||"";
    el.className="central-status "+(type||"");
  }

  function findDataIndex(supplier,cp){
    const ean=cleanEan(cp.ean);
    if(ean){
      const idx=DATA[supplier].findIndex((p,i)=>{
        const st=ps(supplier,i);
        return cleanEan(p.ean||st.eanOverride||"")===ean;
      });
      if(idx>=0) return idx;
    }
    return DATA[supplier].findIndex(p=>norm(p.produto)===norm(cp.name));
  }

  function mapProducts(){
    centralProducts.forEach(cp=>{
      const supplier=LAB_TO_SUPPLIER[cp.laboratory];
      if(!supplier) return;
      let idx=findDataIndex(supplier,cp);
      if(idx<0){
        DATA[supplier].push({
          produto:cp.name,
          ean:cp.ean||"",
          tipo:cp.medicine_type||"A confirmar",
          centralCustom:true
        });
        idx=DATA[supplier].length-1;
      }
      DATA[supplier][idx].centralId=Number(cp.id);
      DATA[supplier][idx].ean=cp.ean||DATA[supplier][idx].ean||"";
      DATA[supplier][idx].tipo=cp.medicine_type||DATA[supplier][idx].tipo||"A confirmar";
    });
  }

  function applyInventory(){
    const inv=new Map(centralInventory.map(x=>[Number(x.stock_product_id),x]));
    ["eurofarma","medley","biolab"].forEach(s=>{
      DATA[s].forEach((p,i)=>{
        if(!p.centralId) return;
        const row=inv.get(Number(p.centralId))||{};
        const st=ps(s,i);
        st.centralId=Number(p.centralId);
        st.stock=Number(row.quantity||0);
        st.min=Number(row.minimum_stock||0);
        if(row.last_cost!==null&&row.last_cost!==undefined) st.lastCost=Number(row.last_cost); else delete st.lastCost;
        if(row.last_gross_cost!==null&&row.last_gross_cost!==undefined) st.lastGross=Number(row.last_gross_cost); else delete st.lastGross;
        if(row.last_discount!==null&&row.last_discount!==undefined) st.lastDiscount=Number(row.last_discount); else delete st.lastDiscount;
        st.lastEntry=row.last_entry_at||"";
        st.lastNfeKey=row.last_nfe_key||"";
        st.lastNfe=row.last_nfe_number||"";
      });
      try{renderProducts(s);}catch(e){console.error(e);}
    });
    try{save();}catch(e){}
  }

  async function fetchCentral(){
    const data=await api("load");
    centralProducts=data.products||[];
    centralInventory=data.inventory||[];
    mapProducts();
  }

  async function registerOldCustomProducts(){
    const custom=localBackup.customProducts||{};
    for(const supplier of ["eurofarma","medley","biolab"]){
      const list=Array.isArray(custom[supplier])?custom[supplier]:[];
      for(const cp of list){
        try{
          await api("register_product",{
            name:cp.produto||cp.name||"",
            ean:cp.ean||"",
            laboratory:SUPPLIER_TO_LAB[supplier],
            medicine_type:cp.tipo||"A confirmar"
          });
        }catch(e){console.error("Migração produto:",e);}
      }
    }
  }

  function centralForLocal(supplier,p,st){
    const e=cleanEan(p?.ean||st?.eanOverride||"");
    if(e){
      const cp=centralProducts.find(x=>cleanEan(x.ean)===e);
      if(cp) return cp;
    }
    if(p){
      const lab=SUPPLIER_TO_LAB[supplier];
      return centralProducts.find(x=>x.laboratory===lab&&norm(x.name)===norm(p.produto))||null;
    }
    return null;
  }

  function collectLocalSnapshot(){
    const items=[];
    const seen=new Set();
    for(const supplier of ["eurofarma","medley","biolab"]){
      const bucket=localBackup[supplier]||{};
      Object.keys(bucket).forEach(k=>{
        const st=bucket[k]||{};
        const qty=Math.max(0,Math.round(Number(st.stock||0)));
        const min=Math.max(0,Math.round(Number(st.min||0)));
        const hasCost=st.lastCost!==undefined&&st.lastCost!==null&&st.lastCost!=="";
        if(qty===0&&min===0&&!hasCost) return;

        const p=DATA[supplier]?.[Number(k)]||null;
        const cp=centralForLocal(supplier,p,st);
        if(!cp||seen.has(Number(cp.id))) return;
        seen.add(Number(cp.id));

        items.push({
          stock_product_id:Number(cp.id),
          ean:cp.ean||st.eanOverride||"",
          laboratory:cp.laboratory,
          name:cp.name,
          quantity:qty,
          minimum_stock:min,
          last_cost:hasCost?Number(st.lastCost):null,
          last_gross_cost:st.lastGross!==undefined?Number(st.lastGross):null,
          last_discount:st.lastDiscount!==undefined?Number(st.lastDiscount):null,
          last_entry_at:st.lastEntry||null,
          last_nfe_key:st.lastNfeKey||null,
          last_nfe_number:st.lastNfe||null
        });
      });
    }
    return items;
  }

  async function migrateOldBrowserData(){
    if(localStorage.getItem(MIGRATION_KEY)==="1") return false;

    await registerOldCustomProducts();
    await fetchCentral();

    const items=collectLocalSnapshot();
    if(items.length){
      status("Recuperando estoque salvo neste navegador…","");
      await api("migrate_snapshot",{items});
      localStorage.setItem(MIGRATION_KEY,"1");
      return true;
    }
    localStorage.setItem(MIGRATION_KEY,"1");
    return false;
  }

  async function loadCentral(tryMigration=true){
    if(loading) return;
    loading=true;
    status("Sincronizando estoque…","");
    try{
      await fetchCentral();
      if(tryMigration){
        const migrated=await migrateOldBrowserData();
        if(migrated) await fetchCentral();
      }
      applyInventory();
      await renderCentralHistory();
      status("Estoque sincronizado","ok");
    }catch(e){
      console.error("Estoque central:",e);
      status("Erro ao sincronizar estoque","error");
    }finally{
      loading=false;
    }
  }

  async function setStockCentral(s,i,field,value){
    const p=DATA[s]?.[i];
    const id=Number(p?.centralId||0);
    if(!id){
      alert("Este produto ainda não está vinculado ao estoque central.");
      return;
    }
    const numeric=Math.max(0,Math.floor(Number(value)||0));
    const st=ps(s,i);
    if(field==="stock") st.stock=numeric;
    if(field==="min") st.min=numeric;
    try{renderProducts(s);}catch(e){}
    status("Salvando…","");
    try{
      await api("update_inventory",{
        stock_product_id:id,
        field:field==="stock"?"quantity":"minimum_stock",
        value:numeric
      });
      status("Salvo","ok");
    }catch(e){
      console.error(e);
      status("Falha ao salvar","error");
      await loadCentral(false);
    }
  }

  function currentRegistrationItem(){
    if(!currentNfe) return null;
    const name=document.getElementById("register-product-name")?.textContent||"";
    const ean=cleanEan(document.getElementById("register-product-ean")?.textContent||"");
    return currentNfe.items.find(it=>(ean&&cleanEan(it.ean)===ean)||(!ean&&it.name===name))||null;
  }

  async function registerNfeProductCentral(){
    const it=currentRegistrationItem();
    if(!it){alert("Não consegui localizar o item da nota.");return;}

    const supplier=document.getElementById("register-product-supplier")?.value||"biolab";
    const tipo=document.getElementById("register-product-type")?.value||"A confirmar";

    status("Cadastrando produto…","");
    try{
      const result=await api("register_product",{
        name:it.name,
        ean:it.ean||"",
        laboratory:SUPPLIER_TO_LAB[supplier],
        medicine_type:tipo
      });
      await fetchCentral();
      applyInventory();

      const cp=centralProducts.find(x=>Number(x.id)===Number(result.id));
      if(cp){
        const idx=findDataIndex(supplier,cp);
        if(idx>=0) it.match={supplier,index:idx,product:DATA[supplier][idx]};
      }

      if(typeof closeNfeProductRegistration==="function") closeNfeProductRegistration();
      else{
        const modal=document.getElementById("register-product-modal");
        if(modal) modal.style.display="none";
      }

      renderNfe();
      nfeMessage("Produto cadastrado. Agora você pode confirmar a entrada.","success");
      status("Produto cadastrado","ok");
    }catch(e){
      console.error(e);
      const msg=document.getElementById("register-product-message");
      if(msg){msg.textContent="Não foi possível salvar o cadastro.";msg.className="register-message error";}
      status("Falha ao cadastrar produto","error");
    }
  }

  async function confirmNfeCentral(){
    if(!currentNfe){alert("Importe o XML da NF-e primeiro.");return;}

    const items=[];
    let missing=0;

    currentNfe.items.forEach(it=>{
      let productId=0;

      if(it.match){
        productId=Number(DATA[it.match.supplier]?.[it.match.index]?.centralId||0);
      }

      if(!productId&&it.ean){
        const cp=centralProducts.find(p=>cleanEan(p.ean)===cleanEan(it.ean));
        if(cp) productId=Number(cp.id);
      }

      if(!productId){missing++;return;}

      items.push({
        stock_product_id:productId,
        product_name:it.name,
        ean:it.ean||"",
        quantity:Number(it.qty||0),
        unit_price:Number(it.unit||0),
        discount:Number(it.discount||0),
        net_unit_cost:Number(it.netUnit||0)
      });
    });

    if(missing){
      alert("Ainda há "+missing+" produto(s) sem cadastro. Cadastre todos antes de confirmar a nota.");
      return;
    }

    status("Lançando NF-e…","");
    try{
      const result=await api("apply_nfe",{
        header:{
          access_key:currentNfe.key||document.getElementById("nfe-key")?.value||"",
          number:currentNfe.number||"",
          series:currentNfe.series||"",
          supplier_name:currentNfe.supplier||"",
          supplier_cnpj:currentNfe.cnpj||"",
          issue_date:currentNfe.date||null,
          total:Number(currentNfe.total||0)
        },
        items
      });

      await loadCentral(false);
      nfeMessage("Entrada confirmada: "+Number(result.items||items.length)+" item(ns) somados ao estoque.","success");
      status("NF-e lançada no estoque","ok");
    }catch(e){
      console.error(e);
      const m=String(e.message||"");
      if(m.toLowerCase().includes("already")){
        alert("Esta NF-e já foi lançada.");
      }else{
        alert("Não foi possível lançar a NF-e: "+m);
      }
      status("Falha ao lançar NF-e","error");
    }
  }

  async function renderCentralHistory(){
    try{
      const data=await api("history");
      const body=document.getElementById("nfe-history-body");
      if(!body) return;
      body.innerHTML="";
      const rows=data.rows||[];
      if(!rows.length){
        body.innerHTML='<tr><td colspan="5" class="empty-row">Nenhuma entrada registrada.</td></tr>';
        return;
      }
      rows.forEach(h=>{
        const tr=document.createElement("tr");
        tr.innerHTML=
          '<td>'+formatDateBR(h.created_at)+'</td>'+
          '<td>'+esc(h.number||"—")+'</td>'+
          '<td>'+esc(h.supplier_name||"—")+'</td>'+
          '<td>—</td>'+
          '<td>'+money(h.total||0)+'</td>';
        body.appendChild(tr);
      });
    }catch(e){console.error(e);}
  }

  injectStatus();

  window.setStockField=setStockCentral;
  try{setStockField=setStockCentral;}catch(e){}

  window.saveNfeProductRegistration=registerNfeProductCentral;
  try{saveNfeProductRegistration=registerNfeProductCentral;}catch(e){}

  window.confirmNfeEntry=confirmNfeCentral;
  try{confirmNfeEntry=confirmNfeCentral;}catch(e){}

  window.renderNfeHistory=renderCentralHistory;
  try{renderNfeHistory=renderCentralHistory;}catch(e){}

  loadCentral(true);
})();
