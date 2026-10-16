import { findByLink } from '../lib/links.mjs';
import { yocoRequest } from '../lib/yoco.mjs';
import { json, readJson, siteUrl } from '../lib/http.mjs';

export default async (request) => {
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed.' });
  if (!process.env.YOCO_SECRET_KEY || !siteUrl()) {
    console.error('Deposit payments need YOCO_SECRET_KEY and SITE_URL.');
    return json(503, { error: 'Online payment is not available right now. Please contact us.' });
  }
  const input = await readJson(request);
  const booking = await findByLink(input?.ref, input?.token);
  if (!booking) return json(404, { error: 'We could not find this booking. Please check the link in your email.' });
  if (booking.payment) return json(409, { error: 'The deposit for this booking has already been paid. Thank you!' });
  if (booking.status !== 'approved' || !booking.depositAmount) return json(409, { error: 'This booking is not ready for payment yet.' });

  const back = `${siteUrl()}/shop/pay.html?ref=${encodeURIComponent(booking.ref)}&token=${encodeURIComponent(booking.token)}`;
  try {
    const checkout = await yocoRequest('/checkouts', {
      method: 'POST',
      body: {
        amount: booking.depositAmount,
        currency: 'ZAR',
        externalId: booking.ref,
        lineItems: [{ displayName: `Deposit - booking ${booking.ref} (${booking.event.type}, ${booking.event.date})`, quantity: 1, pricingDetails: { price: booking.depositAmount } }],
        successUrl: `${back}&status=paid`,
        cancelUrl: `${back}&status=cancelled`,
        failureUrl: `${back}&status=failed`,
        metadata: { bookingRef: booking.ref }
      }
    });
    return json(200, { redirectUrl: checkout.redirectUrl });
  } catch (error) {
    console.error(error);
    return json(502, { error: 'We could not start the payment. Please try again in a moment.' });
  }
};

export const config = { path: '/api/pay-deposit' };
