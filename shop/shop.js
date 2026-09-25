// Lilahleo — shop catalogue, product detail and booking list behaviour
(function () {
  'use strict';

  var CART_KEY = 'lilahleo_booking_cart_v1';
  var PRODUCTS_URL = 'data/products.json';

  function formatPrice(cents) {
    return 'R' + (cents / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function getCart() {
    try {
      return JSON.parse(window.localStorage.getItem(CART_KEY) || '[]');
    } catch (err) {
      return [];
    }
  }

  function saveCart(cart) {
    window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
    var badge = document.querySelector('[data-cart-count]');
    if (badge) {
      var count = cart.reduce(function (sum, item) { return sum + item.qty; }, 0);
      badge.textContent = String(count);
    }
  }

  function announce(message) {
    var live = document.querySelector('[data-status]');
    if (live) { live.textContent = message; }
  }

  function fetchProducts() {
    return fetch(PRODUCTS_URL).then(function (res) {
      if (!res.ok) { throw new Error('Unable to load products'); }
      return res.json();
    });
  }

  function addToCart(product, qty) {
    var cart = getCart();
    var existing = cart.find(function (item) { return item.id === product.id; });
    if (existing) {
      existing.qty += qty;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        image: product.image,
        category: product.category,
        qty: qty
      });
    }
    saveCart(cart);
  }

  /* ---------------- Catalogue page ---------------- */
  var catalogueGrid = document.querySelector('[data-catalogue-grid]');
  if (catalogueGrid) {
    var searchInput = document.querySelector('[data-shop-search]');
    var categorySelect = document.querySelector('[data-shop-category]');
    var sortSelect = document.querySelector('[data-shop-sort]');
    var emptyState = document.querySelector('[data-shop-empty]');
    var allProducts = [];

    function renderCatalogue() {
      var term = (searchInput.value || '').trim().toLowerCase();
      var category = categorySelect.value;
      var sort = sortSelect.value;

      var filtered = allProducts.filter(function (product) {
        var matchesTerm = !term ||
          product.name.toLowerCase().includes(term) ||
          product.description.toLowerCase().includes(term);
        var matchesCategory = category === 'all' || product.category === category;
        return matchesTerm && matchesCategory;
      });

      if (sort === 'price-asc') { filtered.sort(function (a, b) { return a.price - b.price; }); }
      if (sort === 'price-desc') { filtered.sort(function (a, b) { return b.price - a.price; }); }
      if (sort === 'name') { filtered.sort(function (a, b) { return a.name.localeCompare(b.name); }); }

      catalogueGrid.innerHTML = '';

      if (!filtered.length) {
        emptyState.hidden = false;
        return;
      }
      emptyState.hidden = true;

      filtered.forEach(function (product) {
        var card = document.createElement('article');
        card.className = 'card';
        card.innerHTML =
          '<div class="card__figure"><img src="' + product.image + '" alt="' + product.name + '" loading="lazy" width="400" height="400"></div>' +
          '<span class="pill-tag">' + product.category + '</span>' +
          (product.customisable ? ' <span class="badge-custom">Customisable</span>' : '') +
          (!product.inStock ? ' <span class="badge-out">Currently booked out</span>' : '') +
          '<h3>' + product.name + '</h3>' +
          '<p>' + product.description + '</p>' +
          '<p class="product-card__price">' + formatPrice(product.price) + ' per event</p>' +
          '<div class="product-card__meta">' +
          '<a class="btn btn--outline btn--sm" href="product.html?slug=' + product.slug + '">View details</a>' +
          '</div>';
        catalogueGrid.appendChild(card);
      });
    }

    fetchProducts().then(function (products) {
      allProducts = products;
      var presetCategory = new URLSearchParams(window.location.search).get('category');
      if (presetCategory) {
        var optionExists = Array.prototype.some.call(categorySelect.options, function (opt) {
          return opt.value === presetCategory;
        });
        if (optionExists) { categorySelect.value = presetCategory; }
      }
      renderCatalogue();
    }).catch(function () {
      catalogueGrid.innerHTML = '<p>We could not load the catalogue right now. Please refresh the page.</p>';
    });

    [searchInput, categorySelect, sortSelect].forEach(function (control) {
      control.addEventListener('input', renderCatalogue);
      control.addEventListener('change', renderCatalogue);
    });
  }

  /* ---------------- Product detail page ---------------- */
  var detailRoot = document.querySelector('[data-product-detail]');
  if (detailRoot) {
    var params = new URLSearchParams(window.location.search);
    var slug = params.get('slug');

    fetchProducts().then(function (products) {
      var product = products.find(function (p) { return p.slug === slug; });
      if (!product) {
        detailRoot.innerHTML = '<p>We could not find that item. <a href="index.html">Back to the catalogue</a>.</p>';
        return;
      }

      document.title = product.name + ' — Lilahleo Hire';

      detailRoot.innerHTML =
        '<div class="product-detail__figure"><img src="' + product.image + '" alt="' + product.name + '" width="600" height="600"></div>' +
        '<div>' +
        '<span class="pill-tag">' + product.category + '</span> ' +
        (product.customisable ? '<span class="badge-custom">Customisable</span>' : '') +
        '<h1>' + product.name + '</h1>' +
        '<p>' + product.description + '</p>' +
        '<p class="hint">Dimensions: ' + product.dimensions + '</p>' +
        '<p class="product-card__price" style="font-size:1.3rem;">' + formatPrice(product.price) + ' per event</p>' +
        (product.inStock ? '' : '<p class="badge-out">Currently booked out for the coming weeks</p>') +
        '<div class="form-field">' +
        '<label for="qty">Quantity</label>' +
        '<div class="qty-control">' +
        '<button type="button" data-qty-minus aria-label="Decrease quantity">&minus;</button>' +
        '<input type="number" id="qty" min="1" value="1" inputmode="numeric">' +
        '<button type="button" data-qty-plus aria-label="Increase quantity">+</button>' +
        '</div></div>' +
        '<button class="btn btn--primary" type="button" data-add-to-booking' + (product.inStock ? '' : ' disabled aria-disabled="true"') + '>Add to booking list</button>' +
        ' <a class="btn btn--outline" href="booking.html">View booking list</a>' +
        '<output class="status-message" aria-live="polite" data-status></output>' +
        '</div>';

      var qtyInput = detailRoot.querySelector('#qty');
      detailRoot.querySelector('[data-qty-minus]').addEventListener('click', function () {
        qtyInput.value = Math.max(1, Number.parseInt(qtyInput.value || '1', 10) - 1);
      });
      detailRoot.querySelector('[data-qty-plus]').addEventListener('click', function () {
        qtyInput.value = Number.parseInt(qtyInput.value || '1', 10) + 1;
      });

      var addBtn = detailRoot.querySelector('[data-add-to-booking]');
      if (addBtn) {
        addBtn.addEventListener('click', function () {
          var qty = Math.max(1, Number.parseInt(qtyInput.value || '1', 10));
          addToCart(product, qty);
          announce(product.name + ' added to your booking list.');
        });
      }
    }).catch(function () {
      detailRoot.innerHTML = '<p>We could not load this item right now. Please refresh the page.</p>';
    });
  }

  /* ---------------- Booking list page ---------------- */
  var bookingList = document.querySelector('[data-booking-list]');
  if (bookingList) {
    var summaryCount = document.querySelector('[data-summary-count]');
    var summarySubtotal = document.querySelector('[data-summary-subtotal]');
    var emptyBooking = document.querySelector('[data-booking-empty]');
    var bookingForm = document.querySelector('[data-booking-form]');

    function renderBooking() {
      var cart = getCart();
      bookingList.innerHTML = '';

      if (!cart.length) {
        emptyBooking.hidden = false;
        if (bookingForm) { bookingForm.hidden = true; }
      } else {
        emptyBooking.hidden = true;
        if (bookingForm) { bookingForm.hidden = false; }
      }

      var subtotal = 0;
      var count = 0;

      cart.forEach(function (item) {
        var lineTotal = item.price * item.qty;
        subtotal += lineTotal;
        count += item.qty;

        var row = document.createElement('div');
        row.className = 'booking-item';
        row.innerHTML =
          '<div class="booking-item__figure"><img src="' + item.image + '" alt="' + item.name + '" width="72" height="72"></div>' +
          '<div><h3 style="margin-bottom:0.2rem;">' + item.name + '</h3>' +
          '<p class="hint" style="margin:0;">' + formatPrice(item.price) + ' per event x ' + item.qty + ' = <strong>' + formatPrice(lineTotal) + '</strong></p></div>' +
          '<div class="booking-item__controls">' +
          '<div class="qty-control">' +
          '<button type="button" data-decrease="' + item.id + '" aria-label="Decrease quantity for ' + item.name + '">&minus;</button>' +
          '<span aria-live="off">' + item.qty + '</span>' +
          '<button type="button" data-increase="' + item.id + '" aria-label="Increase quantity for ' + item.name + '">+</button>' +
          '</div>' +
          '<button type="button" class="booking-item__remove" data-remove="' + item.id + '">Remove</button>' +
          '</div>';
        bookingList.appendChild(row);
      });

      summaryCount.textContent = String(count);
      summarySubtotal.textContent = formatPrice(subtotal);

      bookingList.querySelectorAll('[data-increase]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var cart = getCart();
          var item = cart.find(function (i) { return i.id === btn.dataset.increase; });
          if (item) { item.qty += 1; saveCart(cart); renderBooking(); }
        });
      });
      bookingList.querySelectorAll('[data-decrease]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var cart = getCart();
          var item = cart.find(function (i) { return i.id === btn.dataset.decrease; });
          if (item) {
            item.qty -= 1;
            if (item.qty <= 0) { cart = cart.filter(function (i) { return i.id !== item.id; }); }
            saveCart(cart);
            renderBooking();
          }
        });
      });
      bookingList.querySelectorAll('[data-remove]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var cart = getCart().filter(function (i) { return i.id !== btn.dataset.remove; });
          saveCart(cart);
          renderBooking();
          announce('Item removed from your booking list.');
        });
      });
    }

    var clearBtn = document.querySelector('[data-clear-booking]');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        saveCart([]);
        renderBooking();
        announce('Your booking list has been cleared.');
      });
    }

    if (bookingForm) {
      bookingForm.addEventListener('submit', function () {
        var cart = getCart();
        var summaryField = bookingForm.querySelector('[name="order_summary"]');
        if (summaryField) {
          var lines = cart.map(function (item) {
            return item.name + ' x ' + item.qty + ' (' + formatPrice(item.price * item.qty) + ')';
          });
          summaryField.value = lines.join('\n');
        }
      });
    }

    renderBooking();
  }
})();
