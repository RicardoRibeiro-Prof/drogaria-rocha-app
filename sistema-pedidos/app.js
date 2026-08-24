const SUPABASE_URL = 'https://khmowqmmwdrornfgrbpi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_oUgMPwAr5mUSeW3Pxgl6DA_p_-7CwZx';
const API = `${SUPABASE_URL}/rest/v1/pedidos_produtos`;
let orders = [];
let statusFilter = 'todos';

const $ = (id) => document.getElementById(id);
const headers = (extra = {}) => ({ apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', ...extra });
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const formatDate = (value) => new Intl.DateTimeFormat('pt-BR', { dateStyle:'short', timeStyle:'short' }).format(new Date(value));
const employeeName = () => $('employeeSelect').value;

function toast(message) { const el=$('toast'); el.textContent=message; el.classList.add('show'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.remove('show'),2600); }
function setBusy(button, busy, label) { button.disabled=busy; if (label) button.textContent=busy?'Aguarde...':label; }

async function loadOrders(){ $('loadingState').classList.remove('hidden'); $('ordersList').classList.add('hidden'); $('emptyState').classList.add('hidden'); try{const res=await fetch(`${API}?select=*&order=created_at.desc`,{headers:headers()}); if(!res.ok) throw new Error(await res.text()); orders=await res.json(); render();}catch{toast('Erro ao carregar os pedidos.');}finally{$('loadingState').classList.add('hidden');} }

function render(){
  $('totalCount').textContent=orders.length; $('notedCount').textContent=orders.filter(o=>o.status==='anotado').length; $('orderedCount').textContent=orders.filter(o=>o.status==='pedido').length; $('receivedCount').textContent=orders.filter(o=>o.status==='recebido').length;
  const q=$('searchInput').value.trim().toLowerCase(); const priority=$('priorityFilter').value; const laboratory=$('laboratoryFilter').value;
  const filtered=orders.filter(o=>(statusFilter==='todos'||o.status===statusFilter)&&(priority==='todas'||o.prioridade===priority)&&(laboratory==='todos'||o.laboratorio===laboratory)&&[o.produto,o.laboratorio,o.fornecedor,o.criado_por,o.observacao].some(v=>(v||'').toLowerCase().includes(q)));
  const list=$('ordersList'); list.innerHTML='';
  if(!filtered.length){$('emptyState').classList.remove('hidden');list.classList.add('hidden');return} $('emptyState').classList.add('hidden');list.classList.remove('hidden');
  list.innerHTML=filtered.map(o=>{const next=o.status==='anotado'?['pedido','Marcar como pedido']:o.status==='pedido'?['recebido','Marcar como recebido']:null;return `<article class="order-card"><div><div class="order-top"><h3>${escapeHtml(o.produto)}</h3><span class="pill laboratory-pill">${escapeHtml(o.laboratorio||'Diversos')}</span><span class="pill status-${o.status}">${o.status==='anotado'?'Para pedir':o.status}</span><span class="pill priority-${o.prioridade}">${o.prioridade}</span></div><div class="order-details"><span><b>Qtd.:</b> ${o.quantidade}</span>${o.fornecedor?`<span><b>Fornecedor:</b> ${escapeHtml(o.fornecedor)}</span>`:''}<span><b>Anotado por:</b> ${escapeHtml(o.criado_por)}</span><span>${formatDate(o.created_at)}</span></div>${o.observacao?`<p class="order-note">${escapeHtml(o.observacao)}</p>`:''}</div><div class="card-actions">${next?`<button class="btn primary advance-btn" data-id="${o.id}" data-next="${next[0]}">${next[1]}</button>`:''}<button class="btn secondary delete-btn" data-delete="${o.id}" aria-label="Excluir ${escapeHtml(o.produto)}">×</button></div></article>`}).join('');
}

async function saveOrder(event){event.preventDefault();const button=$('saveButton');$('formError').textContent='';setBusy(button,true,'Adicionar e continuar');const payload={produto:$('productName').value.trim(),quantidade:Number($('quantity').value),prioridade:$('priority').value,laboratorio:$('laboratory').value,fornecedor:$('supplier').value.trim()||null,observacao:$('notes').value.trim()||null,status:'anotado',criado_por:employeeName()};try{const res=await fetch(API,{method:'POST',headers:headers({Prefer:'return=representation'}),body:JSON.stringify(payload)});if(!res.ok)throw new Error(await res.text());$('productName').value='';$('quantity').value=1;$('supplier').value='';$('notes').value='';toast(`Adicionado à lista ${payload.laboratorio}.`);await loadOrders();$('productName').focus();}catch{$('formError').textContent='Não foi possível salvar. Tente novamente.';}finally{setBusy(button,false,'Adicionar e continuar');}}

async function advanceOrder(id,next){const changes={status:next};if(next==='pedido'){changes.pedido_em=new Date().toISOString();changes.pedido_por=employeeName()}else{changes.recebido_em=new Date().toISOString();changes.recebido_por=employeeName()}const res=await fetch(`${API}?id=eq.${id}`,{method:'PATCH',headers:headers({Prefer:'return=minimal'}),body:JSON.stringify(changes)});if(!res.ok)throw new Error();toast(next==='pedido'?'Pedido registrado.':'Produto recebido.');await loadOrders();}
async function deleteOrder(id){const item=orders.find(o=>o.id===id);if(!confirm(`Excluir a anotação de “${item?.produto||'produto'}”?`))return;const res=await fetch(`${API}?id=eq.${id}`,{method:'DELETE',headers:headers()});if(!res.ok)throw new Error();toast('Anotação excluída.');await loadOrders();}

$('employeeSelect').value=localStorage.getItem('dr_employee')||'Ricardo';
$('employeeSelect').addEventListener('change',()=>localStorage.setItem('dr_employee',$('employeeSelect').value));
$('openModalButton').addEventListener('click',()=>{$('laboratory').value='';$('orderModal').showModal();setTimeout(()=>$('laboratory').focus(),50)}); $('closeModalButton').addEventListener('click',()=>$('orderModal').close()); $('cancelModalButton').addEventListener('click',()=>$('orderModal').close()); $('orderForm').addEventListener('submit',saveOrder);
document.querySelectorAll('[data-quick-lab]').forEach(btn=>btn.addEventListener('click',()=>{$('laboratory').value=btn.dataset.quickLab;$('orderModal').showModal();setTimeout(()=>$('productName').focus(),50)}));
document.querySelectorAll('.metric').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.metric').forEach(x=>x.classList.remove('active'));btn.classList.add('active');statusFilter=btn.dataset.filter;render();}));
$('searchInput').addEventListener('input',render); $('laboratoryFilter').addEventListener('change',render); $('priorityFilter').addEventListener('change',render); $('refreshButton').addEventListener('click',loadOrders);
$('ordersList').addEventListener('click',async(e)=>{const advance=e.target.closest('[data-next]');const remove=e.target.closest('[data-delete]');try{if(advance){advance.disabled=true;await advanceOrder(advance.dataset.id,advance.dataset.next)}else if(remove)await deleteOrder(remove.dataset.delete);}catch{toast('Não foi possível concluir a ação.');}});
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js'); loadOrders();
