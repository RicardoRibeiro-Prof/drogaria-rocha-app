const SUPABASE_URL='https://khmowqmmwdrornfgrbpi.supabase.co';
const SUPABASE_KEY='sb_publishable_oUgMPwAr5mUSeW3Pxgl6DA_p_-7CwZx';
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});

const CATEGORIES=['Dermocosméticos','Protetores Solares','Hidratantes','Sabonetes e Limpeza','Higiene Bucal','Higiene Pessoal','Infantil','Cuidados Femininos','Desodorantes','Cabelos','Perfumaria','Repelentes','Vitaminas','Primeiros Socorros','Medicamentos','Conveniência','Outros'];
const state={session:null,products:[],banners:[],reviews:[],customers:[],editingProduct:null,editingBanner:null};
const $=s=>document.querySelector(s);const $$=s=>[...document.querySelectorAll(s)];
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const date=v=>v?new Date(v).toLocaleDateString('pt-BR'):'';
const escapeHtml=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const effectiveOffer=p=>p.offer_active&&p.offer_price!=null&&Number(p.offer_price)>=0;
const toast=(msg,error=false)=>{const el=$('#toast');el.textContent=msg;el.className=`toast show${error?' error':''}`;clearTimeout(el._t);el._t=setTimeout(()=>el.className='toast',2800)};
const busy=(button,on,text='Salvando...')=>{if(!button)return;button.disabled=on;if(on){button.dataset.old=button.textContent;button.textContent=text}else if(button.dataset.old){button.textContent=button.dataset.old;delete button.dataset.old}};

function showLogin(){ $('#loginView').classList.remove('hidden');$('#appView').classList.add('hidden'); }
function showApp(){ $('#loginView').classList.add('hidden');$('#appView').classList.remove('hidden'); }

async function ensureAdmin(session){
  if(!session?.user)return false;
  const{data,error}=await db.rpc('is_admin');
  if(error||data!==true){await db.auth.signOut();toast('Este usuário não possui acesso administrativo.',true);return false}
  state.session=session;
  $('#adminEmail').textContent=session.user.email||'';
  const name=session.user.user_metadata?.name||session.user.email?.split('@')[0]||'Administrador';
  $('#adminName').textContent=name;$('#adminInitial').textContent=name.charAt(0).toUpperCase();
  return true;
}

async function init(){
  fillCategories();bindEvents();
  const{data:{session}}=await db.auth.getSession();
  if(await ensureAdmin(session)){showApp();await loadAll()}else showLogin();
  db.auth.onAuthStateChange(async(_e,next)=>{if(next&&await ensureAdmin(next)){showApp();await loadAll()}else showLogin()});
}

function fillCategories(){ $('#pCategory').innerHTML=CATEGORIES.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join(''); }

function bindEvents(){
  $('#loginForm').addEventListener('submit',login);
  $('#logoutBtn').addEventListener('click',()=>db.auth.signOut());
  $('#refreshBtn').addEventListener('click',loadAll);
  $$('.nav-item').forEach(b=>b.addEventListener('click',()=>goPage(b.dataset.page)));
  $$('[data-go]').forEach(b=>b.addEventListener('click',()=>goPage(b.dataset.go)));
  $$('[data-close]').forEach(b=>b.addEventListener('click',()=>document.getElementById(b.dataset.close).close()));
  $('#newProductBtn').addEventListener('click',()=>openProduct());
  $('#newBannerBtn').addEventListener('click',()=>openBanner());
  $('#productForm').addEventListener('submit',saveProduct);
  $('#bannerForm').addEventListener('submit',saveBanner);
  $('#pImageFile').addEventListener('change',e=>previewFile(e.target.files?.[0],'#pImagePreviewWrap','#pImagePreview'));
  $('#bImageFile').addEventListener('change',e=>previewFile(e.target.files?.[0],'#bImagePreviewWrap','#bImagePreview'));
  $('#productSearch').addEventListener('input',renderProducts);
  $('#offerSearch').addEventListener('input',renderOffers);
  $('#reviewSearch').addEventListener('input',renderReviews);
  $('#customerSearch').addEventListener('input',renderCustomers);
}

async function login(e){
  e.preventDefault();const btn=$('#loginButton');busy(btn,true,'Entrando...');
  const{error}=await db.auth.signInWithPassword({email:$('#loginEmail').value.trim(),password:$('#loginPassword').value});busy(btn,false);
  if(error)toast('Confira o e-mail e a senha.',true);
}

function goPage(page){
  $$('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.page===page));
  $$('.page').forEach(x=>x.classList.remove('active-page'));document.getElementById(`${page}Page`)?.classList.add('active-page');
  const titles={dashboard:'Visão geral',products:'Produtos',offers:'Ofertas',banners:'Banners',reviews:'Avaliações',customers:'Clientes'};$('#pageTitle').textContent=titles[page]||'Painel';
}

async function loadAll(){
  $('#syncStatus').textContent='Atualizando...';
  const[p,b,r,c]=await Promise.all([
    db.from('products').select('id,name,description,category,price,badge,image_url,active,code,offer_price,offer_active,offer_start,offer_end,created_at').order('id',{ascending:false}),
    db.from('home_banners').select('id,eyebrow,title,subtitle,button_text,target_type,target_value,image_url,sort_order,active,created_at').order('sort_order').order('id'),
    db.from('product_reviews').select('id,product_id,user_id,reviewer_name,rating,comment,created_at').order('created_at',{ascending:false}).limit(500),
    db.from('profiles').select('user_id,name,phone,birth_date,created_at').order('created_at',{ascending:false}).limit(1000),
  ]);
  const error=p.error||b.error||r.error||c.error;if(error){toast(error.message||'Falha ao carregar o painel.',true);$('#syncStatus').textContent='Erro ao atualizar';return}
  state.products=(p.data||[]).map(x=>({...x,id:Number(x.id),price:Number(x.price||0),offer_price:x.offer_price==null?null:Number(x.offer_price)}));
  state.banners=b.data||[];state.reviews=(r.data||[]).map(x=>({...x,rating:Number(x.rating)}));state.customers=c.data||[];
  renderAll();$('#syncStatus').textContent=`Atualizado às ${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`;
}

function renderAll(){renderDashboard();renderProducts();renderOffers();renderBanners();renderReviews();renderCustomers()}
function renderDashboard(){
  const stats=[['□','Produtos ativos',state.products.filter(x=>x.active).length],['%','Ofertas ativas',state.products.filter(effectiveOffer).length],['▣','Banners ativos',state.banners.filter(x=>x.active).length],['★','Avaliações',state.reviews.length],['◉','Clientes',state.customers.length]];
  $('#statsGrid').innerHTML=stats.map(([i,l,v])=>`<div class="stat-card"><div class="icon">${i}</div><strong>${v}</strong><span>${l}</span></div>`).join('');
  $('#recentProducts').innerHTML=state.products.slice(0,6).map(p=>`<div class="mini-item"><div><strong>${escapeHtml(p.name)}</strong><br><span>${escapeHtml(p.category)}</span></div><strong>${money(p.price)}</strong></div>`).join('')||'<span class="muted">Nenhum produto.</span>';
  $('#recentReviews').innerHTML=state.reviews.slice(0,6).map(r=>`<div class="mini-item"><div><strong>${escapeHtml(r.reviewer_name||'Cliente')}</strong><br><span>${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</span></div><span>${escapeHtml(productName(r.product_id))}</span></div>`).join('')||'<span class="muted">Ainda sem avaliações.</span>';
}
function productName(id){return state.products.find(x=>x.id===Number(id))?.name||`Produto #${id}`}

function productFilter(q,p){q=q.trim().toLowerCase();return !q||`${p.name} ${p.category} ${p.code||''}`.toLowerCase().includes(q)}
function renderProducts(){
  const q=$('#productSearch').value||'';const list=state.products.filter(p=>productFilter(q,p));
  $('#productsTable').innerHTML=list.map(p=>`<tr><td><div class="product-cell">${p.image_url?`<img class="thumb" src="${escapeHtml(p.image_url)}" onerror="this.style.visibility='hidden'">`:'<div class="thumb"></div>'}<div><strong>${escapeHtml(p.name)}</strong><small>${escapeHtml(p.code||'Sem código')}</small></div></div></td><td>${escapeHtml(p.category)}</td><td><strong>${money(p.price)}</strong>${effectiveOffer(p)?`<br><small class="discount">Oferta ${money(p.offer_price)}</small>`:''}</td><td><span class="status-pill ${p.active?'on':'off'}">${p.active?'Ativo':'Inativo'}</span></td><td><div class="action-row"><button class="icon-btn" onclick="openProduct(${p.id})">✎</button></div></td></tr>`).join('')||'<tr><td colspan="5">Nenhum produto encontrado.</td></tr>';
}

function renderOffers(){
  const q=$('#offerSearch').value||'';const list=state.products.filter(p=>productFilter(q,p));
  $('#offersTable').innerHTML=list.map(p=>{const off=p.offer_price==null?'':Number(p.offer_price).toFixed(2);const disc=p.offer_price!=null&&p.price>0?Math.max(0,Math.round((1-p.offer_price/p.price)*100)):0;return `<tr><td><div class="product-cell">${p.image_url?`<img class="thumb" src="${escapeHtml(p.image_url)}">`:'<div class="thumb"></div>'}<strong>${escapeHtml(p.name)}</strong></div></td><td>${money(p.price)}</td><td><input class="offer-input" id="offer-${p.id}" type="number" min="0" step="0.01" value="${off}" placeholder="0,00"></td><td><span class="discount">${disc?`${disc}%`:'—'}</span></td><td><input class="switch" id="offer-active-${p.id}" type="checkbox" ${p.offer_active?'checked':''}></td><td><button class="btn secondary" onclick="saveOffer(${p.id})">Salvar</button></td></tr>`}).join('')||'<tr><td colspan="6">Nenhum produto encontrado.</td></tr>';
}

async function saveOffer(id){
  const product=state.products.find(x=>x.id===id);if(!product)return;const raw=document.getElementById(`offer-${id}`).value;const active=document.getElementById(`offer-active-${id}`).checked;const offer=raw===''?null:Number(raw);
  if(active&&(offer==null||!Number.isFinite(offer)||offer<0))return toast('Informe um preço promocional válido.',true);
  if(active&&offer>=product.price&&!confirm('O preço de oferta é igual ou maior que o preço normal. Deseja salvar mesmo assim?'))return;
  const{error}=await db.from('products').update({offer_price:offer,offer_active:active}).eq('id',id);if(error)return toast(error.message,true);toast('Oferta atualizada.');await loadAll();
}

function setPreview(wrapSel,imgSel,url){const w=$(wrapSel),img=$(imgSel);if(url){img.src=url;w.classList.add('has')}else{img.removeAttribute('src');w.classList.remove('has')}}
function previewFile(file,wrapSel,imgSel){if(!file)return;setPreview(wrapSel,imgSel,URL.createObjectURL(file))}
function openProduct(id=null){
  const p=id?state.products.find(x=>x.id===id):null;state.editingProduct=p||null;$('#productDialogTitle').textContent=p?'Editar produto':'Novo produto';
  $('#pName').value=p?.name||'';$('#pCode').value=p?.code||'';$('#pCategory').value=p?.category||CATEGORIES[0];$('#pPrice').value=p?.price??'';$('#pBadge').value=p?.badge||'';$('#pDescription').value=p?.description||'';$('#pActive').checked=p?.active!==false;$('#pImageFile').value='';setPreview('#pImagePreviewWrap','#pImagePreview',p?.image_url||'');$('#productDialog').showModal();
}
async function uploadImage(file,pathPrefix){if(!file)return null;const ext=(file.name.split('.').pop()||'jpg').toLowerCase();const safe=['jpg','jpeg','png','webp'].includes(ext)?ext:'jpg';const path=`${pathPrefix}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${safe}`;const{error}=await db.storage.from('product-images').upload(path,file,{contentType:file.type||'image/jpeg',cacheControl:'3600'});if(error)throw error;return db.storage.from('product-images').getPublicUrl(path).data.publicUrl}
async function saveProduct(e){
  e.preventDefault();const btn=$('#saveProductBtn');busy(btn,true);try{
    const price=Number($('#pPrice').value);if(!Number.isFinite(price)||price<0)throw new Error('Informe um preço válido.');let image=state.editingProduct?.image_url||null;const file=$('#pImageFile').files?.[0];if(file)image=await uploadImage(file,'products');
    const payload={name:$('#pName').value.trim(),code:$('#pCode').value.trim()||null,category:$('#pCategory').value,price,description:$('#pDescription').value.trim(),badge:$('#pBadge').value.trim(),active:$('#pActive').checked,image_url:image};
    const req=state.editingProduct?db.from('products').update(payload).eq('id',state.editingProduct.id):db.from('products').insert(payload);const{error}=await req;if(error)throw error;$('#productDialog').close();toast('Produto salvo.');await loadAll();
  }catch(err){toast(err.message||'Não foi possível salvar o produto.',true)}finally{busy(btn,false)}
}

function renderBanners(){
  $('#bannerGrid').innerHTML=state.banners.map(b=>`<article class="banner-card">${b.image_url?`<img src="${escapeHtml(b.image_url)}">`:'<div class="banner-empty"></div>'}<div class="banner-actions"><button class="icon-btn" onclick="openBanner(${b.id})">✎</button><button class="icon-btn danger" onclick="deleteBanner(${b.id})">×</button></div><div class="banner-content"><span class="eyebrow">${escapeHtml(b.eyebrow||'DROGARIA ROCHA')}</span><h3>${escapeHtml(b.title)}</h3><p>${escapeHtml(b.subtitle||'')}</p><div class="banner-meta"><span class="tag">Ordem ${b.sort_order}</span><span class="tag">${b.active?'Ativo':'Inativo'}</span><span class="tag">${escapeHtml(b.target_type)}: ${escapeHtml(b.target_value||'todos')}</span></div></div></article>`).join('')||'<div class="panel">Nenhum banner cadastrado.</div>';
}
function openBanner(id=null){
  const b=id?state.banners.find(x=>x.id===id):null;state.editingBanner=b||null;$('#bannerDialogTitle').textContent=b?'Editar banner':'Novo banner';$('#bEyebrow').value=b?.eyebrow||'';$('#bTitle').value=b?.title||'';$('#bSubtitle').value=b?.subtitle||'';$('#bButtonText').value=b?.button_text||'Ver produtos';$('#bTargetType').value=b?.target_type||'all';$('#bTargetValue').value=b?.target_value||'';$('#bOrder').value=b?.sort_order||Math.max(1,state.banners.length+1);$('#bActive').checked=b?.active!==false;$('#bImageFile').value='';setPreview('#bImagePreviewWrap','#bImagePreview',b?.image_url||'');$('#bannerDialog').showModal();
}
async function saveBanner(e){
  e.preventDefault();const btn=$('#saveBannerBtn');busy(btn,true);try{let image=state.editingBanner?.image_url||null;const file=$('#bImageFile').files?.[0];if(file)image=await uploadImage(file,'banners');const payload={eyebrow:$('#bEyebrow').value.trim(),title:$('#bTitle').value.trim(),subtitle:$('#bSubtitle').value.trim(),button_text:$('#bButtonText').value.trim()||'Ver produtos',target_type:$('#bTargetType').value,target_value:$('#bTargetValue').value.trim(),sort_order:Number($('#bOrder').value)||1,active:$('#bActive').checked,image_url:image};const req=state.editingBanner?db.from('home_banners').update(payload).eq('id',state.editingBanner.id):db.from('home_banners').insert(payload);const{error}=await req;if(error)throw error;$('#bannerDialog').close();toast('Banner salvo.');await loadAll()}catch(err){toast(err.message||'Não foi possível salvar o banner.',true)}finally{busy(btn,false)}
}
async function deleteBanner(id){if(!confirm('Excluir este banner?'))return;const{error}=await db.from('home_banners').delete().eq('id',id);if(error)return toast(error.message,true);toast('Banner excluído.');await loadAll()}

function renderReviews(){
  const q=($('#reviewSearch').value||'').trim().toLowerCase();const list=state.reviews.filter(r=>!q||`${r.reviewer_name} ${r.comment} ${productName(r.product_id)}`.toLowerCase().includes(q));
  $('#reviewsList').innerHTML=list.map(r=>`<article class="review-card"><div class="review-head"><div><strong>${escapeHtml(r.reviewer_name||'Cliente')} · ${escapeHtml(productName(r.product_id))}</strong><div class="stars">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div></div><button class="icon-btn danger" onclick="deleteReview(${r.id})">×</button></div>${r.comment?`<p>${escapeHtml(r.comment)}</p>`:'<p class="muted">Avaliação sem comentário.</p>'}<div class="review-meta">${date(r.created_at)}</div></article>`).join('')||'<div class="panel">Nenhuma avaliação encontrada.</div>';
}
async function deleteReview(id){if(!confirm('Remover esta avaliação do aplicativo?'))return;const{error}=await db.from('product_reviews').delete().eq('id',id);if(error)return toast(error.message,true);toast('Avaliação removida.');await loadAll()}

function renderCustomers(){
  const q=($('#customerSearch').value||'').trim().toLowerCase();const list=state.customers.filter(c=>!q||`${c.name||''} ${c.phone||''}`.toLowerCase().includes(q));
  $('#customersTable').innerHTML=list.map(c=>`<tr><td><strong>${escapeHtml(c.name||'Cliente sem nome')}</strong></td><td>${escapeHtml(c.phone||'—')}</td><td>${escapeHtml(c.birth_date||'—')}</td><td>${date(c.created_at)}</td></tr>`).join('')||'<tr><td colspan="4">Nenhum cliente encontrado.</td></tr>';
}

window.openProduct=openProduct;window.saveOffer=saveOffer;window.openBanner=openBanner;window.deleteBanner=deleteBanner;window.deleteReview=deleteReview;
init();
