const siteNav = document.querySelector('.site-nav');
const siteNavToggle = document.querySelector('.site-nav-toggle');
const sectionNavLinks = Array.from(document.querySelectorAll('.site-nav-link[href^="#"]'));
const buyNowTriggers = Array.from(document.querySelectorAll('.buy-now-trigger'));
const authorBioContainer = document.querySelector('.author-copy-body');
const authorBioText = document.querySelector('.author-body');
const authorBioToggle = document.querySelector('.author-read-more-btn');

let buyModal = null;
let buyModalTitle = null;
let buyModalOptions = null;
let buyModalBack = null;
let currentBuyState = {
  bookTitle: '',
  buyOptions: [],
  eReaders: []
};

function setBuyModalOpen(isOpen) {
  if (!buyModal) {
    return;
  }

  buyModal.classList.toggle('is-open', isOpen);
  document.body.classList.toggle('modal-open', isOpen);
}

function parseBuyData(encodedData) {
  if (!encodedData) {
    return {
      buyOptions: [],
      eReaders: []
    };
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(encodedData));

    const buyOptions = Array.isArray(parsed.buyOptions)
      ? parsed.buyOptions.filter((entry) => {
          return Array.isArray(entry)
            && typeof entry[0] === 'string'
            && typeof entry[1] === 'string'
            && entry[0].trim()
            && entry[1].trim();
        })
      : [];

    const eReaders = parsed.eReaders && typeof parsed.eReaders === 'object' && !Array.isArray(parsed.eReaders)
      ? Object.entries(parsed.eReaders).filter((entry) => {
          return Array.isArray(entry)
            && typeof entry[0] === 'string'
            && typeof entry[1] === 'string'
            && entry[0].trim()
            && entry[1].trim();
        })
      : [];

    return {
      buyOptions,
      eReaders
    };
  } catch (error) {
    return {
      buyOptions: [],
      eReaders: []
    };
  }
}

function ensureBuyModal() {
  if (buyModal) {
    return;
  }

  const modal = document.createElement('div');
  modal.className = 'buy-modal';
  modal.setAttribute('aria-hidden', 'true');
  modal.innerHTML = `
    <div class="buy-modal-backdrop" data-close-buy-modal="true"></div>
    <div class="buy-modal-dialog" role="dialog" aria-modal="true" aria-label="Choose purchase format">
      <div class="buy-modal-chrome">
        <button class="buy-modal-back buy-modal-icon-button" type="button" aria-label="Back to formats" data-buy-action="show-formats">←</button>
        <button class="buy-modal-close buy-modal-icon-button" type="button" aria-label="Close buy options" data-close-buy-modal="true">x</button>
      </div>
      <h3 class="buy-modal-title">Choose format</h3>
      <div class="buy-modal-options"></div>
    </div>
  `;

  modal.addEventListener('click', (event) => {
    const closeElement = event.target.closest('[data-close-buy-modal="true"]');
    if (closeElement) {
      setBuyModalOpen(false);
      return;
    }

    const actionElement = event.target.closest('[data-buy-action]');
    if (!actionElement) {
      return;
    }

    const action = actionElement.dataset.buyAction;
    if (action === 'show-ereaders') {
      renderEReaderOptions();
      return;
    }

    if (action === 'show-formats') {
      renderBuyFormatOptions();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && buyModal?.classList.contains('is-open')) {
      setBuyModalOpen(false);
    }
  });

  document.body.appendChild(modal);
  buyModal = modal;
  buyModalTitle = buyModal.querySelector('.buy-modal-title');
  buyModalOptions = buyModal.querySelector('.buy-modal-options');
  buyModalBack = buyModal.querySelector('.buy-modal-back');
}

function setBuyModalBackVisible(isVisible) {
  if (!buyModalBack) {
    return;
  }

  buyModalBack.style.display = isVisible ? 'inline-flex' : 'none';
}

function renderBuyFormatOptions() {
  if (!buyModalOptions || !buyModalTitle) {
    return;
  }

  buyModalTitle.textContent = currentBuyState.bookTitle
    ? `Choose format for ${currentBuyState.bookTitle}`
    : 'Choose format';
  setBuyModalBackVisible(false);
  buyModalOptions.innerHTML = '';

  currentBuyState.buyOptions.forEach(([formatLabel, linkUrl]) => {
    const optionLink = document.createElement('a');
    optionLink.className = 'read-more-btn buy-option-btn';
    optionLink.href = linkUrl;
    optionLink.target = '_blank';
    optionLink.rel = 'noopener noreferrer';
    optionLink.textContent = formatLabel;
    buyModalOptions.appendChild(optionLink);
  });

  if (currentBuyState.eReaders.length > 0) {
    const eReaderButton = document.createElement('button');
    eReaderButton.className = 'read-more-btn buy-option-btn';
    eReaderButton.type = 'button';
    eReaderButton.textContent = 'E-book';
    eReaderButton.dataset.buyAction = 'show-ereaders';
    buyModalOptions.appendChild(eReaderButton);
  }
}

function renderEReaderOptions() {
  if (!buyModalOptions || !buyModalTitle) {
    return;
  }

  buyModalTitle.textContent = currentBuyState.bookTitle
    ? `Choose e-reader for ${currentBuyState.bookTitle}`
    : 'Choose e-reader';
  setBuyModalBackVisible(true);
  buyModalOptions.innerHTML = '';

  currentBuyState.eReaders.forEach(([readerLabel, linkUrl]) => {
    const optionLink = document.createElement('a');
    optionLink.className = 'read-more-btn buy-option-btn';
    optionLink.href = linkUrl;
    optionLink.target = '_blank';
    optionLink.rel = 'noopener noreferrer';
    optionLink.textContent = readerLabel;
    buyModalOptions.appendChild(optionLink);
  });
}

function openBuyModal(options, bookTitle, eReaders) {
  ensureBuyModal();
  if (!buyModalOptions || !buyModalTitle) {
    return;
  }

  currentBuyState = {
    bookTitle: bookTitle || '',
    buyOptions: options,
    eReaders: eReaders
  };

  renderBuyFormatOptions();

  setBuyModalOpen(true);
}

if (buyNowTriggers.length > 0) {
  buyNowTriggers.forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const { buyOptions, eReaders } = parseBuyData(trigger.dataset.buyData || '');
      if (buyOptions.length === 0 && eReaders.length === 0) {
        return;
      }

      openBuyModal(buyOptions, trigger.dataset.bookTitle || '', eReaders);
    });
  });
}

if (authorBioContainer && authorBioToggle) {
  authorBioContainer.classList.add('is-collapsed');

  const collapsedAuthorBioHeight = '12.2em';

  function updateAuthorBioHeight() {
    if (!authorBioText) {
      return;
    }

    authorBioText.style.maxHeight = authorBioContainer.classList.contains('is-collapsed')
      ? collapsedAuthorBioHeight
      : `${authorBioText.scrollHeight}px`;
  }

  updateAuthorBioHeight();

  window.requestAnimationFrame(() => {
    authorBioContainer.classList.add('is-ready');
  });

  authorBioToggle.addEventListener('click', () => {
    const isCollapsed = authorBioContainer.classList.toggle('is-collapsed');
    updateAuthorBioHeight();
    authorBioToggle.textContent = isCollapsed ? 'Read more' : 'Show less';
    authorBioToggle.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
  });

  window.addEventListener('resize', () => {
    if (!authorBioContainer.classList.contains('is-collapsed')) {
      updateAuthorBioHeight();
    }
  });
}

function setMobileMenuOpen(isOpen) {
  if (!siteNav) {
    return;
  }

  siteNav.classList.toggle('is-open', isOpen);
  siteNavToggle?.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
}

if (siteNavToggle) {
  siteNavToggle.addEventListener('click', () => {
    const willOpen = !siteNav?.classList.contains('is-open');
    setMobileMenuOpen(Boolean(willOpen));
  });
}

function scrollToSectionCenter(targetId, behavior = 'smooth') {
  const targetSection = document.querySelector(targetId);
  if (!targetSection) {
    return;
  }

  const navHeight = document.querySelector('.site-nav')?.offsetHeight || 0;
  const targetRect = targetSection.getBoundingClientRect();
  const sectionTop = window.scrollY + targetRect.top;
  const sectionCenter = sectionTop + (targetRect.height / 2);
  const visibleCenter = navHeight + ((window.innerHeight - navHeight) / 2);
  const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0);
  const targetScrollTop = Math.min(Math.max(sectionCenter - visibleCenter, 0), maxScroll);

  window.scrollTo({
    top: targetScrollTop,
    behavior
  });
}

if (sectionNavLinks.length > 0) {
  sectionNavLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      const targetId = link.getAttribute('href');
      if (!targetId || targetId === '#') {
        return;
      }

      event.preventDefault();
      scrollToSectionCenter(targetId);
      window.history.replaceState(null, '', targetId);
      setMobileMenuOpen(false);
    });
  });
}

window.addEventListener('resize', () => {
  if (window.innerWidth > 1000) {
    setMobileMenuOpen(false);
  }
});

function initializeCarousel(carouselRoot) {
  const carouselTrack = carouselRoot.querySelector('.carousel-track');
  const carouselPrev = carouselRoot.querySelector('.carousel-btn-prev');
  const carouselNext = carouselRoot.querySelector('.carousel-btn-next');
  const carouselDots = carouselRoot.querySelector('.carousel-dots');
  const slides = carouselTrack ? Array.from(carouselTrack.querySelectorAll('.book-section')) : [];

  if (!carouselTrack || slides.length === 0) {
    return;
  }

  const dotButtons = [];
  let activeSlideIndex = 0;
  let isProgrammaticCarouselScroll = false;
  let carouselProgrammaticReleaseId;
  let pendingCarouselIndex = null;
  let pendingCarouselOffsetLeft = 0;

  function setActiveSlide(index) {
    activeSlideIndex = index;
    slides.forEach((slide, slideIndex) => {
      slide.classList.toggle('in-view', slideIndex === activeSlideIndex);
    });

    dotButtons.forEach((dot, dotIndex) => {
      const isActive = dotIndex === activeSlideIndex;
      dot.classList.toggle('is-active', isActive);
      dot.setAttribute('aria-current', isActive ? 'true' : 'false');
    });
  }

  function getNearestCarouselSlideIndex() {
    const currentScroll = carouselTrack.scrollLeft;
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    slides.forEach((slide, slideIndex) => {
      const distance = Math.abs(slide.offsetLeft - currentScroll);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = slideIndex;
      }
    });

    return nearestIndex;
  }

  function syncActiveCarouselSlideToScrollPosition() {
    setActiveSlide(getNearestCarouselSlideIndex());
  }

  function releaseProgrammaticCarouselScroll(usePendingIndex = false) {
    isProgrammaticCarouselScroll = false;
    window.clearTimeout(carouselProgrammaticReleaseId);

    if (usePendingIndex && Number.isInteger(pendingCarouselIndex)) {
      setActiveSlide(pendingCarouselIndex);
    } else {
      syncActiveCarouselSlideToScrollPosition();
    }

    pendingCarouselIndex = null;
    pendingCarouselOffsetLeft = 0;
  }

  function markCarouselProgrammaticScroll(targetIndex, targetOffsetLeft) {
    isProgrammaticCarouselScroll = true;
    pendingCarouselIndex = targetIndex;
    pendingCarouselOffsetLeft = targetOffsetLeft;
    window.clearTimeout(carouselProgrammaticReleaseId);
    // Fallback for browsers that do not fire scrollend reliably.
    carouselProgrammaticReleaseId = window.setTimeout(() => {
      releaseProgrammaticCarouselScroll(true);
    }, 700);
  }

  function goToSlide(index, behavior = 'smooth') {
    const wrappedIndex = (index + slides.length) % slides.length;
    const isWrapJump = index !== wrappedIndex;
    const scrollBehavior = isWrapJump ? 'auto' : behavior;
    const targetSlide = slides[wrappedIndex];
    markCarouselProgrammaticScroll(wrappedIndex, targetSlide.offsetLeft);
    carouselTrack.scrollTo({
      left: targetSlide.offsetLeft,
      behavior: scrollBehavior
    });
    setActiveSlide(wrappedIndex);
  }

  function getInitialSlideIndex() {
    const requestedSlug = new URLSearchParams(window.location.search).get('novel') || carouselRoot.dataset?.startSlug || '';

    if (requestedSlug) {
      const matchedIndex = slides.findIndex((slide) => slide.dataset.bookSlug === requestedSlug);
      if (matchedIndex >= 0) {
        return matchedIndex;
      }
    }

    const startIndexRaw = carouselRoot.dataset?.startIndex;
    const parsedIndex = Number.parseInt(startIndexRaw || '', 10);

    if (!Number.isFinite(parsedIndex)) {
      return 0;
    }

    return Math.min(Math.max(parsedIndex, 0), slides.length - 1);
  }

  if (carouselDots) {
    slides.forEach((_, slideIndex) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'carousel-dot';
      dot.setAttribute('aria-label', `Go to novel ${slideIndex + 1}`);
      dot.addEventListener('click', () => {
        goToSlide(slideIndex);
      });
      carouselDots.appendChild(dot);
      dotButtons.push(dot);
    });
  }

  const initialSlideIndex = getInitialSlideIndex();
  goToSlide(initialSlideIndex, 'auto');

  carouselPrev?.addEventListener('click', () => {
    goToSlide(activeSlideIndex - 1);
  });

  carouselNext?.addEventListener('click', () => {
    goToSlide(activeSlideIndex + 1);
  });

  let scrollDebounceId;
  carouselTrack.addEventListener('scroll', () => {
    if (isProgrammaticCarouselScroll) {
      const hasReachedTarget = Math.abs(carouselTrack.scrollLeft - pendingCarouselOffsetLeft) <= 2;
      if (hasReachedTarget) {
        releaseProgrammaticCarouselScroll(true);
      }
      return;
    }

    window.clearTimeout(scrollDebounceId);
    scrollDebounceId = window.setTimeout(() => {
      syncActiveCarouselSlideToScrollPosition();
    }, 120);
  });

  carouselTrack.addEventListener('scrollend', () => {
    if (isProgrammaticCarouselScroll) {
      releaseProgrammaticCarouselScroll(true);
      return;
    }

    syncActiveCarouselSlideToScrollPosition();
  });

  let resizeDebounceId;
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeDebounceId);
    resizeDebounceId = window.setTimeout(() => {
      goToSlide(activeSlideIndex, 'auto');
    }, 140);
  });
}

const carouselRoots = Array.from(document.querySelectorAll('.novels-carousel'));
carouselRoots.forEach((carouselRoot) => {
  initializeCarousel(carouselRoot);
});

  const swagGallery = document.querySelector('.swag-gallery');
  const swagPrev = document.querySelector('.swag-btn-prev');
  const swagNext = document.querySelector('.swag-btn-next');
  const swagItems = swagGallery ? Array.from(swagGallery.querySelectorAll('.swag-card')) : [];
  const mobileSwagQuery = window.matchMedia('(max-width: 1000px)');

  let activeSwagIndex = 0;
  let swagAutoplayId;

  function setActiveSwagIndex(index) {
    if (!swagGallery || swagItems.length === 0) {
      return;
    }

    activeSwagIndex = (index + swagItems.length) % swagItems.length;

    swagItems.forEach((item, itemIndex) => {
      item.classList.toggle('is-active', itemIndex === activeSwagIndex);
    });
  }

  function goToSwag(index, behavior = 'smooth') {
    if (!swagGallery || swagItems.length === 0) {
      return;
    }

    setActiveSwagIndex(index);

    if (mobileSwagQuery.matches) {
      return;
    }

    const targetItem = swagItems[activeSwagIndex];
    swagGallery.scrollTo({
      left: targetItem.offsetLeft,
      behavior
    });
  }

  function stopSwagAutoplay() {
    window.clearInterval(swagAutoplayId);
    swagAutoplayId = undefined;
  }

  function startSwagAutoplay() {
    stopSwagAutoplay();

    if (!mobileSwagQuery.matches || swagItems.length < 2) {
      return;
    }

    swagAutoplayId = window.setInterval(() => {
      goToSwag(activeSwagIndex + 1, 'auto');
    }, 4000);
  }

  function syncSwagMode() {
    if (!swagGallery || swagItems.length === 0) {
      return;
    }

    swagGallery.classList.toggle('is-fade-mode', mobileSwagQuery.matches);
    goToSwag(activeSwagIndex, 'auto');
    startSwagAutoplay();
  }

  if (swagGallery && swagItems.length > 0) {
    goToSwag(0, 'auto');

    swagPrev?.addEventListener('click', () => {
      goToSwag(activeSwagIndex - 1);
    });

    swagNext?.addEventListener('click', () => {
      goToSwag(activeSwagIndex + 1);
    });

    let swagScrollDebounceId;
    swagGallery.addEventListener('scroll', () => {
      if (mobileSwagQuery.matches) {
        return;
      }

      window.clearTimeout(swagScrollDebounceId);
      swagScrollDebounceId = window.setTimeout(() => {
        const currentScroll = swagGallery.scrollLeft;
        let nearestIndex = 0;
        let nearestDistance = Number.POSITIVE_INFINITY;

        swagItems.forEach((item, itemIndex) => {
          const distance = Math.abs(item.offsetLeft - currentScroll);
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestIndex = itemIndex;
          }
        });

        setActiveSwagIndex(nearestIndex);
      }, 100);
    });

    window.addEventListener('resize', () => {
      syncSwagMode();
    });

    mobileSwagQuery.addEventListener('change', syncSwagMode);
    syncSwagMode();
  }
