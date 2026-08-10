(() => {
  const SUPABASE_URL = 'https://jduynqhrblvogqltmabk.supabase.co';
  const PUBLIC_KEY = 'sb_publishable_8e-UiAHrdjYMT6_-R39MMA_WZVVtKQz';
  const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
  const token = hash.get('access_token');
  const tipo = hash.get('type');
  const emFluxoDeSenha = token && (tipo === 'invite' || tipo === 'recovery');

  const estilos = document.createElement('style');
  estilos.textContent = `
    .dr-auth-overlay{position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.66);display:grid;place-items:center;padding:18px}
    .dr-auth-card{width:min(430px,100%);background:#fff;border-radius:20px;padding:28px;box-shadow:0 24px 70px rgba(0,0,0,.28);font-family:DM Sans,Arial,sans-serif}
    .dr-auth-card h2{margin:0 0 8px;color:#121212;font:800 27px Manrope,Arial,sans-serif}
    .dr-auth-card p{color:#666;line-height:1.5;margin:0 0 20px}
    .dr-auth-card label{display:grid;gap:6px;margin:13px 0;font-size:12px;font-weight:700;color:#222}
    .dr-auth-card input{width:100%;box-sizing:border-box;border:1px solid #ddd;border-radius:11px;padding:12px;font:inherit}
    .dr-auth-card button{width:100%;min-height:48px;border:0;border-radius:12px;background:#121212;color:#fff;font-weight:800;margin-top:10px;cursor:pointer}
    .dr-auth-card button:disabled{opacity:.65;cursor:wait}
    .dr-auth-erro{background:#fff0ee;color:#a51d12;border-radius:9px;padding:10px!important;font-size:12px;margin:12px 0 0!important}
    .dr-auth-sucesso{background:#fff4ed;color:#8d3b10;border-radius:9px;padding:12px!important;font-size:13px;margin:12px 0 0!important}
    .dr-recuperar{border:0!important;background:transparent!important;color:#d85114!important;box-shadow:none!important;text-decoration:underline;min-height:36px!important;margin-top:2px!important}
  `;
  document.head.appendChild(estilos);

  function emailDoToken(jwt) {
    try {
      return JSON.parse(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).email || '';
    } catch { return ''; }
  }

  function mostrarCriacaoDeSenha() {
    const overlay = document.createElement('div');
    overlay.className = 'dr-auth-overlay';
    overlay.innerHTML = `<section class="dr-auth-card" role="dialog" aria-modal="true" aria-labelledby="dr-titulo-senha">
      <h2 id="dr-titulo-senha">Crie sua senha</h2>
      <p>Defina a senha que será usada para administrar o catálogo da Drogaria Rocha.</p>
      <form>
        <label>Nova senha<input required name="senha" type="password" minlength="8" autocomplete="new-password" placeholder="Mínimo de 8 caracteres"></label>
        <label>Confirmar senha<input required name="confirmacao" type="password" minlength="8" autocomplete="new-password" placeholder="Digite novamente"></label>
        <p class="dr-auth-erro" role="alert" hidden></p>
        <button type="submit">Salvar senha e continuar</button>
      </form>
    </section>`;
    document.body.appendChild(overlay);
    const form = overlay.querySelector('form');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const erro = form.querySelector('.dr-auth-erro');
      const botao = form.querySelector('button');
      if (form.elements.senha.value !== form.elements.confirmacao.value) {
        erro.textContent = 'As senhas precisam ser iguais.';
        erro.hidden = false;
        return;
      }
      botao.disabled = true;
      botao.textContent = 'Salvando senha...';
      erro.hidden = true;
      try {
        const resposta = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
          method: 'PUT',
          headers: {
            apikey: PUBLIC_KEY,
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ password: form.elements.senha.value })
        });
        if (!resposta.ok) throw new Error('senha');
        const email = emailDoToken(token);
        history.replaceState({}, '', location.pathname);
        overlay.innerHTML = `<section class="dr-auth-card"><h2>Senha criada</h2><p class="dr-auth-sucesso">Agora você já pode entrar no painel administrativo com seu e-mail e a senha criada.</p><button type="button" data-abrir-painel>Entrar no painel</button></section>`;
        overlay.querySelector('[data-abrir-painel]').addEventListener('click', () => {
          overlay.remove();
          document.querySelector('[data-open-admin]')?.click();
          setTimeout(() => {
            const campo = document.querySelector('#login-admin input[name="email"]');
            if (campo && email) campo.value = email;
          }, 150);
        });
      } catch {
        erro.textContent = 'O link expirou ou não pôde ser validado. Feche esta tela e solicite um novo link em “Primeiro acesso ou esqueci minha senha”.';
        erro.hidden = false;
        botao.disabled = false;
        botao.textContent = 'Tentar novamente';
      }
    });
  }

  function instalarRecuperacao() {
    const form = document.querySelector('#login-admin');
    if (!form || form.querySelector('[data-dr-recuperar]')) return;
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'dr-recuperar';
    botao.dataset.drRecuperar = '';
    botao.textContent = 'Primeiro acesso ou esqueci minha senha';
    form.appendChild(botao);
    botao.addEventListener('click', async () => {
      const email = form.querySelector('input[name="email"]');
      const mensagem = form.querySelector('.admin-erro');
      if (!email.reportValidity()) return;
      botao.disabled = true;
      botao.textContent = 'Enviando link...';
      if (mensagem) mensagem.hidden = true;
      const redirectTo = `${location.origin}${location.pathname}?admin=redefinir`;
      try {
        const resposta = await fetch(`${SUPABASE_URL}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`, {
          method: 'POST',
          headers: { apikey: PUBLIC_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.value.trim() })
        });
        if (!resposta.ok) throw new Error('envio');
        if (mensagem) {
          mensagem.textContent = 'Enviamos um novo link. Abra a mensagem mais recente para criar sua senha.';
          mensagem.classList.add('admin-sucesso');
          mensagem.hidden = false;
        }
        botao.textContent = 'Link enviado';
      } catch {
        if (mensagem) {
          mensagem.textContent = 'Não foi possível enviar o link. Tente novamente em alguns minutos.';
          mensagem.hidden = false;
        }
        botao.disabled = false;
        botao.textContent = 'Primeiro acesso ou esqueci minha senha';
      }
    });
  }

  const iniciar = () => {
    if (emFluxoDeSenha) mostrarCriacaoDeSenha();
    instalarRecuperacao();
    new MutationObserver(instalarRecuperacao).observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();