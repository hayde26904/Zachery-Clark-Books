const carouselTrack = document.querySelector('.carousel-track');
const siteNav = document.querySelector('.site-nav');
const siteNavToggle = document.querySelector('.site-nav-toggle');
const carouselRoot = document.querySelector('.novels-carousel');
const carouselPrev = document.querySelector('.carousel-btn-prev');
const carouselNext = document.querySelector('.carousel-btn-next');
const carouselDots = document.querySelector('.carousel-dots');
const slides = carouselTrack ? Array.from(carouselTrack.querySelectorAll('.book-section')) : [];
const dotButtons = [];
const sectionNavLinks = Array.from(document.querySelectorAll('.site-nav-link[href^="#"]'));
const buyNowTriggers = Array.from(document.querySelectorAll('.buy-now-trigger'));

let buyModal = null;
let buyModalTitle = null;
let buyModalOptions = null;

function setBuyModalOpen(isOpen) {
  if (!buyModal) {
    return;
  }

  buyModal.classList.toggle('is-open', isOpen);
  document.body.classList.toggle('modal-open', isOpen);
}

function parseBuyOptions(encodedOptions) {
  if (!encodedOptions) {
    return [];
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(encodedOptions));
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((entry) => {
      return Array.isArray(entry)
        && typeof entry[0] === 'string'
        && typeof entry[1] === 'string'
        && entry[0].trim()
        && entry[1].trim();
    });
  } catch (error) {
    return [];
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
      <button class="buy-modal-close" type="button" aria-label="Close buy options" data-close-buy-modal="true">x</button>
      <h3 class="buy-modal-title">Choose format</h3>
      <div class="buy-modal-options"></div>
    </div>
  `;

  modal.addEventListener('click', (event) => {
    const closeElement = event.target.closest('[data-close-buy-modal="true"]');
    if (closeElement) {
      setBuyModalOpen(false);
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
}

function openBuyModal(options, bookTitle) {
  ensureBuyModal();
  if (!buyModalOptions || !buyModalTitle) {
    return;
  }

  buyModalTitle.textContent = 'Choose format';
  buyModalOptions.innerHTML = '';

  options.forEach(([formatLabel, linkUrl]) => {
    const optionLink = document.createElement('a');
    optionLink.className = 'read-more-btn buy-option-btn';
    optionLink.href = linkUrl;
    optionLink.target = '_blank';
    optionLink.rel = 'noopener noreferrer';
    optionLink.textContent = formatLabel;
    buyModalOptions.appendChild(optionLink);
  });

  setBuyModalOpen(true);
}

if (buyNowTriggers.length > 0) {
  buyNowTriggers.forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const options = parseBuyOptions(trigger.dataset.buyOptions || '');
      if (options.length === 0) {
        return;
      }

      openBuyModal(options, trigger.dataset.bookTitle || '');
    });
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

let activeSlideIndex = 0;
let isProgrammaticCarouselScroll = false;
let carouselProgrammaticReleaseId;
let pendingCarouselIndex = null;
let pendingCarouselOffsetLeft = 0;

function getNearestCarouselSlideIndex() {
  if (!carouselTrack || slides.length === 0) {
    return 0;
  }

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

function goToSlide(index, behavior = 'smooth') {
  if (!carouselTrack || slides.length === 0) {
    return;
  }

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
  const startIndexRaw = carouselRoot?.dataset?.startIndex;
  const parsedIndex = Number.parseInt(startIndexRaw || '', 10);

  if (!Number.isFinite(parsedIndex) || slides.length === 0) {
    return 0;
  }

  return Math.min(Math.max(parsedIndex, 0), slides.length - 1);
}

if (carouselTrack && slides.length > 0) {
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
