// Deposit payment page, opened from the secure link in the "your date is available" email.
(function () {
  'use strict';

  var root = document.querySelector('[data-pay]');
  if (!root) { return; }
  var params = new URLSearchParams(window.location.search);
  var ref = params.get('ref');
  var token = params.get('token');
  var returned = params.get('status');

  function rand(cents) {
    return 'R' + (cents / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function message(title, body) {
    root.innerHTML = '<div class="empty-state"><h2>' + title + '</h2><p>' + body + '</p><a class="btn btn--outline" href="../contact.html">Contact us</a></div>';
  }

  function render(booking) {
    var items = booking.items.map(function (item) {
      return '<div class="booking-summary__row"><span>' + escapeHtml(item.name) + ' &times; ' + item.quantity + '</span><span>' + rand(item.lineTotal) + '</span></div>';
    }).join('');
    var notice = '';
    if (returned === 'cancelled') { notice = 'Payment was cancelled. You can try again whenever you are ready.'; }
    if (returned === 'failed') { notice = 'Your payment did not go through and no money was taken. Please try again or use a different card.'; }

    if (booking.paid || returned === 'paid') {
      root.innerHTML = '<div class="empty-state"><h2>Thank you, your booking is secured!</h2>' +
        '<p>We have received your deposit for booking ' + escapeHtml(booking.ref) + '. A confirmation email is on its way to you.</p>' +
        '<a class="btn btn--primary" href="../index.html">Back to home</a></div>';
      return;
    }
    if (booking.status === 'declined') {
      message('This booking is not available', 'Unfortunately we could not take this booking. Please get in touch to look at other dates or pieces.');
      return;
    }
    if (booking.status !== 'approved') {
      message('We are still checking your date', 'You will receive an email with your deposit link as soon as your booking is confirmed.');
      return;
    }

    root.innerHTML =
      '<div class="booking-summary">' +
      '<h2>' + escapeHtml(booking.event.type) + ' · ' + escapeHtml(booking.event.date) + '</h2>' +
      '<p class="hint">Booking ' + escapeHtml(booking.ref) + ' for ' + escapeHtml(booking.customer.name) + '</p>' +
      items +
      '<div class="booking-summary__row"><span>Hire subtotal</span><span>' + rand(booking.subtotal) + '</span></div>' +
      (booking.ownerMessage ? '<p class="pay-note">' + escapeHtml(booking.ownerMessage) + '</p>' : '') +
      '<div class="booking-summary__row"><span>Deposit due now</span><span>' + rand(booking.depositAmount) + '</span></div>' +
      '</div>' +
      '<p class="form-error" role="alert" data-pay-error' + (notice ? '' : ' hidden') + '>' + notice + '</p>' +
      '<button class="btn btn--primary" type="button" data-pay-button>Pay ' + rand(booking.depositAmount) + ' deposit securely</button>' +
      '<p class="hint">You will be taken to Yoco to pay by card. We never see or store your card details. Your date is secured once the deposit is paid.</p>';

    root.querySelector('[data-pay-button]').addEventListener('click', function (event) {
      var button = event.currentTarget;
      var error = root.querySelector('[data-pay-error]');
      button.disabled = true;
      button.textContent = 'Taking you to payment...';
      fetch('/api/pay-deposit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ref: ref, token: token }) })
        .then(function (response) {
          return response.json().catch(function () { return {}; }).then(function (body) {
            if (!response.ok || !body.redirectUrl) { throw new Error(body.error || 'We could not start the payment. Please try again.'); }
            window.location.href = body.redirectUrl;
          });
        })
        .catch(function (err) {
          error.textContent = err.message;
          error.hidden = false;
          button.disabled = false;
          button.textContent = 'Pay ' + rand(booking.depositAmount) + ' deposit securely';
        });
    });
  }

  if (!ref || !token) {
    message('Link not recognised', 'Please use the payment link from your email.');
    return;
  }
  fetch('/api/booking?ref=' + encodeURIComponent(ref) + '&token=' + encodeURIComponent(token))
    .then(function (response) {
      return response.json().then(function (body) {
        if (!response.ok) { throw new Error(body.error); }
        return body;
      });
    })
    .then(render)
    .catch(function (err) {
      message('Link not recognised', escapeHtml(err.message || 'Please use the payment link from your email.'));
    });
})();
