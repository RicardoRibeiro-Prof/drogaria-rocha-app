const KEYS = {
  produtos: 'dr_produtos_v1',
  faltas: 'dr_faltas_v1'
};

const seedProdutos = {
  '7890000000011': { nome: 'Dipirona 500mg' },
  '7890000000028': { nome: 'Paracetamol 750mg' },
  '7890000000035': { nome: 'Losartana 50mg' }
};

let produtos = carregar(KEYS.produtos, seedProdutos);
let faltas = carregar(KEYS.faltas, []);
let buffer = '';
let ultimoTeclaEm = 0;
let toastTimer;

const els = {
  listaBody: document.querySelector('#listaBody'),
  emptyState: document.querySelector('#emptyState'),
  totalProdutos: document.querySelector('#totalProdutos'),
  totalUnidades: document.querySelector('#totalUnidades'),
  totalNaoCadastrados: document.querySelector('#totalNaoCadastrados'),
  lastRead: document.querySelector('#lastRead'),
  btnCadastro: document.querySelector('#btnCadastro'),
  btnLimpar: document.querySelector('#btnLimpar'),
  btnImprimir: document.querySelector('#btnImprimir'),
  modal: document.querySelector('#modal'),
  btnFecharModal: document.querySelector('#btnFecharModal'),
  formCadastro: document.querySelector('#formCadastro'),
  eanInput: document.querySelector('#eanInput'),
  nomeInput: document.querySelector('#nomeInput'),
  toast: document.querySelector('#toast'),
  manualCode: document.querySelector('#manualCode'),
  btnSimular: document.querySelector('#btnSimular')
};

function carregar(chave, fallback) {
  try {
    const valor = localStorage.getItem(chave);
    return valor ? JSON.parse(valor) : structuredClone(fallback);
  } catch {
    return structuredClone(fallback);
  }
}

function salvar() {
  localStorage.setItem(KEYS.produtos, JSON.stringify(produtos));
  localStorage.setItem(KEYS.faltas, JSON.stringify(faltas));
}

function normalizarCodigo(codigo) {
  return String(codigo || '').replace(/\D/g, '').trim();
}

function processarCodigo(codigoBruto) {
  const codigo = normalizarCodigo(codigoBruto);
  if (!codigo) return;

  const cadastro = produtos[codigo];
  const existente = faltas.find(item => item.codigo === codigo);

  if (existente) {
    existente.quantidade += 1;
    if (cadastro) {
      existente.nome = cadastro.nome;
      existente.cadastrado = true;
    }
  } else {
    faltas.unshift({
      codigo,
      nome: cadastro?.nome || 'Produto não cadastrado',
      quantidade: 1,
      cadastrado: Boolean(cadastro),
      criadoEm: new Date().toISOString()
    });
  }

  salvar();
  renderizar();

  const nome = cadastro?.nome || `Código ${codigo}`;
  els.lastRead.textContent = cadastro
    ? `✓ ${nome} adicionado à lista.`
    : `⚠ ${nome} adicionado como não cadastrado.`;
  mostrarToast(cadastro ? `${nome} adicionado` : 'Código não cadastrado — item anotado mesmo assim', !cadastro);
  bip(cadastro ? 880 : 440);
}

function renderizar() {
  els.listaBody.innerHTML = '';

  faltas.forEach(item => {
    const tr = document.createElement('tr');
    if (!item.cadastrado) tr.classList.add('unknown');

    tr.innerHTML = `
      <td>
        <span class="product-name">${escapeHtml(item.nome)}</span>
        ${item.cadastrado ? '' : '<span class="badge">NÃO CADASTRADO</span>'}
      </td>
      <td>${escapeHtml(item.codigo)}</td>
      <td class="center"><span class="qty">${item.quantidade}</span></td>
      <td class="center no-print"><button class="remove-btn" data-codigo="${escapeHtml(item.codigo)}">Remover</button></td>
    `;
    els.listaBody.appendChild(tr);
  });

  document.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', () => removerItem(btn.dataset.codigo));
  });

  const totalUnidades = faltas.reduce((acc, item) => acc + item.quantidade, 0);
  const naoCadastrados = faltas.filter(item => !item.cadastrado).length;

  els.totalProdutos.textContent = faltas.length;
  els.totalUnidades.textContent = totalUnidades;
  els.totalNaoCadastrados.textContent = naoCadastrados;
  els.emptyState.classList.toggle('hidden', faltas.length > 0);
}

function removerItem(codigo) {
  faltas = faltas.filter(item => item.codigo !== codigo);
  salvar();
  renderizar();
  mostrarToast('Item removido');
}

function mostrarToast(texto, warning = false) {
  clearTimeout(toastTimer);
  els.toast.textContent = texto;
  els.toast.classList.toggle('warning', warning);
  els.toast.classList.add('show');
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), 1600);
}

function bip(frequencia = 880) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = frequencia;
    gain.gain.value = 0.04;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch {}
}

function escapeHtml(texto) {
  return String(texto)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function abrirCadastro(codigo = '') {
  els.modal.classList.remove('hidden');
  els.eanInput.value = codigo;
  els.nomeInput.value = produtos[codigo]?.nome || '';
  setTimeout(() => (codigo ? els.nomeInput : els.eanInput).focus(), 50);
}

function fecharCadastro() {
  els.modal.classList.add('hidden');
  els.formCadastro.reset();
}

els.btnCadastro.addEventListener('click', () => abrirCadastro());
els.btnFecharModal.addEventListener('click', fecharCadastro);
els.modal.addEventListener('click', e => { if (e.target === els.modal) fecharCadastro(); });

els.formCadastro.addEventListener('submit', e => {
  e.preventDefault();
  const codigo = normalizarCodigo(els.eanInput.value);
  const nome = els.nomeInput.value.trim();
  if (!codigo || !nome) return;

  produtos[codigo] = { nome };
  faltas = faltas.map(item => item.codigo === codigo ? { ...item, nome, cadastrado: true } : item);
  salvar();
  renderizar();
  fecharCadastro();
  mostrarToast(`${nome} cadastrado`);
});

els.btnLimpar.addEventListener('click', () => {
  if (!faltas.length) return;
  if (!confirm('Deseja realmente apagar toda a lista de faltas?')) return;
  faltas = [];
  salvar();
  renderizar();
  els.lastRead.textContent = 'Lista limpa. Passe um produto no leitor.';
});

els.btnImprimir.addEventListener('click', () => window.print());

els.btnSimular.addEventListener('click', () => {
  processarCodigo(els.manualCode.value);
  els.manualCode.value = '';
  els.manualCode.focus();
});
els.manualCode.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    els.btnSimular.click();
  }
});

// Leitura contínua do scanner USB.
// A maioria dos leitores se comporta como teclado e envia ENTER ao final do EAN.
document.addEventListener('keydown', e => {
  const modalAberto = !els.modal.classList.contains('hidden');
  const elementoDigitavel = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
  if (modalAberto || elementoDigitavel) return;

  const agora = Date.now();
  if (agora - ultimoTeclaEm > 120) buffer = '';
  ultimoTeclaEm = agora;

  if (e.key === 'Enter') {
    if (buffer.length >= 6) processarCodigo(buffer);
    buffer = '';
    return;
  }

  if (/^\d$/.test(e.key)) buffer += e.key;
});

renderizar();
