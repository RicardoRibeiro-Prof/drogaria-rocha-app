(() => {
  const LOGO = '/drogaria-rocha-app/assets/logo-rocha-oficial.webp';

  const SLIDES = [
    {
      badge: 'CUIDADO DIÁRIO',
      title: 'Ofertas de <em>higiene e beleza</em>',
      subtitle: 'Produtos para sua rotina com praticidade e economia.',
      offer: true,
      cta: 'Aproveitar',
      orangeCta: false,
      products: [
        { src: 'https://farmaconde.vtexassets.com/arquivos/ids/209311/WhatsApp-Image-2024-02-23-at-15.52.07.jpg?v=638443111590630000', alt: 'Loção hidratante' },
        { src: 'https://inspire360.vteximg.com.br/arquivos/ids/156897-1000-1000/7891142982995-%E2%94%90%C2%A2HIDRATANTE%20CORPORAL%20EPIDRAT%20CORPO%20INTENSIVO%20-%20500G.jpg?v=639039273359600000', alt: 'Hidratante corporal' },
        { src: 'https://cdn.awsli.com.br/600x1000/764/764220/produto/134307330/626f391567.jpg', alt: 'Sabonete líquido facial' }
      ]
    },
    {
      badge: 'VITAMINA C E CUIDADO',
      title: '<em>Vitamina C</em> para a sua rotina',
      subtitle: 'Antioxidantes e dermocosméticos para cuidar da pele todos os dias.',
      cta: 'Ver cuidados',
      orangeCta: true,
      note: 'Dermocosméticos selecionados',
      products: [
        { src: 'https://drogariasp.vteximg.com.br/arquivos/ids/1179831-1000-1000/_0000_663247---serum-anti-idade-ivy-c-uv-30ml-hypermarcas-%283%29.png.png?v=638671218600770000', alt: 'Sérum Ivy C UV' },
        { src: 'https://drogal.vtexassets.com/arquivos/ids/214486/93486.jpg?v=638478324248300000', alt: 'Sérum antioxidante Ivy C' },
        { src: 'https://images.tcdn.com.br/img/img_prod/1037107/ivy_c_sabonete_liquido_200ml_mantecorp_112757595_1_300d9e6b7c4883785938968461458a03.jpg', alt: 'Sabonete líquido Ivy C' }
      ]
    },
    {
      badge: 'PRATICIDADE',
      title: '<em>Peça pelo app</em><br>e receba com facilidade',
      subtitle: 'Entrega rápida ou retirada na loja, do jeito que for melhor para você.',
      cta: 'Comprar agora',
      orangeCta: true,
      benefits: ['Entrega rápida', 'Retirada fácil', 'Compra segura'],
      products: [
        { src: 'https://www.ihypera.com.br/_next/image?q=75&url=https%3A%2F%2Fihypera2022.vtexassets.com%2Farquivos%2Fids%2F167114%2F7891142982957_1.jpg%3Fv%3D638368595065070000&w=1280', alt: 'Protetor solar hidratante' },
        { src: 'https://d16w7cuzwgzfcy.cloudfront.net/Custom/Content/Products/19/67/196725_protetor-solar-episol-sec-acqua-cor-claro-fps60-40ml-p567647_l2_639008632171176737.webp', alt: 'Protetor solar Episol' },
        { src: 'https://maxxieconomica.com/storage/photos/1/Products/ean/7896013544517.jpg', alt: 'Coloração Maxton' }
      ]
    }
  ];

  function brand() {
    return `<div class="banner-native-brand"><img src="${LOGO}" alt=""><span><small>DROGARIA</small><strong>ROCHA</strong></span></div>`;
  }

  function productMarkup(products) {
    return products.map((product, index) => `
      <div class="banner-native-product ${index === 0 ? 'main' : ''}">
        <img src="${product.src}" alt="${product.alt}" referrerpolicy="no-referrer" ${index === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}>
      </div>`).join('');
  }

  function slideMarkup(slide) {
    const offer = slide.offer ? `<div class="banner-native-offer"><span>ATÉ</span><strong>30%</strong><small>OFF</small></div>` : '';
    const note = slide.note ? `<div class="banner-native-note"><b>✓</b><span>${slide.note}</span></div>` : '';
    const benefits = slide.benefits ? `<div class="banner-native-benefits">${slide.benefits.map((benefit, index) => `<span><i>${index === 0 ? '↗' : index === 1 ? '▢' : '✓'}</i>${benefit}</span>`).join('')}</div>` : '';

    return `<div class="banner-native">
      <div class="banner-native-copy">
        ${brand()}
        <span class="banner-native-badge">${slide.badge}</span>
        <h2>${slide.title}</h2>
        <p>${slide.subtitle}</p>
        ${offer}
        <button type="button" class="banner-native-cta ${slide.orangeCta ? 'orange' : ''}" data-native-banner-cta>${slide.cta}<span>→</span></button>
        ${note}
        ${benefits}
      </div>
      <div class="banner-native-products">
        <span class="banner-native-decoration" aria-hidden="true"></span>
        ${productMarkup(slide.products)}
      </div>
    </div>`;
  }

  function aplicarBanners() {
    const slides = [...document.querySelectorAll('.banner-slide')];
    if (!slides.length) return false;

    slides.slice(0, SLIDES.length).forEach((element, index) => {
      if (element.dataset.bannerNativeV5 === '1') return;
      element.dataset.bannerNativeV5 = '1';
      element.classList.remove('banner-art-slide');
      element.classList.add('banner-native-slide');
      element.innerHTML = slideMarkup(SLIDES[index]);
      element.querySelector('[data-native-banner-cta]')?.addEventListener('click', (event) => {
        event.stopPropagation();
        document.querySelector('#catalogo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    return true;
  }

  function garantirImagensInteiras() {
    document.querySelectorAll('.produto-imagem img, .detalhe-imagem img, .item-carrinho .miniatura img').forEach((img) => {
      img.style.objectFit = 'contain';
      img.style.objectPosition = 'center';
    });
  }

  function iniciar() {
    aplicarBanners();
    garantirImagensInteiras();

    const observer = new MutationObserver(() => {
      aplicarBanners();
      garantirImagensInteiras();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(iniciar, 30));
  else setTimeout(iniciar, 30);
})();
