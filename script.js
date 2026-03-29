const carouselTrack = document.querySelector('.carousel-track');
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

function goToSlide(index) {
  if (!carouselTrack || slides.length === 0) {
    return;
  }

  const wrappedIndex = (index + slides.length) % slides.length;
  const targetSlide = slides[wrappedIndex];
  carouselTrack.scrollTo({
    left: targetSlide.offsetLeft,
    behavior: 'smooth'
  });
  setActiveSlide(wrappedIndex);
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

  setActiveSlide(0);

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
