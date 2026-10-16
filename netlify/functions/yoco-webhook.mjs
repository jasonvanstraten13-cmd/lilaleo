import { verifyWebhook } from '../lib/yoco.mjs';
import { bookingStore } from '../lib/store.mjs';
import { sendDepositPaid, sendEmail, rand, escape } from '../lib/email.mjs';

export default async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const body = await request.text();
  const valid = verifyWebhook({
    id: request.headers.get('webhook-id'),
    timestamp: request.headers.get('webhook-timestamp'),
    signatureHeader: request.headers.get('webhook-signature'),
    body,
    secret: process.env.YOCO_WEBHOOK_SECRET
  });
  if (!valid) return new Response('Invalid signature', { status: 403 });

  const event = JSON.parse(body);
  if (event.type !== 'payment.succeeded') return new Response('Ignored', { status: 200 });
  const payment = event.payload || {};
  const ref = payment.metadata?.bookingRef;

  try {
    const store = await bookingStore();
    const booking = ref ? await store.get(ref) : null;
    if (booking?.payment) return new Response('Already recorded', { status: 200 }); // Yoco retries are safe
    if (!booking || payment.amount !== booking.depositAmount) {
      // Never lose a payment: alert the owner to check it in the Yoco portal.
      await sendEmail({
        to: process.env.OWNER_EMAIL,
        subject: 'Payment received - please check it in Yoco',
        html: `<p>A payment of ${rand(payment.amount || 0)} succeeded but could not be matched to a booking deposit automatically.</p><p>Booking: ${escape(ref || 'unknown')}<br>Payment ID: ${escape(payment.id || 'unknown')}</p>`
      });
      return new Response('Unmatched', { status: 200 });
    }
    booking.status = 'deposit_paid';
    booking.payment = { id: payment.id, amount: payment.amount, paidAt: new Date().toISOString() };
    await store.set(booking.ref, booking);
    await sendDepositPaid(booking);
    return new Response('OK', { status: 200 });
  } catch (error) {
    // A non-2xx response makes Yoco retry the webhook later.
    console.error(error);
    return new Response('Processing failed', { status: 500 });
  }
};

export const config = { path: '/api/yoco-webhook' };
