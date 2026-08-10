import './styles.css';
import { CATEGORIAS, PRODUTOS, moeda } from './catalogo.js';
import { supabase } from './supabase.js';
import { IMAGENS_BANNERS } from './imagens-banners.js';
import { IMAGEM_BANNER_MAXTON } from './imagem-banner-maxton.js';

const estado = {
  busca: '',
  categoria: 'todos',
  carrinho: JSON.parse(localStorage.getItem('dr-carrinho') || '{}'),
  receita: null,
  entrega: 'entrega',
  produtos: PRODUTOS,
  admin: null
};

const retornoAutenticacao = new URLSearchParams(window.location.search).get('admin');
const fluxoDeSenha = retornoAutenticacao === 'redefinir' || window.location.hash.includes('type=recovery') || window.location.hash.includes('type=invite');

const app = document.querySelector('#app');
let bannerAtual = 0;
let bannerTimer;

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
      <div class="cabecalho-linha">
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
      </div>
      <label class="busca busca-mobile"><span aria-hidden="true">⌕</span><span class="sr-only">Buscar produto</span><input id="busca-mobile" type="search" placeholder="O que você está procurando?" autocomplete="off"></label>
    </header>

    <main id="inicio">
      <section class="hero hero-banners" aria-label="Ofertas em destaque">
        <div class="banner-janela"><div class="banner-trilho">
          <article class="banner-slide ativo banner-laranja" data-banner="0">
            <div class="banner-conteudo"><span>DESTAQUE DA SEMANA</span><h1>Cuidado facial<br>que cabe na rotina.</h1><p>Dermocosméticos selecionados com compra rápida e atendimento da Drogaria Rocha.</p><button class="botao banner-botao" type="button" data-product="1">Ver produto <b>→</b></button></div>
            <div class="banner-produto"><span class="banner-circulo"></span><img src="${IMAGENS_BANNERS[1]}" alt="${PRODUTOS[0].nome}"><small>Glycare</small><strong>A partir de<br>${moeda(PRODUTOS[0].preco)}</strong></div>
          </article>
          <article class="banner-slide banner-preto" data-banner="1">
            <div class="banner-conteudo"><span>BELEZA E CUIDADO</span><h1>Cor renovada.<br>Atitude também.</h1><p>Encontre sua tonalidade Maxton e renove o visual com praticidade.</p><button class="botao banner-botao claro" type="button" data-product="17">Ver coloração <b>→</b></button></div>
            <div class="banner-produto"><span class="banner-circulo"></span><img src="${IMAGEM_BANNER_MAXTON}" alt="${PRODUTOS[16].nome}"><small>Maxton</small><strong>Coloração<br>a partir de ${moeda(PRODUTOS[16].preco)}</strong></div>
          </article>
          <article class="banner-slide banner-branco" data-banner="2">
            <div class="banner-conteudo"><span>PROTEÇÃO SOLAR</span><h1>Proteção com cor<br>e toque seco.</h1><p>Produtos para proteger a pele com praticidade em todos os momentos.</p><button class="botao banner-botao escuro" type="button" data-product="15">Ver destaque <b>→</b></button></div>
            <div class="banner-produto"><span class="banner-circulo"></span><img src="${IMAGENS_BANNERS[15]}" alt="${PRODUTOS[14].nome}"><small>Episol</small><strong>Proteção<br>FPS 60</strong></div>
          </article>
        </div></div>
        <button class="banner-seta anterior" type="button" data-banner-prev aria-label="Banner anterior">‹</button>
        <button class="banner-seta proximo" type="button" data-banner-next aria-label="Próximo banner">›</button>
        <div class="banner-indicadores" role="tablist" aria-label="Escolher banner"><button class="ativo" type="button" data-banner-dot="0" aria-label="Banner 1"></button><button type="button" data-banner-dot="1" aria-label="Banner 2"></button><button type="button" data-banner-dot="2" aria-label="Banner 3"></button></div>
      </section>

      <section class="atalhos" aria-label="Serviços rápidos">
        <button type="button" data-open-prescription><span class="atalho-icone">▤</span><span><strong>Envie sua receita</strong><small>Fotografe e solicite uma cotação</small></span><b>›</b></button>
        <button type="button" data-scroll="catalogo"><span class="atalho-icone">⌕</span><span><strong>Busque um produto</strong><small>Consulte o catálogo rapidamente</small></span><b>›</b></button>
        <button type="button" data-scroll="atendimento"><span class="atalho-icone">♡</span><span><strong>Fale com a equipe</strong><small>Tire dúvidas antes de pedir</small></span><b>›</b></button>
      </section>

      <section class="secao catalogo" id="catalogo">
        <div class="secao-titulo"><div><span class="sobretitulo">LANÇAMENTOS • LOTE 01</span><h2>Produtos selecionados para você</h2></div><p>Preços demonstrativos. A Drogaria Rocha confirmará o valor e a disponibilidade antes de finalizar.</p></div>
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

    <footer><div class="marca marca-rodape"><span class="marca-simbolo" aria-hidden="true"><i></i><b></b></span><span><strong>Drogaria</strong><em>ROCHA</em></span></div><p>Medicamentos podem exigir receita e avaliação do farmacêutico. Não se automedique.</p><div class="rodape-final"><small>© 2026 Drogaria Rocha.</small><button type="button" class="admin-link" data-open-admin>Administrar catálogo</button></div></footer>

    <div class="modal modal-produto" id="modal-produto" aria-hidden="true"><div class="modal-fundo" data-close></div><section class="painel painel-produto" role="dialog" aria-modal="true" aria-labelledby="detalhe-nome"><button type="button" class="voltar-produto" data-close aria-label="Voltar">←</button><div id="conteudo-produto"></div></section></div>
    <div class="modal" id="modal-carrinho" aria-hidden="true"><div class="modal-fundo" data-close></div><section class="painel" role="dialog" aria-modal="true" aria-labelledby="titulo-carrinho"><header><div><span class="sobretitulo">SEU PEDIDO</span><h2 id="titulo-carrinho">Meu carrinho</h2></div><button type="button" class="fechar" data-close aria-label="Fechar">×</button></header><div id="conteudo-carrinho"></div></section></div>
    <div class="modal" id="modal-receita" aria-hidden="true"><div class="modal-fundo" data-close></div><section class="painel painel-menor" role="dialog" aria-modal="true" aria-labelledby="titulo-receita"><header><div><span class="sobretitulo">COTAÇÃO SEGURA</span><h2 id="titulo-receita">Enviar receita</h2></div><button type="button" class="fechar" data-close aria-label="Fechar">×</button></header><p>Use uma foto nítida, com todos os dados visíveis. A dispensação dependerá da análise do farmacêutico.</p><label class="upload"><input id="arquivo-receita" type="file" accept="image/*,.pdf" capture="environment"><span>＋</span><strong>Fotografar ou escolher receita</strong><small>Imagem ou PDF</small></label><div id="arquivo-selecionado" class="arquivo-selecionado" hidden></div><button class="botao primario largura-total" type="button" data-prescription-done>Continuar pedido</button></section></div>
    <div class="modal" id="modal-admin" aria-hidden="true"><div class="modal-fundo" data-close></div><section class="painel painel-admin" role="dialog" aria-modal="true" aria-labelledby="titulo-admin"><header><div><span class="sobretitulo">ÁREA PROTEGIDA</span><h2 id="titulo-admin">Administrar catálogo</h2></div><button type="button" class="fechar" data-close aria-label="Fechar">×</button></header><div id="conteudo-admin"></div></section></div>
    <div class="toast" role="status" aria-live="polite"></div>
    <button class="carrinho-flutuante" type="button" data-open-cart><span>Ver carrinho</span><strong><b data-cart-count hidden>0</b> itens</strong></button>
    <nav class="navegacao-mobile" aria-label="Navegação principal">
      <button class="ativo" type="button" data-scroll="inicio"><span aria-hidden="true">⌂</span><small>Início</small></button>
      <button type="button" data-scroll="catalogo"><span aria-hidden="true">⌕</span><small>Produtos</small></button>
      <button type="button" data-open-prescription><span aria-hidden="true">▤</span><small>Receita</small></button>
      <button type="button" data-open-cart><span aria-hidden="true">◫</span><small>Carrinho</small><b data-cart-count hidden>0</b></button>
    </nav>
  `;
  renderProdutos();
  ligarEventos();
  atualizarIndicadores();
}

function produtosFiltrados() {
  const termo = estado.busca.trim().toLocaleLowerCase('pt-BR');
  return estado.produtos.filter((produto) => (estado.categoria === 'todos' || produto.categoria === estado.categoria) && (!termo || `${produto.nome} ${produto.descricao}`.toLocaleLowerCase('pt-BR').includes(termo)));
}

function renderProdutos() {
  const lista = document.querySelector('#lista-produtos');
  const produtos = produtosFiltrados();
  lista.innerHTML = produtos.length ? produtos.map((produto) => {
    const quantidade = estado.carrinho[produto.id] || 0;
    return `<article class="produto" data-product="${produto.id}" role="button" tabindex="0" aria-label="Ver detalhes de ${produto.nome}"><div class="produto-imagem"><img src="${produto.imagem}" alt="${produto.nome}" loading="lazy" referrerpolicy="no-referrer" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="produto-fallback" hidden>${produto.icone}</span>${produto.selo ? `<b>${produto.selo}</b>` : ''}</div><div class="produto-corpo"><small>${CATEGORIAS.find((cat) => cat.id === produto.categoria)?.nome}</small><h3>${produto.nome}</h3><p>${produto.descricao}</p><div class="produto-rodape"><div class="preco-info"><strong>${moeda(produto.preco)}</strong><small>Preço demonstrativo</small></div>${quantidade ? `<div class="controle"><button type="button" data-remove="${produto.id}" aria-label="Remover uma unidade">−</button><b>${quantidade}</b><button type="button" data-add="${produto.id}" aria-label="Adicionar uma unidade">＋</button></div>` : `<button class="adicionar" type="button" data-add="${produto.id}" aria-label="Adicionar ${produto.nome}">＋</button>`}</div></div></article>`;
  }).join('') : `<div class="vazio"><span>⌕</span><h3>Nenhum produto encontrado</h3><p>Tente outro nome ou escolha uma categoria diferente.</p></div>`;
  ligarBotoesProduto();
}

function ligarBotoesProduto() {
  document.querySelectorAll('[data-add]').forEach((botao) => botao.addEventListener('click', (event) => { event.stopPropagation(); alterarQuantidade(Number(botao.dataset.add), 1); }));
  document.querySelectorAll('[data-remove]').forEach((botao) => botao.addEventListener('click', (event) => { event.stopPropagation(); alterarQuantidade(Number(botao.dataset.remove), -1); }));
  document.querySelectorAll('#lista-produtos [data-product]').forEach((cartao) => {
    cartao.addEventListener('click', () => abrirProduto(Number(cartao.dataset.product)));
    cartao.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); abrirProduto(Number(cartao.dataset.product)); } });
  });
}

function abrirProduto(id) {
  const produto = estado.produtos.find((item) => Number(item.id) === Number(id));
  if (!produto) return;
  const categoria = CATEGORIAS.find((cat) => cat.id === produto.categoria)?.nome || 'Produto';
  const quantidade = estado.carrinho[produto.id] || 0;
  document.querySelector('#conteudo-produto').innerHTML = `
    <div class="detalhe-imagem"><img src="${produto.imagem}" alt="${produto.nome}" referrerpolicy="no-referrer"><span>${produto.icone}</span>${produto.selo ? `<b>${produto.selo}</b>` : ''}</div>
    <div class="detalhe-conteudo">
      <span class="detalhe-categoria">${categoria}</span>
      <h2 id="detalhe-nome">${produto.nome}</h2>
      <p class="detalhe-descricao">${produto.descricao}</p>
      <div class="detalhe-status"><span><b>✓</b> Produto disponível</span><span><b>✓</b> Entrega ou retirada</span></div>
      <div class="detalhe-preco"><small>Preço demonstrativo</small><strong>${moeda(produto.preco)}</strong><p>O valor e a disponibilidade serão confirmados pela Drogaria Rocha antes da finalização.</p></div>
      <div class="detalhe-acoes">
        ${quantidade ? `<div class="controle detalhe-controle"><button type="button" data-detail-remove="${produto.id}" aria-label="Remover uma unidade">−</button><b>${quantidade}</b><button type="button" data-detail-add="${produto.id}" aria-label="Adicionar uma unidade">＋</button></div>` : ''}
        <button class="botao primario detalhe-adicionar" type="button" data-detail-add="${produto.id}">${quantidade ? 'Adicionar mais uma unidade' : 'Adicionar ao carrinho'} <span>＋</span></button>
      </div>
      <button class="detalhe-ajuda" type="button" data-contact>Precisa de ajuda com este produto? Fale conosco</button>
    </div>`;
  document.querySelectorAll('[data-detail-add]').forEach((botao) => botao.addEventListener('click', () => alterarQuantidade(Number(botao.dataset.detailAdd), 1)));
  document.querySelectorAll('[data-detail-remove]').forEach((botao) => botao.addEventListener('click', () => alterarQuantidade(Number(botao.dataset.detailRemove), -1)));
  document.querySelector('#conteudo-produto [data-contact]').addEventListener('click', contatoGeral);
  abrirModal('#modal-produto');
}

function alterarQuantidade(id, delta) {
  const atual = estado.carrinho[id] || 0;
  const nova = Math.max(0, atual + delta);
  if (nova) estado.carrinho[id] = nova; else delete estado.carrinho[id];
  salvarCarrinho();
  renderProdutos();
  if (delta > 0) mostrarToast('Produto adicionado ao carrinho');
  if (document.querySelector('#modal-carrinho').classList.contains('aberto')) renderCarrinho();
  if (document.querySelector('#modal-produto').classList.contains('aberto')) abrirProduto(id);
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
  const itens = estado.produtos.filter((produto) => estado.carrinho[produto.id]);
  if (!itens.length) {
    conteudo.innerHTML = `<div class="vazio carrinho-vazio"><span>◫</span><h3>Seu carrinho está vazio</h3><p>Escolha os produtos que deseja solicitar.</p><button class="botao primario" type="button" data-go-products>Ver produtos</button></div>`;
    conteudo.querySelector('[data-go-products]').addEventListener('click', () => { fecharModal(document.querySelector('#modal-carrinho')); document.querySelector('#catalogo').scrollIntoView({ behavior: 'smooth' }); });
    return;
  }
  const subtotal = itens.reduce((soma, produto) => soma + produto.preco * estado.carrinho[produto.id], 0);
  conteudo.innerHTML = `<div class="itens-carrinho">${itens.map((produto) => `<div class="item-carrinho"><span class="miniatura"><img src="${produto.imagem}" alt="" loading="lazy" referrerpolicy="no-referrer"><b>${produto.icone}</b></span><div><strong>${produto.nome}</strong><small>${moeda(produto.preco)} cada • demonstrativo</small></div><div class="controle"><button type="button" data-cart-remove="${produto.id}">−</button><b>${estado.carrinho[produto.id]}</b><button type="button" data-cart-add="${produto.id}">＋</button></div></div>`).join('')}</div>
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
  const itens = estado.produtos.filter((produto) => estado.carrinho[produto.id]);
  const subtotal = itens.reduce((soma, produto) => soma + produto.preco * estado.carrinho[produto.id], 0);
  const linhas = itens.map((produto) => `• ${estado.carrinho[produto.id]}x ${produto.nome} — ${moeda(produto.preco * estado.carrinho[produto.id])}`);
  const mensagem = [`Olá, Drogaria Rocha! Gostaria de solicitar este pedido:`, '', ...linhas, '', `Subtotal estimado: ${moeda(subtotal)}`, 'Valores demonstrativos, sujeitos à confirmação.', `Cliente: ${dados.get('nome')}`, `Recebimento: ${dados.get('tipo') === 'entrega' ? 'Entrega' : 'Retirada na drogaria'}`, dados.get('tipo') === 'entrega' ? `Endereço: ${dados.get('endereco')}` : '', dados.get('observacoes') ? `Observações: ${dados.get('observacoes')}` : '', estado.receita ? `Receita: enviarei o arquivo junto a esta mensagem.` : '', '', 'Aguardo a confirmação de disponibilidade e do valor final.'].filter(Boolean).join('\n');
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

function escapar(valor = '') {
  return String(valor).replace(/[&<>'"]/g, (caractere) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[caractere]);
}

async function carregarCatalogo() {
  const { data, error } = await supabase.from('products').select('*').order('id');
  if (error || !data?.length) return;
  estado.produtos = data.map((item) => {
    const local = PRODUTOS.find((produto) => produto.id === Number(item.id));
    return {
      id: Number(item.id),
      nome: item.name,
      descricao: item.description,
      categoria: item.category,
      preco: Number(item.price),
      selo: item.badge || '',
      imagem: item.image_url || local?.imagem || '',
      icone: local?.icone || item.name?.charAt(0)?.toUpperCase() || 'R',
      ativo: item.active
    };
  });
  renderProdutos();
}

async function usuarioEhAdmin() {
  const { data, error } = await supabase.rpc('is_admin');
  return !error && data === true;
}

function renderAdminLogin() {
  const conteudo = document.querySelector('#conteudo-admin');
  conteudo.innerHTML = `<div class="admin-login"><p>Entre com o e-mail autorizado para gerenciar os produtos da Drogaria Rocha.</p><form id="login-admin"><label>E-mail<input required type="email" name="email" autocomplete="username" placeholder="seuemail@exemplo.com"></label><label>Senha<input required type="password" name="senha" autocomplete="current-password" minlength="6" placeholder="Digite sua senha"></label><p class="admin-erro" role="alert" hidden></p><button class="botao primario largura-total" type="submit">Entrar no painel</button><button class="admin-recuperar" type="button" data-recuperar-senha>Primeiro acesso ou esqueci minha senha</button></form></div>`;
  conteudo.querySelector('#login-admin').addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const form = evento.currentTarget;
    const botao = form.querySelector('button');
    const erro = form.querySelector('.admin-erro');
    botao.disabled = true; botao.textContent = 'Entrando...'; erro.hidden = true;
    const dados = new FormData(form);
    const resposta = await supabase.auth.signInWithPassword({ email: dados.get('email'), password: dados.get('senha') });
    if (resposta.error || !(await usuarioEhAdmin())) {
      await supabase.auth.signOut();
      erro.textContent = resposta.error ? 'E-mail ou senha inválidos.' : 'Este usuário não possui permissão administrativa.';
      erro.hidden = false; botao.disabled = false; botao.textContent = 'Entrar no painel';
      return;
    }
    estado.admin = resposta.data.user;
    await carregarCatalogo();
    renderAdminPainel();
  });
  conteudo.querySelector('[data-recuperar-senha]').addEventListener('click', async () => {
    const form = conteudo.querySelector('#login-admin');
    const email = form.elements.email;
    const erro = form.querySelector('.admin-erro');
    const botao = form.querySelector('[data-recuperar-senha]');
    if (!email.reportValidity()) return;
    botao.disabled = true; botao.textContent = 'Enviando acesso...'; erro.hidden = true;
    const redirectTo = `${window.location.origin}${window.location.pathname}?admin=redefinir`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.value.trim(), { redirectTo });
    if (error) {
      erro.textContent = 'Não foi possível enviar o acesso. Tente novamente em alguns minutos.';
      erro.hidden = false; botao.disabled = false; botao.textContent = 'Primeiro acesso ou esqueci minha senha';
      return;
    }
    erro.classList.add('admin-sucesso');
    erro.textContent = 'Enviamos um novo link para seu e-mail. Abra a mensagem mais recente para criar sua senha.';
    erro.hidden = false; botao.textContent = 'Link enviado';
  });
}

function renderDefinirSenha() {
  abrirModal('#modal-admin');
  const conteudo = document.querySelector('#conteudo-admin');
  conteudo.innerHTML = `<div class="admin-login"><p>Crie uma senha para acessar o painel administrativo.</p><form id="definir-senha"><label>Nova senha<input required type="password" name="senha" autocomplete="new-password" minlength="8" placeholder="Mínimo de 8 caracteres"></label><label>Confirmar senha<input required type="password" name="confirmacao" autocomplete="new-password" minlength="8" placeholder="Digite novamente"></label><p class="admin-erro" role="alert" hidden></p><button class="botao primario largura-total" type="submit">Salvar senha e entrar</button></form></div>`;
  conteudo.querySelector('#definir-senha').addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const form = evento.currentTarget;
    const erro = form.querySelector('.admin-erro');
    const botao = form.querySelector('button');
    if (form.elements.senha.value !== form.elements.confirmacao.value) {
      erro.textContent = 'As senhas precisam ser iguais.'; erro.hidden = false; return;
    }
    botao.disabled = true; botao.textContent = 'Salvando senha...'; erro.hidden = true;
    const { data, error } = await supabase.auth.updateUser({ password: form.elements.senha.value });
    if (error || !(await usuarioEhAdmin())) {
      erro.textContent = error ? 'Não foi possível salvar a senha. Solicite um novo link de acesso.' : 'Este usuário não possui permissão administrativa.';
      erro.hidden = false; botao.disabled = false; botao.textContent = 'Salvar senha e entrar';
      return;
    }
    estado.admin = data.user;
    window.history.replaceState({}, '', window.location.pathname);
    await carregarCatalogo();
    renderAdminPainel();
    mostrarToast('Senha criada. Bem-vindo ao painel.');
  });
}

function iniciarFluxoAutenticacao() {
  supabase.auth.onAuthStateChange((evento, sessao) => {
    if (sessao && (evento === 'PASSWORD_RECOVERY' || fluxoDeSenha)) {
      window.setTimeout(renderDefinirSenha, 0);
    }
  });
  if (fluxoDeSenha) {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) renderDefinirSenha();
    });
  }
}

function formularioProduto(produto = {}) {
  const novo = !produto.id;
  return `<form class="admin-produto" data-id="${produto.id || ''}">
    <div class="admin-foto">${produto.imagem ? `<img src="${produto.imagem}" alt="">` : '<span>＋</span>'}<label>Trocar foto<input type="file" name="imagem" accept="image/jpeg,image/png,image/webp"></label></div>
    <div class="admin-campos">
      <label>Nome<input required name="nome" value="${escapar(produto.nome)}"></label>
      <label>Descrição<textarea required name="descricao" rows="2">${escapar(produto.descricao)}</textarea></label>
      <div class="admin-linha"><label>Categoria<select name="categoria" required>${CATEGORIAS.filter((cat) => cat.id !== 'todos').map((cat) => `<option value="${cat.id}" ${cat.id === produto.categoria ? 'selected' : ''}>${cat.nome}</option>`).join('')}</select></label><label>Preço (R$)<input required name="preco" inputmode="decimal" value="${produto.preco ?? ''}" placeholder="0,00"></label></div>
      <div class="admin-linha"><label>Selo<input name="selo" value="${escapar(produto.selo)}" placeholder="Ex.: Oferta"></label><label class="admin-check"><input type="checkbox" name="ativo" ${novo || produto.ativo !== false ? 'checked' : ''}> Produto disponível</label></div>
      <button class="botao primario" type="submit">${novo ? 'Adicionar produto' : 'Salvar alterações'}</button>
    </div>
  </form>`;
}

function renderAdminPainel() {
  const conteudo = document.querySelector('#conteudo-admin');
  conteudo.innerHTML = `<div class="admin-topo"><div><strong>${estado.produtos.length} produtos cadastrados</strong><small>Alterações publicadas para todos os clientes.</small></div><div><button type="button" class="botao secundario" data-new-product>＋ Novo produto</button><button type="button" class="admin-sair" data-admin-logout>Sair</button></div></div><div id="novo-produto" hidden>${formularioProduto()}</div><div class="admin-lista">${estado.produtos.map(formularioProduto).join('')}</div>`;
  conteudo.querySelector('[data-new-product]').addEventListener('click', () => {
    const novo = conteudo.querySelector('#novo-produto'); novo.hidden = !novo.hidden;
    if (!novo.hidden) novo.querySelector('input')?.focus();
  });
  conteudo.querySelector('[data-admin-logout]').addEventListener('click', async () => { await supabase.auth.signOut(); estado.admin = null; renderAdminLogin(); });
  conteudo.querySelectorAll('.admin-produto').forEach((form) => form.addEventListener('submit', salvarProdutoAdmin));
}

async function salvarProdutoAdmin(evento) {
  evento.preventDefault();
  const form = evento.currentTarget;
  const botao = form.querySelector('button[type="submit"]');
  const dados = new FormData(form);
  const preco = Number(String(dados.get('preco')).replace(',', '.'));
  if (!Number.isFinite(preco) || preco < 0) { mostrarToast('Informe um preço válido.'); return; }
  botao.disabled = true; botao.textContent = 'Salvando...';
  const payload = { name: dados.get('nome').trim(), description: dados.get('descricao').trim(), category: dados.get('categoria'), price: preco, badge: dados.get('selo').trim(), active: dados.get('ativo') === 'on' };
  const id = form.dataset.id ? Number(form.dataset.id) : null;
  const consulta = id ? supabase.from('products').update(payload).eq('id', id).select().single() : supabase.from('products').insert(payload).select().single();
  const { data: produtoSalvo, error } = await consulta;
  if (error) { botao.disabled = false; botao.textContent = id ? 'Salvar alterações' : 'Adicionar produto'; mostrarToast('Não foi possível salvar o produto.'); return; }
  const arquivo = dados.get('imagem');
  if (arquivo?.size) {
    if (arquivo.size > 5 * 1024 * 1024) { mostrarToast('A foto deve ter no máximo 5 MB.'); botao.disabled = false; return; }
    const extensao = arquivo.name.split('.').pop()?.toLowerCase() || 'webp';
    const caminho = `${produtoSalvo.id}/principal-${Date.now()}.${extensao}`;
    const envio = await supabase.storage.from('product-images').upload(caminho, arquivo, { upsert: true, contentType: arquivo.type });
    if (!envio.error) {
      const { data: publica } = supabase.storage.from('product-images').getPublicUrl(caminho);
      await supabase.from('products').update({ image_url: publica.publicUrl }).eq('id', produtoSalvo.id);
    }
  }
  await carregarCatalogo();
  mostrarToast(id ? 'Produto atualizado.' : 'Produto adicionado.');
  renderAdminPainel();
}

async function abrirAdmin() {
  abrirModal('#modal-admin');
  const { data } = await supabase.auth.getSession();
  if (data.session && await usuarioEhAdmin()) { estado.admin = data.session.user; await carregarCatalogo(); renderAdminPainel(); }
  else renderAdminLogin();
}

function contatoGeral() {
  const texto = 'Olá, Drogaria Rocha! Preciso de ajuda para encontrar um produto.';
  window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener,noreferrer');
}

function mostrarToast(texto) {
  const toast = document.querySelector('.toast'); toast.textContent = texto; toast.classList.add('visivel');
  clearTimeout(mostrarToast.timer); mostrarToast.timer = setTimeout(() => toast.classList.remove('visivel'), 2600);
}

function mostrarBanner(indice) {
  const banners = [...document.querySelectorAll('[data-banner]')];
  if (!banners.length) return;
  bannerAtual = (indice + banners.length) % banners.length;
  const trilho = document.querySelector('.banner-trilho');
  if (trilho) trilho.style.transform = `translate3d(-${bannerAtual * 100}%, 0, 0)`;
  banners.forEach((banner, posicao) => {
    const ativo = posicao === bannerAtual;
    banner.classList.toggle('ativo', ativo);
    banner.setAttribute('aria-hidden', String(!ativo));
    banner.inert = !ativo;
  });
  document.querySelectorAll('[data-banner-dot]').forEach((botao, posicao) => {
    const ativo = posicao === bannerAtual;
    botao.classList.toggle('ativo', ativo);
    botao.setAttribute('aria-selected', String(ativo));
  });
}

function iniciarBanner() {
  clearInterval(bannerTimer);
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  bannerTimer = setInterval(() => mostrarBanner(bannerAtual + 1), 4000);
}

function ligarEventos() {
  document.querySelectorAll('.banner-botao[data-product]').forEach((botao) => botao.addEventListener('click', () => abrirProduto(Number(botao.dataset.product))));
  document.querySelector('[data-banner-prev]')?.addEventListener('click', () => { mostrarBanner(bannerAtual - 1); iniciarBanner(); });
  document.querySelector('[data-banner-next]')?.addEventListener('click', () => { mostrarBanner(bannerAtual + 1); iniciarBanner(); });
  document.querySelectorAll('[data-banner-dot]').forEach((botao) => botao.addEventListener('click', () => { mostrarBanner(Number(botao.dataset.bannerDot)); iniciarBanner(); }));
  const trilhoBanner = document.querySelector('.banner-trilho');
  let inicioArraste = 0;
  trilhoBanner?.addEventListener('pointerdown', (event) => { inicioArraste = event.clientX; clearInterval(bannerTimer); });
  trilhoBanner?.addEventListener('pointerup', (event) => { const distancia = event.clientX - inicioArraste; if (Math.abs(distancia) > 45) mostrarBanner(bannerAtual + (distancia < 0 ? 1 : -1)); iniciarBanner(); });
  trilhoBanner?.addEventListener('pointercancel', iniciarBanner);
  mostrarBanner(0);
  iniciarBanner();
  document.querySelectorAll('#busca, #busca-mobile').forEach((campo) => campo.addEventListener('input', (event) => {
    estado.busca = event.target.value;
    document.querySelectorAll('#busca, #busca-mobile').forEach((outro) => { if (outro !== event.target) outro.value = estado.busca; });
    renderProdutos();
    if (campo.id === 'busca-mobile') document.querySelector('#catalogo').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
  document.querySelectorAll('[data-category]').forEach((botao) => botao.addEventListener('click', () => { estado.categoria = botao.dataset.category; document.querySelectorAll('[data-category]').forEach((item) => item.setAttribute('aria-selected', String(item === botao))); renderProdutos(); }));
  document.querySelectorAll('[data-scroll]').forEach((botao) => botao.addEventListener('click', () => document.querySelector(`#${botao.dataset.scroll}`).scrollIntoView({ behavior: 'smooth' })));
  document.querySelectorAll('[data-open-cart]').forEach((botao) => botao.addEventListener('click', () => { renderCarrinho(); abrirModal('#modal-carrinho'); }));
  document.querySelectorAll('[data-open-prescription]').forEach((botao) => botao.addEventListener('click', () => abrirModal('#modal-receita')));
  document.querySelector('[data-open-admin]').addEventListener('click', abrirAdmin);
  document.querySelectorAll('[data-close]').forEach((botao) => botao.addEventListener('click', () => fecharModal(botao.closest('.modal'))));
  document.querySelector('[data-contact]').addEventListener('click', contatoGeral);
  document.querySelector('#arquivo-receita').addEventListener('change', (event) => selecionarReceita(event.target.files[0]));
  document.querySelector('[data-prescription-done]').addEventListener('click', () => { if (!estado.receita) { mostrarToast('Selecione uma foto ou PDF da receita.'); return; } fecharModal(document.querySelector('#modal-receita')); renderCarrinho(); abrirModal('#modal-carrinho'); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') document.querySelectorAll('.modal.aberto').forEach(fecharModal); });
}

if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`));
render();
carregarCatalogo();
iniciarFluxoAutenticacao();
