(() => {
  const BANNERS = [
    {
      src: '/drogaria-rocha-app/assets/banner-higiene-beleza.webp',
      alt: 'Drogaria Rocha — cuidados, higiene e beleza com ofertas especiais'
    },
    {
      src: '/drogaria-rocha-app/assets/banner-vitaminas-bem-estar.webp',
      alt: 'Drogaria Rocha — vitaminas, suplementos, energia e bem-estar'
    },
    {
      src: '/drogaria-rocha-app/assets/banner-app-facilidade.webp',
      alt: 'Drogaria Rocha — peça pelo app com retirada ou entrega'
    }
  ];

  function aplicarBanners() {
    const slides = [...document.querySelectorAll('.banner-slide')];
    if (!slides.length) return false;

    slides.slice(0, BANNERS.length).forEach((slide, index) => {
      const banner = BANNERS[index];
      if (slide.dataset.bannerArtV4 === '1') return;

      slide.dataset.bannerArtV4 = '1';
      slide.classList.add('banner-art-slide');
      slide.innerHTML = `<img class="banner-art-img" src="${banner.src}?v=4" alt="${banner.alt}" decoding="async">`;
      slide.setAttribute('aria-label', banner.alt);

      slide.addEventListener('click', () => {
        const catalogo = document.querySelector('#catalogo');
        if (catalogo) catalogo.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    return true;
  }

  function reforcarImagensInteiras() {
    document.querySelectorAll('.produto-imagem img, .detalhe-imagem img, .item-carrinho .miniatura img').forEach((img) => {
      img.style.objectFit = 'contain';
      img.style.objectPosition = 'center';
    });
  }

  function iniciar() {
    if (aplicarBanners()) reforcarImagensInteiras();

    const observer = new MutationObserver(() => {
      aplicarBanners();
      reforcarImagensInteiras();
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(iniciar, 30));
  } else {
    setTimeout(iniciar, 30);
  }
})();
