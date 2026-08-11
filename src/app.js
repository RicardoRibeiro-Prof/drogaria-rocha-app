import { CATEGORIAS, PRODUTOS, moeda } from './catalogo.js';
import { supabase } from './supabase.js';
import { BANNER_CUIDADOS, BANNER_CABELOS, BANNER_PROTECAO } from './banners-v20.js';
const LOGO_ROCHA = new URL('../assets/logo-rocha-oficial.webp', import.meta.url).href;

const ICONES = {
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>',
  truck: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>',
  pharmacist: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6v4h4v6h-4v4H9v-4H5V7h4z"/><path d="M6 21h12"/></svg>',
  sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/></svg>',
  droplet: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11Z"/><path d="M9 15c.4 1.2 1.3 2 2.5 2.2"/></svg>',
  bubbles: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="14" r="5"/><circle cx="16.5" cy="8" r="3.5"/><circle cx="18" cy="17" r="2"/></svg>',
  palette: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 0 0 0 18h1.5a2 2 0 0 0 0-4H12a2 2 0 0 1 0-4h4a5 5 0 0 0 5-5c0-3-4-5-9-5Z"/><circle cx="7.5" cy="10" r=".8"/><circle cx="10" cy="6.8" r=".8"/><circle cx="14" cy="6.5" r=".8"/></svg>',
  shampoo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6M10 3v4h4V3M8 9h8l1 3v8H7v-8z"/><path d="M9.5 15h5"/></svg>',
  treatment: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8h12l-1 12H7zM8 4h8l2 4H6z"/><path d="M10 13h4M12 11v4"/></svg>',
  prescription: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l3 3v15H6zM14 3v4h4M9 11h6M9 15h4"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></svg>',
  support: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 0 1 16 0v5a2 2 0 0 1-2 2h-2v-6h4M4 13h4v6H6a2 2 0 0 1-2-2z"/><path d="M16 19c-1 2-3 2-5 2"/></svg>',
  home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 9-8 9 8"/><path d="M5 10v11h14V10M9 21v-7h6v7"/></svg>',
  cart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h2l2 10h9l2-7H7"/><circle cx="10" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>'
};

const ICONE_CATEGORIA = { todos: 'treatment', limpeza: 'bubbles', hidratacao: 'droplet', protecao: 'sun', rejuvenescimento: 'pharmacist', coloracao: 'palette', shampoo: 'shampoo', 'tratamento-capilar': 'treatment' };
const icone = (nome, classe = 'ui-icone') => `<span class="${classe}">${ICONES[nome]}</span>`;

const estado = {
  busca: '',
  categoria: 'todos',
  carrinho: JSON.parse(localStorage.getItem('dr-carrinho') || '{}'),
  receita: null,
  entrega: 'entrega',
  produtos: PRODUTOS,
  mostrarTodos: false,
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
          <img src="${LOGO_ROCHA}" alt="Drogaria Rocha">
          <span class="marca-texto"><strong>Drogaria</strong><em>ROCHA</em><small>Saúde, beleza e cuidado</small></span>
        </a>
        <label class="busca busca-mobile busca-topo">${icone('search', 'campo-icone')}<span class="sr-only">Buscar produto</span><input id="busca-mobile" type="search" placeholder="Busque medicamentos, beleza e cuidados..." autocomplete="off"></label>
        <button class="localizacao" type="button" data-scroll="atendimento" aria-label="Ver informações de atendimento">
          <span>Entregar ou retirar</span><strong>Atendimento local</strong>
        </button>
        <button class="botao-carrinho topo" type="button" data-open-cart aria-label="Abrir carrinho">
          ${icone('cart', 'icone-sacola')}<span class="texto-carrinho">Carrinho</span><b data-cart-count hidden>0</b>
        </button>
      </div>
    </header>

    <div class="barra-confianca" aria-label="Benefícios da Drogaria Rocha">
      <span><b>✓</b><strong>Atendimento local</strong> com cuidado</span>
      <span><b>✓</b><strong>Retirada ou entrega</strong> combinada</span>
      <span><b>✓</b><strong>Compra segura</strong> e confirmação do pedido</span>
    </div>

    <nav class="menu-departamentos" aria-label="Departamentos da loja">
      <strong>Departamentos</strong>
      <button type="button" data-category="protecao">Proteção solar</button>
      <button type="button" data-category="hidratacao">Dermocosméticos</button>
      <button type="button" data-category="coloracao">Coloração</button>
      <button type="button" data-category="shampoo">Cabelos</button>
      <button type="button" data-category="tratamento-capilar">Tratamentos</button>
      <button class="menu-ofertas" type="button" data-category="todos">Ofertas</button>
    </nav>

    <main id="inicio">
      <section class="hero hero-banners" aria-label="Ofertas em destaque">
        <div class="banner-janela"><div class="banner-trilho">
          <article class="banner-slide ativo banner-claro" data-banner="0">
            <img class="banner-fundo" src="${BANNER_CUIDADOS}" alt="" aria-hidden="true">
            <div class="banner-conteudo"><span>CUIDADOS DIÁRIOS</span><h1>Higiene e beleza<br>para sua rotina.</h1><p>Seleção especial para cuidar de você todos os dias.</p><button class="botao banner-botao escuro" type="button" data-scroll="catalogo">Ver produtos <b>→</b></button></div>
          </article>
          <article class="banner-slide banner-escuro" data-banner="1">
            <img class="banner-fundo" src="${BANNER_CABELOS}" alt="" aria-hidden="true">
            <div class="banner-conteudo"><span>CUIDADO CAPILAR</span><h1>Cabelos bem cuidados<br>começam aqui.</h1><p>Shampoos, tratamentos e colorações para diferentes rotinas.</p><button class="botao banner-botao claro" type="button" data-category="tratamento-capilar">Explorar cabelos <b>→</b></button></div>
          </article>
          <article class="banner-slide banner-claro" data-banner="2">
            <img class="banner-fundo" src="${BANNER_PROTECAO}" alt="" aria-hidden="true">
            <div class="banner-conteudo"><span>PROTEÇÃO E BEM-ESTAR</span><h1>Cuidados essenciais<br>sempre por perto.</h1><p>Proteção solar e bem-estar para completar sua rotina.</p><button class="botao banner-botao escuro" type="button" data-category="protecao">Ver proteção solar <b>→</b></button></div>
          </article>
        </div></div>
        <button class="banner-seta anterior" type="button" data-banner-prev aria-label="Banner anterior">‹</button>
        <button class="banner-seta proximo" type="button" data-banner-next aria-label="Próximo banner">›</button>
        <div class="banner-indicadores" role="tablist" aria-label="Escolher banner"><button class="ativo" type="button" data-banner-dot="0" aria-label="Banner 1"></button><button type="button" data-banner-dot="1" aria-label="Banner 2"></button><button type="button" data-banner-dot="2" aria-label="Banner 3"></button></div>
      </section>

      <section class="beneficios-premium" aria-label="Vantagens da Drogaria Rocha">
        <article>${icone('truck')}<div><strong>Entrega combinada</strong><small>Consulte a disponibilidade</small></div></article>
        <article>${icone('home')}<div><strong>Retire na drogaria</strong><small>Reserve antes de sair</small></div></article>
        <article>${icone('prescription')}<div><strong>Envie sua receita</strong><small>Solicite uma cotação</small></div></article>
        <article>${icone('pharmacist')}<div><strong>Orientação farmacêutica</strong><small>Atendimento responsável</small></div></article>
        <article>${icone('support')}<div><strong>Fale com a equipe</strong><small>Atendimento pelo WhatsApp</small></div></article>
      </section>

      <section class="vitrine-categorias" aria-labelledby="titulo-categorias">
        <div class="vitrine-categorias-topo"><div><span>ENCONTRE MAIS RÁPIDO</span><h2 id="titulo-categorias">Compre por categoria</h2></div><button type="button" data-scroll="catalogo">Ver todos os produtos →</button></div>
        <div class="vitrine-categorias-lista">
          <button type="button" data-category="protecao">${icone('sun')}<strong>Proteção solar</strong><small>Cuidados diários</small></button>
          <button type="button" data-category="hidratacao">${icone('droplet')}<strong>Hidratação</strong><small>Rosto e corpo</small></button>
          <button type="button" data-category="limpeza">${icone('bubbles')}<strong>Limpeza facial</strong><small>Pele bem cuidada</small></button>
          <button type="button" data-category="coloracao">${icone('palette')}<strong>Coloração</strong><small>Renove o visual</small></button>
          <button type="button" data-category="shampoo">${icone('shampoo')}<strong>Shampoos</strong><small>Todos os tipos</small></button>
          <button type="button" data-category="tratamento-capilar">${icone('treatment')}<strong>Tratamentos</strong><small>Nutrição capilar</small></button>
        </div>
      </section>

      <section class="atalhos" aria-label="Serviços rápidos">
        <button type="button" data-open-prescription>${icone('prescription', 'ui-icone atalho-icone')}<span><strong>Envie sua receita</strong><small>Fotografe e solicite uma cotação</small></span>${icone('arrow', 'atalho-seta')}</button>
        <button type="button" data-scroll="catalogo">${icone('search', 'ui-icone atalho-icone')}<span><strong>Busque um produto</strong><small>Consulte o catálogo rapidamente</small></span>${icone('arrow', 'atalho-seta')}</button>
        <button type="button" data-scroll="atendimento">${icone('support', 'ui-icone atalho-icone')}<span><strong>Fale com a equipe</strong><small>Tire dúvidas antes de pedir</small></span>${icone('arrow', 'atalho-seta')}</button>
      </section>

      <section class="secao catalogo" id="catalogo">
        <div class="secao-titulo"><div><span class="sobretitulo">PREÇOS E DISPONIBILIDADE SOB CONSULTA</span><h2>Ofertas do dia</h2></div><button class="prateleira-link" type="button" data-show-all-top>Ver todas as ofertas</button></div>
        <label class="busca">${icone('search', 'campo-icone')}<span class="sr-only">Buscar produto</span><input id="busca" type="search" placeholder="Busque pelo nome do produto..." autocomplete="off"></label>
        <div class="categorias" role="tablist" aria-label="Categorias">
          ${CATEGORIAS.map((cat) => `<button type="button" role="tab" data-category="${cat.id}" aria-selected="${cat.id === estado.categoria}">${icone(ICONE_CATEGORIA[cat.id], 'filtro-icone')}${cat.nome}</button>`).join('')}
        </div>
        <div class="grade-produtos" id="lista-produtos"></div>
        <div class="catalogo-mais" id="catalogo-mais"></div>
      </section>

      <section class="faixa-atendimento" id="atendimento">
        <div><span class="sobretitulo claro">ATENDIMENTO DE VERDADE</span><h2>Precisa de ajuda para encontrar um produto?</h2><p>Nossa equipe confere a disponibilidade e orienta você na finalização do pedido.</p></div>
        <button class="botao branco" type="button" data-contact>Falar com a drogaria <span>→</span></button>
      </section>
    </main>

    <footer><div class="marca marca-rodape"><img src="${LOGO_ROCHA}" alt="Drogaria Rocha"></div><p>Medicamentos podem exigir receita e avaliação do farmacêutico. Não se automedique.</p><div class="rodape-final"><small>© 2026 Drogaria Rocha.</small><button type="button" class="admin-link" data-open-admin>Administrar catálogo</button></div></footer>

    <div class="modal modal-produto" id="modal-produto" aria-hidden="true"><div class="modal-fundo" data-close></div><section class="painel painel-produto" role="dialog" aria-modal="true" aria-labelledby="detalhe-nome"><button type="button" class="voltar-produto" data-close aria-label="Voltar">←</button><div id="conteudo-produto"></div></section></div>
    <div class="modal" id="modal-carrinho" aria-hidden="true"><div class="modal-fundo" data-close></div><section class="painel" role="dialog" aria-modal="true" aria-labelledby="titulo-carrinho"><header><div><span class="sobretitulo">SEU PEDIDO</span><h2 id="titulo-carrinho">Meu carrinho</h2></div><button type="button" class="fechar" data-close aria-label="Fechar">×</button></header><div id="conteudo-carrinho"></div></section></div>
    <div class="modal" id="modal-receita" aria-hidden="true"><div class="modal-fundo" data-close></div><section class="painel painel-menor" role="dialog" aria-modal="true" aria-labelledby="titulo-receita"><header><div><span class="sobretitulo">COTAÇÃO SEGURA</span><h2 id="titulo-receita">Enviar receita</h2></div><button type="button" class="fechar" data-close aria-label="Fechar">×</button></header><p>Use uma foto nítida, com todos os dados visíveis. A dispensação dependerá da análise do farmacêutico.</p><label class="upload"><input id="arquivo-receita" type="file" accept="image/*,.pdf" capture="environment"><span>＋</span><strong>Fotografar ou escolher receita</strong><small>Imagem ou PDF</small></label><div id="arquivo-selecionado" class="arquivo-selecionado" hidden></div><button class="botao primario largura-total" type="button" data-prescription-done>Continuar pedido</button></section></div>
    <div class="modal" id="modal-admin" aria-hidden="true"><div class="modal-fundo" data-close></div><section class="painel painel-admin" role="dialog" aria-modal="true" aria-labelledby="titulo-admin"><header><div><span class="sobretitulo">ÁREA PROTEGIDA</span><h2 id="titulo-admin">Administrar catálogo</h2></div><button type="button" class="fechar" data-close aria-label="Fechar">×</button></header><div id="conteudo-admin"></div></section></div>
    <div class="toast" role="status" aria-live="polite"></div>
    <button class="carrinho-flutuante" type="button" data-open-cart><span>Ver carrinho</span><strong><b data-cart-count hidden>0</b> itens</strong></button>
    <nav class="navegacao-mobile" aria-label="Navegação principal">
      <button class="ativo" type="button" data-scroll="inicio">${icone('home', 'nav-icone')}<small>Início</small></button>
      <button type="button" data-scroll="catalogo">${icone('search', 'nav-icone')}<small>Produtos</small></button>
      <button type="button" data-open-prescription>${icone('prescription', 'nav-icone')}<small>Receita</small></button>
      <button type="button" data-open-cart>${icone('cart', 'nav-icone')}<small>Carrinho</small><b data-cart-count hidden>0</b></button>
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
  const filtrados = produtosFiltrados();
  const limitar = !estado.busca && estado.categoria === 'todos' && !estado.mostrarTodos;
  const produtos = limitar ? filtrados.slice(0, 12) : filtrados;
  lista.innerHTML = produtos.length ? produtos.map((produto) => {
    const quantidade = estado.carrinho[produto.id] || 0;
    const categoria = CATEGORIAS.find((cat) => cat.id === produto.categoria)?.nome;
    return `<article class="produto" data-product="${produto.id}" role="button" tabindex="0" aria-label="Ver detalhes de ${produto.nome}"><div class="produto-imagem"><img src="${produto.imagem}" alt="${produto.nome}" loading="lazy" referrerpolicy="no-referrer" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="produto-fallback" hidden>${produto.icone}</span>${produto.selo ? `<b>${produto.selo}</b>` : ''}<span class="produto-ver">Ver detalhes</span></div><div class="produto-corpo"><small>${categoria}</small><h3>${produto.nome}</h3><p>${produto.descricao}</p><div class="produto-disponibilidade"><i></i> Disponível para consulta</div><div class="produto-rodape"><div class="preco-info"><small>A partir de</small><strong>${moeda(produto.preco)}</strong></div>${quantidade ? `<div class="controle"><button type="button" data-remove="${produto.id}" aria-label="Remover uma unidade">−</button><b>${quantidade}</b><button type="button" data-add="${produto.id}" aria-label="Adicionar uma unidade">＋</button></div>` : `<button class="adicionar" type="button" data-add="${produto.id}" aria-label="Adicionar ${produto.nome}"><span>Adicionar</span><b>＋</b></button>`}</div></div></article>`;
  }).join('') : `<div class="vazio">${icone('search')}<h3>Nenhum produto encontrado</h3><p>Tente outro nome ou escolha uma categoria diferente.</p></div>`;
  const mais = document.querySelector('#catalogo-mais');
  if (mais) {
    mais.innerHTML = limitar && filtrados.length > produtos.length ? `<button type="button" data-show-all>Ver catálogo completo <span>＋${filtrados.length - produtos.length} produtos</span></button>` : estado.mostrarTodos && !estado.busca && estado.categoria === 'todos' ? `<button type="button" data-show-less>Mostrar menos produtos</button>` : '';
    mais.querySelector('[data-show-all]')?.addEventListener('click', () => { estado.mostrarTodos = true; renderProdutos(); });
    mais.querySelector('[data-show-less]')?.addEventListener('click', () => { estado.mostrarTodos = false; renderProdutos(); document.querySelector('#catalogo').scrollIntoView({ behavior: 'smooth' }); });
  }
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
    conteudo.innerHTML = `<div class="vazio carrinho-vazio">${icone('cart')}<h3>Seu carrinho está vazio</h3><p>Escolha os produtos que deseja solicitar.</p><button class="botao primario" type="button" data-go-products>Ver produtos</button></div>`;
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
  document.querySelectorAll('[data-category]').forEach((botao) => botao.addEventListener('click', () => { estado.categoria = botao.dataset.category; document.querySelectorAll('[data-category]').forEach((item) => item.setAttribute('aria-selected', String(item.dataset.category === estado.categoria))); renderProdutos(); document.querySelector('#catalogo').scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
  document.querySelector('[data-show-all-top]')?.addEventListener('click', () => { estado.busca = ''; estado.categoria = 'todos'; estado.mostrarTodos = true; renderProdutos(); document.querySelector('#catalogo').scrollIntoView({ behavior: 'smooth' }); });
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

if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/drogaria-rocha-app/sw.js'));
render();
carregarCatalogo();
iniciarFluxoAutenticacao();
