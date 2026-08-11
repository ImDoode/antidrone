const header = document.querySelector('.site-header');

const updateHeaderState = () => {
  if (!header) return;
  header.classList.toggle('site-header--scrolled', window.scrollY > 16);
};

updateHeaderState();
window.addEventListener('scroll', updateHeaderState, { passive: true });

const revealNodes = document.querySelectorAll(
  '.section-head, .feature-card, .industries-grid__item, .project-gallery__item, .timeline__item, .cta-panel__content, .cta-panel__form'
);

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries, targetObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        targetObserver.unobserve(entry.target);
      });
    },
    {
      threshold: 0.16,
      rootMargin: '0px 0px -6% 0px',
    }
  );

  revealNodes.forEach((node, index) => {
    node.classList.add('is-reveal');
    node.style.transitionDelay = `${Math.min(index * 25, 220)}ms`;
    observer.observe(node);
  });
} else {
  revealNodes.forEach((node) => node.classList.add('is-visible'));
}

if (typeof GLightbox === 'function') {
  GLightbox({
    selector: '.project-gallery__link',
    loop: true,
    touchNavigation: true,
    closeButton: true,
  });
}
