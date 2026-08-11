(() => {
  const banners = [
    { src: '/drogaria-rocha-app/assets/banner-aprovado-higiene.webp?v=7', alt: 'Drogaria Rocha — ofertas de higiene e beleza' },
    { src: '/drogaria-rocha-app/assets/banner-aprovado-vitaminas.webp?v=7', alt: 'Drogaria Rocha — vitaminas para o seu dia' },
    { src: '/drogaria-rocha-app/assets/banner-aprovado-app.webp?v=7', alt: 'Drogaria Rocha — peça pelo app e receba com facilidade' }
  ];

  function aplicar() {
    const slides = Array.from(document.querySelectorAll('.banner-slide'));
    if (slides.length < 3) return false;
    slides.slice(0, 3).forEach((slide, i) => {
      slide.classList.remove('banner-native-v5', 'banner-art-slide');
      slide.classList.add('banner-real-v6');
      const img = new Image();
      img.className = 'banner-real-v6-img';
      img.alt = banners[i].alt;
      img.decoding = 'async';
      img.src = banners[i].src;
      slide.replaceChildren(img);
      slide.setAttribute('aria-label', banners[i].alt);
      slide.onclick = () => document.querySelector('#catalogo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return true;
  }

  const tentar = () => {
    if (aplicar()) return;
    setTimeout(tentar, 150);
  };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', tentar) : tentar();
})();
