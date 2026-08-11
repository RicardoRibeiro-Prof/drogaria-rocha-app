(() => {
  const banners = [
    {
      src: '/drogaria-rocha-app/assets/banner-aprovado-higiene.webp?v=7',
      alt: 'Drogaria Rocha — ofertas de higiene e beleza'
    },
    {
      src: '/drogaria-rocha-app/assets/banner-aprovado-vitaminas.webp?v=7',
      alt: 'Drogaria Rocha — vitaminas para o seu dia'
    },
    {
      src: '/drogaria-rocha-app/assets/banner-aprovado-app.webp?v=7',
      alt: 'Drogaria Rocha — peça pelo app e receba com facilidade'
    }
  ];

  function aplicar() {
    const slides = [...document.querySelectorAll('.banner-slide')];
    if (slides.length < 3) return false;

    slides.slice(0, 3).forEach((slide, i) => {
      slide.classList.remove('banner-native-v5', 'banner-art-slide');
      slide.classList.add('banner-real-v6');
      slide.innerHTML = '';

      const img = document.createElement('img');
      img.className = 'banner-real-v6-img';
      img.src = banners[i].src;
      img.alt = banners[i].alt;
      img.decoding = 'async';
      if (i === 0) img.fetchPriority = 'high';
      slide.appendChild(img);
      slide.setAttribute('aria-label', banners[i].alt);
      slide.onclick = () => document.querySelector('#catalogo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return true;
  }

  function init() {
    if (aplicar()) return;
    const observer = new MutationObserver(() => {
      if (aplicar()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 12000);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', () => setTimeout(init, 120))
    : setTimeout(init, 120);
})();
