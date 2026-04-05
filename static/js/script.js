const carouselTrack = document.querySelector('.carousel-track');
const carouselRoot = document.querySelector('.novels-carousel');
const carouselPrev = document.querySelector('.carousel-btn-prev');
const carouselNext = document.querySelector('.carousel-btn-next');
const carouselDots = document.querySelector('.carousel-dots');
const slides = carouselTrack ? Array.from(carouselTrack.querySelectorAll('.book-section')) : [];
const dotButtons = [];

let activeSlideIndex = 0;

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
  const targetSlide = slides[wrappedIndex];
  carouselTrack.scrollTo({
    left: targetSlide.offsetLeft,
    behavior
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
    window.clearTimeout(scrollDebounceId);
    scrollDebounceId = window.setTimeout(() => {
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

      setActiveSlide(nearestIndex);
    }, 120);
  });

  window.addEventListener('resize', () => {
    goToSlide(activeSlideIndex);
  });
}

  const swagGallery = document.querySelector('.swag-gallery');
  const swagPrev = document.querySelector('.swag-btn-prev');
  const swagNext = document.querySelector('.swag-btn-next');
  const swagItems = swagGallery ? Array.from(swagGallery.querySelectorAll('.swag-card')) : [];

  let activeSwagIndex = 0;

  function setActiveSwagIndex(index) {
    if (!swagGallery || swagItems.length === 0) {
      return;
    }

    activeSwagIndex = (index + swagItems.length) % swagItems.length;
  }

  function goToSwag(index, behavior = 'smooth') {
    if (!swagGallery || swagItems.length === 0) {
      return;
    }

    setActiveSwagIndex(index);
    const targetItem = swagItems[activeSwagIndex];
    swagGallery.scrollTo({
      left: targetItem.offsetLeft,
      behavior
    });
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
      goToSwag(activeSwagIndex, 'auto');
    });
  }
