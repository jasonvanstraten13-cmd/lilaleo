// Lilaleo — shared site behaviour (nav, header shrink, reveal animation)
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
  var CART_KEY = 'lilaleo_booking_cart_v1';
  var badge = document.querySelector('[data-cart-count]');
  if (badge) {
    var raw = window.localStorage.getItem(CART_KEY);
    var items = raw ? JSON.parse(raw) : [];
    var count = items.reduce(function (sum, item) { return sum + (item.qty || 0); }, 0);
    badge.textContent = String(count);
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
