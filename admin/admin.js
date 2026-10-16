// Bookings admin: approve an enquiry with a deposit (emails the customer a pay link) or decline it.
(function () {
  'use strict';

  var KEY = 'lilahleo_admin_password';
  var loginForm = document.querySelector('[data-login]');
  var dashboard = document.querySelector('[data-dashboard]');
  var list = document.querySelector('[data-bookings]');
  var status = document.querySelector('[data-admin-status]');
  var logout = document.querySelector('[data-logout]');
  var bookings = [];
  var filter = 'action';

  var STATUS_LABELS = { enquiry: 'New enquiry', approved: 'Awaiting deposit', declined: 'Declined', deposit_paid: 'Deposit paid' };

  function password() {
    try { return sessionStorage.getItem(KEY) || ''; } catch (err) { return ''; }
  }
  function rand(cents) {
    return 'R' + (cents / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function api(method, body) {
    return fetch('/api/admin/bookings', {
      method: method,
      headers: { Authorization: 'Bearer ' + password(), 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (data) {
        if (response.status === 401) { signOut(); }
        if (!response.ok) { throw new Error(data.error || 'Something went wrong.'); }
        return data;
      });
    });
  }

  function signOut() {
    try { sessionStorage.removeItem(KEY); } catch (err) { /* ignore */ }
    dashboard.hidden = true;
    logout.hidden = true;
    loginForm.hidden = false;
  }

  function visible(booking) {
    if (filter === 'all') { return true; }
    if (filter === 'action') { return booking.status === 'enquiry'; }
    return booking.status === filter;
  }

  function card(booking) {
    var items = booking.items.map(function (item) {
      return '<li>' + escapeHtml(item.name) + ' &times; ' + item.quantity + ' — ' + rand(item.lineTotal) + '</li>';
    }).join('');
    var canAct = booking.status !== 'deposit_paid';
    var deposit = booking.depositAmount || booking.suggestedDeposit;
    return '<article class="admin-booking" data-ref="' + escapeHtml(booking.ref) + '">' +
      '<header><h2>' + escapeHtml(booking.event.type) + ' · ' + escapeHtml(booking.event.date) + '</h2>' +
      '<span class="admin-pill admin-pill--' + escapeHtml(booking.status) + '">' + (STATUS_LABELS[booking.status] || escapeHtml(booking.status)) + '</span></header>' +
      '<p class="hint">' + escapeHtml(booking.ref) + ' · received ' + new Date(booking.createdAt).toLocaleString('en-ZA') + '</p>' +
      '<p><strong>' + escapeHtml(booking.customer.name) + '</strong><br>' +
      '<a href="mailto:' + escapeHtml(booking.customer.email) + '">' + escapeHtml(booking.customer.email) + '</a> · ' +
      '<a href="tel:' + escapeHtml(booking.customer.phone) + '">' + escapeHtml(booking.customer.phone) + '</a></p>' +
      (booking.event.venue ? '<p>Venue: ' + escapeHtml(booking.event.venue) + '</p>' : '') +
      (booking.event.decorInterest ? '<p>Interested in full decor &amp; styling</p>' : '') +
      '<ul>' + items + '</ul>' +
      '<p><strong>Hire subtotal: ' + rand(booking.subtotal) + '</strong></p>' +
      (booking.notes ? '<p class="admin-notes">' + escapeHtml(booking.notes) + '</p>' : '') +
      (booking.payment ? '<p><strong>Deposit of ' + rand(booking.payment.amount) + ' paid ' + new Date(booking.payment.paidAt).toLocaleString('en-ZA') + '</strong></p>' : '') +
      (booking.status === 'approved' ? '<p>Deposit link for ' + rand(booking.depositAmount) + ' sent ' + new Date(booking.approvedAt).toLocaleString('en-ZA') + '.</p>' : '') +
      (canAct ?
        '<div class="admin-actions">' +
        '<div class="form-field"><label>Deposit amount (R)</label><input type="number" min="1" step="0.01" data-deposit value="' + (deposit / 100).toFixed(2) + '"></div>' +
        '<div class="form-field"><label>Message to customer (optional)</label><textarea rows="2" data-message placeholder="e.g. Delivery and setup to Stellenbosch is R450, payable with the balance."></textarea></div>' +
        '<button type="button" class="btn btn--primary btn--sm" data-approve>' + (booking.status === 'approved' ? 'Resend deposit link' : 'Approve & send deposit link') + '</button> ' +
        (booking.status !== 'declined' ? '<button type="button" class="btn btn--outline btn--sm" data-decline>Decline</button>' : '') +
        '</div>' : '') +
      '</article>';
  }

  function render() {
    var shown = bookings.filter(visible);
    list.innerHTML = shown.length ? shown.map(card).join('') : '<p>No bookings here yet.</p>';
    document.querySelectorAll('[data-filter]').forEach(function (tab) {
      tab.classList.toggle('is-active', tab.dataset.filter === filter);
    });
  }

  function load() {
    status.textContent = 'Loading bookings...';
    return api('GET').then(function (data) {
      bookings = data;
      status.textContent = '';
      loginForm.hidden = true;
      dashboard.hidden = false;
      logout.hidden = false;
      render();
    });
  }

  loginForm.addEventListener('submit', function (event) {
    event.preventDefault();
    var error = document.querySelector('[data-login-error]');
    try { sessionStorage.setItem(KEY, document.getElementById('admin-password').value); } catch (err) { /* ignore */ }
    load().catch(function (err) {
      error.textContent = err.message;
      error.hidden = false;
    });
  });

  logout.addEventListener('click', signOut);
  document.querySelector('[data-refresh]').addEventListener('click', function () { load().catch(function (err) { status.textContent = err.message; }); });
  document.querySelectorAll('[data-filter]').forEach(function (tab) {
    tab.addEventListener('click', function () { filter = tab.dataset.filter; render(); });
  });

  list.addEventListener('click', function (event) {
    var approve = event.target.closest('[data-approve]');
    var decline = event.target.closest('[data-decline]');
    if (!approve && !decline) { return; }
    var article = event.target.closest('[data-ref]');
    var ref = article.dataset.ref;
    var message = article.querySelector('[data-message]').value;
    var body = { ref: ref, message: message };
    if (approve) {
      body.action = 'approve';
      body.depositAmount = Math.round(Number(article.querySelector('[data-deposit]').value) * 100);
      if (!window.confirm('Email ' + ref + ' a link to pay a deposit of ' + rand(body.depositAmount) + '?')) { return; }
    } else {
      body.action = 'decline';
      if (!window.confirm('Decline ' + ref + ' and email the customer?')) { return; }
    }
    event.target.disabled = true;
    status.textContent = 'Saving...';
    function reloadThenShow(text) {
      return load().catch(function () { /* keep the message below */ }).then(function () { status.textContent = text; });
    }
    api('POST', body).then(function () {
      return reloadThenShow(body.action === 'approve' ? 'Deposit link sent for ' + ref + '.' : ref + ' declined and customer notified.');
    }).catch(function (err) {
      event.target.disabled = false;
      return reloadThenShow(err.message);
    });
  });

  if (password()) { load().catch(signOut); }
})();
