// Lilahleo — shared site behaviour (nav, header shrink, reveal animation)
(function () {
  'use strict';

  // Reserve logo dimensions before the image loads to prevent header jump.
  document.querySelectorAll('img.brand-logo').forEach(function (logo) {
    logo.width = 200;
    logo.height = 74;
    logo.style.width = '200px';
    logo.style.height = '74px';
    logo.style.objectFit = 'contain';
  });

  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var isOpen = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 24);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Keep the header booking-list badge in sync on every page.
  var CART_KEY = 'lilahleo_booking_cart_v1';
  var badge = document.querySelector('[data-cart-count]');
  if (badge) {
    var raw = window.localStorage.getItem(CART_KEY);
    var items = raw ? JSON.parse(raw) : [];
    var count = items.reduce(function (sum, item) { return sum + (item.qty || 0); }, 0);
    badge.textContent = String(count);
  }

  // Shared form submission: checks required fields, posts JSON to a site function, shows errors inline.
  window.LilahleoForms = {
    submit: function (form, url, payload, onSuccess) {
      var errorBox = form.querySelector('[data-form-error]');
      var button = form.querySelector('button[type="submit"]');
      function showError(message) {
        errorBox.textContent = message;
        errorBox.hidden = !message;
      }
      var firstInvalid = null;
      form.querySelectorAll('[required]').forEach(function (field) {
        var value = field.value.trim();
        var ok = value !== '' && (field.type !== 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
        field.setAttribute('aria-invalid', String(!ok));
        if (!ok && !firstInvalid) { firstInvalid = field; }
      });
      if (firstInvalid) {
        showError('Please check the highlighted fields.');
        firstInvalid.focus();
        return;
      }
      showError('');
      var label = button.textContent;
      button.disabled = true;
      button.textContent = 'Sending...';
      fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        .then(function (response) {
          return response.json().catch(function () { return {}; }).then(function (body) {
            if (!response.ok) { throw new Error(body.error || 'Something went wrong. Please try again.'); }
            return body;
          });
        })
        .then(onSuccess)
        .catch(function (error) {
          showError(error.message);
          button.disabled = false;
          button.textContent = label;
        });
    }
  };

  var contactForm = document.querySelector('[data-contact-form]');
  if (contactForm) {
    contactForm.addEventListener('submit', function (event) {
      event.preventDefault();
      var fields = contactForm.elements;
      window.LilahleoForms.submit(contactForm, '/api/contact', {
        name: fields.name.value,
        email: fields.email.value,
        phone: fields.phone.value,
        eventType: fields.event_type.value,
        eventDate: fields.event_date.value,
        decorInterest: fields.decor_interest.checked,
        message: fields.message.value,
        company: fields.company.value
      }, function () {
        window.location.href = 'thank-you.html';
      });
    });
  }

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var reveals = document.querySelectorAll('.reveal');
  if (reveals.length) {
    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      reveals.forEach(function (el) { el.classList.add('is-visible'); });
    } else {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15 });
      reveals.forEach(function (el) { observer.observe(el); });
    }
  }
})();
