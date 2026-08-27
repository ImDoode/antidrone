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

const contactForm = document.querySelector('.contact-form');

if (contactForm) {
  const submitButton = contactForm.querySelector('.contact-form__submit');
  const statusMessage = contactForm.querySelector('.contact-form__status');
  const formFields = Array.from(contactForm.querySelectorAll('input, textarea'));
  const captchaWidget = document.querySelector('.smart-captcha');

  let isSubmitting = false;
  let captchaValid = !captchaWidget;

  const updateCaptchaState = () => {
    if (!captchaWidget) {
      captchaValid = true;
      return;
    }

    const widgetState = captchaWidget.getAttribute('data-captcha-state')
      || captchaWidget.getAttribute('data-state')
      || captchaWidget.dataset.state
      || '';

    const widgetToken = captchaWidget.getAttribute('data-token')
      || captchaWidget.dataset.token
      || captchaWidget.getAttribute('data-captcha-token')
      || '';

    captchaValid = widgetState === 'valid' || Boolean(widgetToken);
  };

  const updateSubmitState = () => {
    if (!submitButton) return;

    const shouldDisable = isSubmitting || !captchaValid;
    submitButton.disabled = shouldDisable;
    submitButton.setAttribute('aria-disabled', String(shouldDisable));
  };

  const setStatus = (message, type = '') => {
    if (!statusMessage) return;

    statusMessage.textContent = message || '';
    statusMessage.classList.remove('is-success', 'is-error');
    statusMessage.hidden = !message;

    if (type) {
      statusMessage.classList.add(type === 'success' ? 'is-success' : 'is-error');
    }
  };

  const setSubmittingState = (submitting) => {
    isSubmitting = submitting;
    contactForm.setAttribute('aria-busy', String(submitting));
    updateSubmitState();
    submitButton.textContent = submitting ? 'Отправка...' : 'Отправить запрос';

    formFields.forEach((field) => {
      field.disabled = submitting;
    });
  };

  const createRequestId = () => {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }

    return `req_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  };

  const getSmartCaptchaToken = () => {
    if (!captchaWidget) {
      return '';
    }

    return (
      captchaWidget.getAttribute('data-token') ||
      captchaWidget.dataset.token ||
      captchaWidget.getAttribute('data-captcha-token') ||
      captchaWidget.getAttribute('data-smartcaptcha-token') ||
      ''
    );
  };

  const getPayload = () => {
    const payload = {
      requestId: createRequestId(),
      name: '',
      phone: '',
      email: '',
      description: '',
      captchaToken: getSmartCaptchaToken(),
    };

    formFields.forEach((field) => {
      const key = field.name;

      if (!key) return;

      payload[key] = String(field.value || '').trim();
    });

    return payload;
  };

  updateCaptchaState();
  updateSubmitState();

  if (captchaWidget) {
    const captchaObserver = new MutationObserver(() => {
      updateCaptchaState();
      updateSubmitState();
    });

    captchaObserver.observe(captchaWidget, {
      attributes: true,
      childList: true,
      subtree: true,
    });

    const onCaptchaSuccess = () => {
      updateCaptchaState();
      updateSubmitState();
    };

    window.addEventListener('smartcaptcha:success', onCaptchaSuccess);
    window.addEventListener('smartcaptcha:reset', onCaptchaSuccess);
    window.addEventListener('smartcaptcha:fail', () => {
      captchaValid = false;
      updateSubmitState();
    });
  }

  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    updateCaptchaState();

    if (!captchaValid) {
      setStatus('Подтвердите, что вы не робот', 'error');
      return;
    }

    const payload = getPayload();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!payload.name || !payload.phone || !payload.email || !payload.description) {
      setStatus('Заполните все поля', 'error');
      return;
    }

    if (!emailRegex.test(payload.email)) {
      setStatus('Некорректный email', 'error');
      return;
    }

    setStatus('', '');
    setSubmittingState(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'X-Request-Id': payload.requestId,
        },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      });

      let result = {};

      try {
        result = await response.json();
      } catch (error) {
        result = {};
      }

      if (!response.ok || result.success === false) {
        const message = result.message || 'Не удалось отправить заявку';
        throw new Error(message);
      }

      setStatus(result.message || 'Заявка успешно отправлена', 'success');
      contactForm.reset();
    } catch (error) {
      setStatus(error.message || 'Не удалось отправить заявку', 'error');
    } finally {
      setSubmittingState(false);
    }
  });

  formFields.forEach((field) => {
    field.addEventListener('input', () => {
      if (statusMessage && !statusMessage.hidden) {
        setStatus('', '');
      }
    });
  });
}
