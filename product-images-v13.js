import { IMAGENS_LOCAIS } from './src/imagens-locais.js';
import { PRODUTOS } from './src/catalogo.js';

const nomesParaId = new Map(PRODUTOS.map((p) => [p.nome.trim().toLowerCase(), Number(p.id)]));

function esconderFallback(img){
  const fallback = img.parentElement?.querySelector('.produto-fallback');
  if (fallback) fallback.hidden = true;
}

function mostrarFallback(img){
  const fallback = img.parentElement?.querySelector('.produto-fallback');
  img.hidden = true;
  if (fallback) fallback.hidden = false;
}

function aplicarLocal(img, id){
  const local = IMAGENS_LOCAIS[id];
  if (!local) return false;
  if (img.dataset.rochaLocalId === String(id) && img.src === local) return true;
  img.dataset.rochaLocalId = String(id);
  img.hidden = false;
  img.onerror = () => mostrarFallback(img);
  img.onload = () => esconderFallback(img);
  img.removeAttribute('referrerpolicy');
  img.src = local;
  return true;
}

function idPeloAlt(img){
  const nome = String(img.alt || '').trim().toLowerCase();
  if (nomesParaId.has(nome)) return nomesParaId.get(nome);
  const card = [...document.querySelectorAll('.produto[data-product]')].find((el) => {
    const h = el.querySelector('h3')?.textContent?.trim().toLowerCase();
    return h && h === nome;
  });
  return card ? Number(card.dataset.product) : null;
}

function corrigirCards(){
  document.querySelectorAll('.produto[data-product]').forEach((card) => {
    const img = card.querySelector('.produto-imagem img');
    if (!img) return;
    const id = Number(card.dataset.product);
    if (IMAGENS_LOCAIS[id]) aplicarLocal(img, id);
    else {
      img.hidden = false;
      img.onerror = () => mostrarFallback(img);
    }
  });
}

function corrigirDetalheECarrinho(){
  document.querySelectorAll('#conteudo-produto img, #conteudo-carrinho img').forEach((img) => {
    const id = idPeloAlt(img);
    if (id && IMAGENS_LOCAIS[id]) aplicarLocal(img, id);
  });
}

function corrigirTudo(){
  corrigirCards();
  corrigirDetalheECarrinho();
}

function iniciar(){
  corrigirTudo();
  const observer = new MutationObserver(() => requestAnimationFrame(corrigirTudo));
  observer.observe(document.body, { childList:true, subtree:true });
  document.addEventListener('click', () => setTimeout(corrigirTudo, 30), true);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
else iniciar();
