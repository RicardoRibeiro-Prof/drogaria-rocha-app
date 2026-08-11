(() => {
  const banners = [
    {
      src: '/drogaria-rocha-app/assets/banner-aprovado-higiene.webp?v=6',
      alt: 'Drogaria Rocha — ofertas de higiene e beleza'
    },
    {
      src: '/drogaria-rocha-app/assets/banner-aprovado-vitaminas.webp?v=6',
      alt: 'Drogaria Rocha — vitaminas para o seu dia'
    },
    {
      src: '/drogaria-rocha-app/assets/banner-aprovado-app.webp?v=6',
      alt: 'Drogaria Rocha — peça pelo app e receba com facilidade'
    }
  ];

  function aplicar() {
    const slides = [...document.querySelectorAll('.banner-slide')];
    if (slides.length < 3) return false;

    slides.slice(0, 3).forEach((slide, i) => {
      slide.className = `${slide.className.replace(/banner-native-v5|banner-art-slide/g, '')} banner-real-v6`;
      slide.innerHTML = `<img class="banner-real-v6-img" src="${banners[i].src}" alt="${banners[i].alt}" decoding="async" fetchpriority="${i === 0 ? 'high' : 'auto'}">`;
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
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 8000);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', () => setTimeout(init, 80))
    : setTimeout(init, 80);
})();
