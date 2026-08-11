(() => {
  function abrirAdminExistente() {
    const original = document.querySelector('[data-open-admin]');
    if (original) {
      original.click();
      return true;
    }
    return false;
  }

  function inserirAcesso() {
    if (document.querySelector('#rocha-admin-access')) return true;
    const header = document.querySelector('.cabecalho-linha');
    if (!header) return false;

    const botao = document.createElement('button');
    botao.id = 'rocha-admin-access';
    botao.type = 'button';
    botao.className = 'rocha-admin-access';
    botao.setAttribute('aria-label', 'Entrar no painel administrativo');
    botao.innerHTML = '<span aria-hidden="true">⚙</span><strong>Admin</strong>';
    botao.addEventListener('click', abrirAdminExistente);
    header.appendChild(botao);

    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === '1') {
      setTimeout(abrirAdminExistente, 250);
    }
    return true;
  }

  if (!inserirAcesso()) {
    const observer = new MutationObserver(() => {
      if (inserirAcesso()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 12000);
  }
})();
