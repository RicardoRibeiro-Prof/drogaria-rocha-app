import './styles.css';
import { CATEGORIAS, PRODUTOS, moeda } from './catalogo.js';

const estado = {
  busca: '',
  categoria: 'todos',
  carrinho: JSON.parse(localStorage.getItem('dr-carrinho') || '{}'),
  receita: null,
  entrega: 'entrega'
};

const app = document.querySelector('#app');

function quantidadeTotal() {
  return Object.values(estado.carrinho).reduce((soma, quantidade) => soma + quantidade, 0);
}

function salvarCarrinho() {
  localStorage.setItem('dr-carrinho', JSON.stringify(estado.carrinho));
  atualizarIndicadores();
}

function atualizarIndicadores() {
  const quantidade = quantidadeTotal();
  document.querySelectorAll('[data-cart-count]').forEach((item) => {
    item.textContent = quantidade;
    item.hidden = quantidade === 0;
  });
}

function render() {
  app.innerHTML = `
    <header class="cabecalho">
      <a class="marca" href="#inicio" aria-label="Drogaria Rocha - início">
        <span class="marca-simbolo" aria-hidden="true"><i></i><b></b></span>
        <span><strong>Drogaria</strong><em>ROCHA</em></span>
      </a>
      <button class="localizacao" type="button" data-scroll="atendimento" aria-label="Ver informações de atendimento">
        <span>Atendimento local</span><strong>Entrega e retirada</strong>
      </button>
      <button class="botao-carrinho topo" type="button" data-open-cart aria-label="Abrir carrinho">
        <span aria-hidden="true">◫</span><span class="texto-carrinho">Meu carrinho</span><b data-cart-count hidden>0</b>
      </button>
    </header>

    <main id="inicio">
      <section class="hero">
        <div class="hero-conteudo">
          <span class="etiqueta">CUIDADO QUE CHEGA ATÉ VOCÊ</span>
          <h1>Saúde e bem-estar,<br><mark>sempre por perto.</mark></h1>
          <p>Encontre seus produtos, envie sua receita e faça seu pedido de forma simples e segura.</p>
          <div class="hero-acoes">
            <button class="botao primario" type="button" data-scroll="catalogo">Ver produtos <span>→</span></button>
            <button class="botao secundario" type="button" data-open-prescription>Enviar receita</button>
          </div>
          <div class="beneficios">
            <span><b>✓</b> Atendimento humano</span><span><b>✓</b> Pedido rápido</span><span><b>✓</b> Retire ou receba</span>
          </div>
        </div>
        <div class="hero-visual" aria-hidden="true">
          <div class="forma forma-1"></div><div class="forma forma-2"></div>
          <div class="sacola"><span class="cruz">+</span><small>Drogaria</small><strong>ROCHA</strong></div>
          <div class="cartao-flutuante"><span>✓</span><div><strong>Pedido fácil</strong><small>Direto pelo celular</small></div></div>
        </div>
      </section>

      <section class="atalhos" aria-label="Serviços rápidos">
        <button type="button" data-open-prescription><span class="atalho-icone">▤</span><span><strong>Envie sua receita</strong><small>Fotografe e solicite uma cotação</small></span><b>›</b></button>
        <button type="button" data-scroll="catalogo"><span class="atalho-icone">⌕</span><span><strong>Busque um produto</strong><small>Consulte o catálogo rapidamente</small></span><b>›</b></button>
        <button type="button" data-scroll="atendimento"><span class="atalho-icone">♡</span><span><strong>Fale com a equipe</strong><small>Tire dúvidas antes de pedir</small></span><b>›</b></button>
      </section>

      <section class="secao catalogo" id="catalogo">
        <div class="secao-titulo"><div><span class="sobretitulo">CATÁLOGO DEMONSTRATIVO</span><h2>O que você precisa hoje?</h2></div><p>Preços e disponibilidade devem ser confirmados pela drogaria.</p></div>
        <label class="busca"><span aria-hidden="true">⌕</span><span class="sr-only">Buscar produto</span><input id="busca" type="search" placeholder="Busque pelo nome do produto..." autocomplete="off"></label>
        <div class="categorias" role="tablist" aria-label="Categorias">
          ${CATEGORIAS.map((cat) => `<button type="button" role="tab" data-category="${cat.id}" aria-selected="${cat.id === estado.categoria}"><span>${cat.icone}</span>${cat.nome}</button>`).join('')}
        </div>
        <div class="grade-produtos" id="lista-produtos"></div>
      </section>

      <section class="faixa-atendimento" id="atendimento">
        <div><span class="sobretitulo claro">ATENDIMENTO DE VERDADE</span><h2>Precisa de ajuda para encontrar um produto?</h2><p>Nossa equipe confere a disponibilidade e orienta você na finalização do pedido.</p></div>
        <button class="botao branco" type="button" data-contact>Falar com a drogaria <span>→</span></button>
      </section>
    </main>

    <footer><div class="marca marca-rodape"><span class="marca-simbolo" aria-hidden="true"><i></i><b></b></span><span><strong>Drogaria</strong><em>ROCHA</em></span></div><p>Medicamentos podem exigir receita e avaliação do farmacêutico. Não se automedique.</p><small>© 2026 Drogaria Rocha. Primeira versão demonstrativa.</small></footer>

    <div class="modal" id="modal-carrinho" aria-hidden="true"><div class="modal-fundo" data-close></div><section class="painel" role="dialog" aria-modal="true" aria-labelledby="titulo-carrinho"><header><div><span class="sobretitulo">SEU PEDIDO</span><h2 id="titulo-carrinho">Meu carrinho</h2></div><button type="button" class="fechar" data-close aria-label="Fechar">×</button></header><div id="conteudo-carrinho"></div></section></div>
    <div class="modal" id="modal-receita" aria-hidden="true"><div class="modal-fundo" data-close></div><section class="painel painel-menor" role="dialog" aria-modal="true" aria-labelledby="titulo-receita"><header><div><span class="sobretitulo">COTAÇÃO SEGURA</span><h2 id="titulo-receita">Enviar receita</h2></div><button type="button" class="fechar" data-close aria-label="Fechar">×</button></header><p>Use uma foto nítida, com todos os dados visíveis. A dispensação dependerá da análise do farmacêutico.</p><label class="upload"><input id="arquivo-receita" type="file" accept="image/*,.pdf" capture="environment"><span>＋</span><strong>Fotografar ou escolher receita</strong><small>Imagem ou PDF</small></label><div id="arquivo-selecionado" class="arquivo-selecionado" hidden></div><button class="botao primario largura-total" type="button" data-prescription-done>Continuar pedido</button></section></div>
    <div class="toast" role="status" aria-live="polite"></div>
    <button class="carrinho-flutuante" type="button" data-open-cart><span>Ver carrinho</span><strong><b data-cart-count hidden>0</b> itens</strong></button>
  `;
  renderProdutos();
  ligarEventos();
  atualizarIndicadores();
}

function produtosFiltrados() {
  const termo = estado.busca.trim().toLocaleLowerCase('pt-BR');
  return PRODUTOS.filter((produto) => (estado.categoria === 'todos' || produto.categoria === estado.categoria) && (!termo || `${produto.nome} ${produto.descricao}`.toLocaleLowerCase('pt-BR').includes(termo)));
}

function renderProdutos() {
  const lista = document.querySelector('#lista-produtos');
  const produtos = produtosFiltrados();
  lista.innerHTML = produtos.length ? produtos.map((produto) => {
    const quantidade = estado.carrinho[produto.id] || 0;
    return `<article class="produto"><div class="produto-imagem"><span>${produto.icone}</span>${produto.selo ? `<b>${produto.selo}</b>` : ''}</div><div class="produto-corpo"><small>${CATEGORIAS.find((cat) => cat.id === produto.categoria)?.nome}</small><h3>${produto.nome}</h3><p>${produto.descricao}</p><div class="produto-rodape"><strong>${moeda(produto.preco)}</strong>${quantidade ? `<div class="controle"><button type="button" data-remove="${produto.id}" aria-label="Remover uma unidade">−</button><b>${quantidade}</b><button type="button" data-add="${produto.id}" aria-label="Adicionar uma unidade">＋</button></div>` : `<button class="adicionar" type="button" data-add="${produto.id}" aria-label="Adicionar ${produto.nome}">＋</button>`}</div></div></article>`;
  }).join('') : `<div class="vazio"><span>⌕</span><h3>Nenhum produto encontrado</h3><p>Tente outro nome ou escolha uma categoria diferente.</p></div>`;
  ligarBotoesProduto();
}

function ligarBotoesProduto() {
  document.querySelectorAll('[data-add]').forEach((botao) => botao.addEventListener('click', () => alterarQuantidade(Number(botao.dataset.add), 1)));
  document.querySelectorAll('[data-remove]').forEach((botao) => botao.addEventListener('click', () => alterarQuantidade(Number(botao.dataset.remove), -1)));
}

function alterarQuantidade(id, delta) {
  const atual = estado.carrinho[id] || 0;
  const nova = Math.max(0, atual + delta);
  if (nova) estado.carrinho[id] = nova; else delete estado.carrinho[id];
  salvarCarrinho();
  renderProdutos();
  if (delta > 0) mostrarToast('Produto adicionado ao carrinho');
  if (document.querySelector('#modal-carrinho').classList.contains('aberto')) renderCarrinho();
}

function abrirModal(id) {
  document.querySelectorAll('.modal.aberto').forEach(fecharModal);
  const modal = document.querySelector(id);
  modal.classList.add('aberto'); modal.setAttribute('aria-hidden', 'false'); document.body.classList.add('sem-rolagem');
  setTimeout(() => modal.querySelector('button, input')?.focus(), 100);
}

function fecharModal(modal) {
  modal.classList.remove('aberto'); modal.setAttribute('aria-hidden', 'true'); document.body.classList.remove('sem-rolagem');
}

function renderCarrinho() {
  const conteudo = document.querySelector('#conteudo-carrinho');
  const itens = PRODUTOS.filter((produto) => estado.carrinho[produto.id]);
  if (!itens.length) {
    conteudo.innerHTML = `<div class="vazio carrinho-vazio"><span>◫</span><h3>Seu carrinho está vazio</h3><p>Escolha os produtos que deseja solicitar.</p><button class="botao primario" type="button" data-go-products>Ver produtos</button></div>`;
    conteudo.querySelector('[data-go-products]').addEventListener('click', () => { fecharModal(document.querySelector('#modal-carrinho')); document.querySelector('#catalogo').scrollIntoView({ behavior: 'smooth' }); });
    return;
  }
  const subtotal = itens.reduce((soma, produto) => soma + produto.preco * estado.carrinho[produto.id], 0);
  conteudo.innerHTML = `<div class="itens-carrinho">${itens.map((produto) => `<div class="item-carrinho"><span class="miniatura">${produto.icone}</span><div><strong>${produto.nome}</strong><small>${moeda(produto.preco)} cada</small></div><div class="controle"><button type="button" data-cart-remove="${produto.id}">−</button><b>${estado.carrinho[produto.id]}</b><button type="button" data-cart-add="${produto.id}">＋</button></div></div>`).join('')}</div>
    <form id="checkout" class="checkout"><fieldset><legend>Como deseja receber?</legend><div class="opcoes"><label><input type="radio" name="tipo" value="entrega" ${estado.entrega === 'entrega' ? 'checked' : ''}><span><strong>Entrega</strong><small>Endereço informado abaixo</small></span></label><label><input type="radio" name="tipo" value="retirada" ${estado.entrega === 'retirada' ? 'checked' : ''}><span><strong>Retirada</strong><small>Na Drogaria Rocha</small></span></label></div></fieldset><label>Seu nome<input required name="nome" autocomplete="name" placeholder="Digite seu nome"></label><label data-address>Endereço de entrega<input name="endereco" autocomplete="street-address" placeholder="Rua, número e bairro"></label><label>Observações (opcional)<textarea name="observacoes" rows="2" placeholder="Ex.: preciso de troco para R$ 50"></textarea></label>${estado.receita ? `<div class="receita-ok">✓ Receita selecionada: <strong>${estado.receita.name}</strong></div>` : `<button class="anexar-receita" type="button" data-open-prescription>＋ Adicionar receita ao pedido</button>`}<div class="resumo"><span>Subtotal estimado</span><strong>${moeda(subtotal)}</strong><small>O valor final e a disponibilidade serão confirmados pela drogaria.</small></div><button class="botao primario largura-total" type="submit">Compartilhar pedido <span>→</span></button></form>`;
  conteudo.querySelectorAll('[data-cart-add]').forEach((botao) => botao.addEventListener('click', () => alterarQuantidade(Number(botao.dataset.cartAdd), 1)));
  conteudo.querySelectorAll('[data-cart-remove]').forEach((botao) => botao.addEventListener('click', () => alterarQuantidade(Number(botao.dataset.cartRemove), -1)));
  conteudo.querySelector('[data-open-prescription]')?.addEventListener('click', () => abrirModal('#modal-receita'));
  const form = conteudo.querySelector('#checkout');
  form.addEventListener('change', (event) => { if (event.target.name === 'tipo') { estado.entrega = event.target.value; atualizarEndereco(form); } });
  atualizarEndereco(form);
  form.addEventListener('submit', finalizarPedido);
}

function atualizarEndereco(form) {
  const campo = form.querySelector('[data-address]');
  const input = campo.querySelector('input');
  const entrega = form.elements.tipo.value === 'entrega';
  campo.hidden = !entrega; input.required = entrega;
}

async function finalizarPedido(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const dados = new FormData(form);
  const itens = PRODUTOS.filter((produto) => estado.carrinho[produto.id]);
  const subtotal = itens.reduce((soma, produto) => soma + produto.preco * estado.carrinho[produto.id], 0);
  const linhas = itens.map((produto) => `• ${estado.carrinho[produto.id]}x ${produto.nome} — ${moeda(produto.preco * estado.carrinho[produto.id])}`);
  const mensagem = [`Olá, Drogaria Rocha! Gostaria de solicitar este pedido:`, '', ...linhas, '', `Subtotal estimado: ${moeda(subtotal)}`, `Cliente: ${dados.get('nome')}`, `Recebimento: ${dados.get('tipo') === 'entrega' ? 'Entrega' : 'Retirada na drogaria'}`, dados.get('tipo') === 'entrega' ? `Endereço: ${dados.get('endereco')}` : '', dados.get('observacoes') ? `Observações: ${dados.get('observacoes')}` : '', estado.receita ? `Receita: enviarei o arquivo junto a esta mensagem.` : '', '', 'Aguardo a confirmação de disponibilidade e do valor final.'].filter(Boolean).join('\n');
  try {
    const arquivos = estado.receita && navigator.canShare?.({ files: [estado.receita] }) ? [estado.receita] : undefined;
    if (navigator.share) await navigator.share({ title: 'Pedido - Drogaria Rocha', text: mensagem, files: arquivos });
    else window.open(`https://wa.me/?text=${encodeURIComponent(mensagem)}`, '_blank', 'noopener,noreferrer');
  } catch (erro) {
    if (erro.name !== 'AbortError') {
      await navigator.clipboard?.writeText(mensagem);
      mostrarToast('Pedido copiado. Cole a mensagem no WhatsApp.');
    }
  }
}

function selecionarReceita(arquivo) {
  if (!arquivo) return;
  const limite = 8 * 1024 * 1024;
  if (arquivo.size > limite) { mostrarToast('O arquivo deve ter no máximo 8 MB.'); return; }
  estado.receita = arquivo;
  const caixa = document.querySelector('#arquivo-selecionado');
  caixa.hidden = false; caixa.textContent = `✓ ${arquivo.name}`;
}

function contatoGeral() {
  const texto = 'Olá, Drogaria Rocha! Preciso de ajuda para encontrar um produto.';
  window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener,noreferrer');
}

function mostrarToast(texto) {
  const toast = document.querySelector('.toast'); toast.textContent = texto; toast.classList.add('visivel');
  clearTimeout(mostrarToast.timer); mostrarToast.timer = setTimeout(() => toast.classList.remove('visivel'), 2600);
}

function ligarEventos() {
  document.querySelector('#busca').addEventListener('input', (event) => { estado.busca = event.target.value; renderProdutos(); });
  document.querySelectorAll('[data-category]').forEach((botao) => botao.addEventListener('click', () => { estado.categoria = botao.dataset.category; document.querySelectorAll('[data-category]').forEach((item) => item.setAttribute('aria-selected', String(item === botao))); renderProdutos(); }));
  document.querySelectorAll('[data-scroll]').forEach((botao) => botao.addEventListener('click', () => document.querySelector(`#${botao.dataset.scroll}`).scrollIntoView({ behavior: 'smooth' })));
  document.querySelectorAll('[data-open-cart]').forEach((botao) => botao.addEventListener('click', () => { renderCarrinho(); abrirModal('#modal-carrinho'); }));
  document.querySelectorAll('[data-open-prescription]').forEach((botao) => botao.addEventListener('click', () => abrirModal('#modal-receita')));
  document.querySelectorAll('[data-close]').forEach((botao) => botao.addEventListener('click', () => fecharModal(botao.closest('.modal'))));
  document.querySelector('[data-contact]').addEventListener('click', contatoGeral);
  document.querySelector('#arquivo-receita').addEventListener('change', (event) => selecionarReceita(event.target.files[0]));
  document.querySelector('[data-prescription-done]').addEventListener('click', () => { if (!estado.receita) { mostrarToast('Selecione uma foto ou PDF da receita.'); return; } fecharModal(document.querySelector('#modal-receita')); renderCarrinho(); abrirModal('#modal-carrinho'); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') document.querySelectorAll('.modal.aberto').forEach(fecharModal); });
}

if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`));
render();
