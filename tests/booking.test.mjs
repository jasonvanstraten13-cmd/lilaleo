import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const webhookSecret = Buffer.from('test-webhook-secret');
Object.assign(process.env, {
  LOCAL_STORE_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'lilahleo-')),
  SITE_URL: 'https://www.lilahleo.co.za',
  ADMIN_PASSWORD: 'correct horse',
  YOCO_SECRET_KEY: 'sk_test_x',
  YOCO_WEBHOOK_SECRET: `whsec_${webhookSecret.toString('base64')}`,
  RESEND_API_KEY: 're_x',
  EMAIL_FROM: 'Lilahleo <bookings@example.com>',
  OWNER_EMAIL: 'owner@example.com'
});

const { buildEnquiry, BookingError, addDays, todaySA } = await import('../netlify/lib/booking.mjs');
const { verifyWebhook } = await import('../netlify/lib/yoco.mjs');
const enquiry = (await import('../netlify/functions/booking-enquiry.mjs')).default;
const contact = (await import('../netlify/functions/contact.mjs')).default;
const getBooking = (await import('../netlify/functions/booking.mjs')).default;
const payDeposit = (await import('../netlify/functions/pay-deposit.mjs')).default;
const webhook = (await import('../netlify/functions/yoco-webhook.mjs')).default;
const admin = (await import('../netlify/functions/admin-bookings.mjs')).default;

// Stub Yoco and Resend.
const emails = [];
let lastCheckout;
globalThis.fetch = async (url, init) => {
  if (url.endsWith('/checkouts')) { lastCheckout = JSON.parse(init.body); return Response.json({ id: 'ch_1', redirectUrl: 'https://c.yoco.com/checkout/ch_1' }); }
  if (url.includes('resend')) { emails.push(JSON.parse(init.body)); return Response.json({ id: 'email' }); }
  throw new Error(`Unexpected fetch ${url}`);
};

const post = (body, headers = {}) => new Request('https://x/api', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
const adminHeaders = { Authorization: 'Bearer correct horse' };
const eventDate = addDays(todaySA(), 30);
const valid = {
  items: [{ id: 'mirror-arch-01', quantity: 1 }, { id: 'lawn-jenga-09', quantity: 2 }],
  name: 'Test Bride', email: 'bride@example.com', phone: '0820000000',
  eventType: 'Wedding', eventDate, venue: 'Oak Tree Estate', decorInterest: true, notes: 'Names: <b>A & B</b>'
};

function signedWebhook(payload) {
  const body = JSON.stringify(payload);
  const id = `msg_${crypto.randomUUID()}`;
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = crypto.createHmac('sha256', webhookSecret).update(`${id}.${timestamp}.${body}`).digest('base64');
  return new Request('https://x/api/yoco-webhook', { method: 'POST', body, headers: { 'webhook-id': id, 'webhook-timestamp': timestamp, 'webhook-signature': `v1,${signature}` } });
}

test('enquiry prices come from the catalogue', () => {
  const booking = buildEnquiry({ ...valid, items: [{ id: 'mirror-arch-01', quantity: 2, price: 1 }] });
  assert.equal(booking.subtotal, 130000);
});

test('enquiry validation', () => {
  assert.throws(() => buildEnquiry({ ...valid, items: [] }), BookingError);
  assert.throws(() => buildEnquiry({ ...valid, items: [{ id: 'mirror-fulllength-04', quantity: 1 }] }), /booked out/);
  assert.throws(() => buildEnquiry({ ...valid, items: [{ id: 'mirror-arch-01', quantity: 0 }] }), /quantity/);
  assert.throws(() => buildEnquiry({ ...valid, eventDate: todaySA() }), /from/);
  assert.throws(() => buildEnquiry({ ...valid, eventDate: 'tomorrow' }), /valid event date/);
  assert.throws(() => buildEnquiry({ ...valid, eventType: 'Rave' }), /event type/);
  assert.throws(() => buildEnquiry({ ...valid, email: 'nope' }), /valid email/);
  assert.throws(() => buildEnquiry({ ...valid, phone: '' }), /phone/);
});

test('webhook signature check', () => {
  const body = '{}';
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = crypto.createHmac('sha256', webhookSecret).update(`m.${timestamp}.${body}`).digest('base64');
  const args = { id: 'm', timestamp, body, secret: process.env.YOCO_WEBHOOK_SECRET };
  assert.equal(verifyWebhook({ ...args, signatureHeader: `v1,${signature}` }), true);
  assert.equal(verifyWebhook({ ...args, signatureHeader: 'v1,forged' }), false);
  assert.equal(verifyWebhook({ ...args, signatureHeader: `v1,${signature}`, now: Date.now() + 600000 }), false);
});

test('contact form emails the owner and ignores spam', async () => {
  emails.length = 0;
  assert.equal((await contact(post({ name: 'A', email: 'a@example.com', message: 'Hi <script>' }))).status, 200);
  assert.equal(emails.length, 1);
  assert.equal(emails[0].to[0], 'owner@example.com');
  assert.ok(!emails[0].html.includes('<script>'));
  assert.equal((await contact(post({ name: 'A', email: 'bad', message: 'Hi' }))).status, 400);
  await contact(post({ name: 'Bot', email: 'b@example.com', message: 'spam', company: 'x' }));
  assert.equal(emails.length, 1);
});

test('full booking flow: enquiry, approve, pay deposit, webhook', async () => {
  emails.length = 0;

  // 1. Customer sends an enquiry.
  const created = await enquiry(post(valid));
  assert.equal(created.status, 200);
  const { ref } = await created.json();
  assert.match(ref, /^LL-\d{6}-[0-9A-F]{6}$/);
  assert.deepEqual(emails.map((e) => e.to[0]), ['owner@example.com', 'bride@example.com']);
  assert.ok(!emails[0].html.includes('<b>'), 'customer notes are escaped');

  // 2. Admin needs the password.
  assert.equal((await admin(new Request('https://x/api/admin/bookings'))).status, 401);
  assert.equal((await admin(new Request('https://x/api/admin/bookings', { headers: { Authorization: 'Bearer wrong' } }))).status, 401);
  const listed = await (await admin(new Request('https://x/api/admin/bookings', { headers: adminHeaders }))).json();
  const listedBooking = listed.find((b) => b.ref === ref);
  assert.equal(listedBooking.status, 'enquiry');
  assert.equal(listedBooking.suggestedDeposit, 77500); // 50% of R1 550
  assert.equal(listedBooking.token, undefined, 'admin list never exposes the pay token');

  // Not payable before approval; token needed to view.
  const token = JSON.parse(fs.readFileSync(path.join(process.env.LOCAL_STORE_DIR, `${ref}.json`), 'utf8')).token;
  assert.equal((await payDeposit(post({ ref, token }))).status, 409);
  assert.equal((await getBooking(new Request(`https://x/api/booking?ref=${ref}&token=wrong`))).status, 404);

  // 3. Owner approves with a deposit; customer gets the pay link.
  emails.length = 0;
  const approved = await admin(post({ ref, action: 'approve', depositAmount: 60000, message: 'Setup included.' }, adminHeaders));
  assert.equal(approved.status, 200);
  assert.equal(emails.length, 1);
  assert.ok(emails[0].html.includes(`/shop/pay.html?ref=${ref}&amp;token=`) || emails[0].html.includes(`/shop/pay.html?ref=${ref}&token=`));

  const view = await (await getBooking(new Request(`https://x/api/booking?ref=${ref}&token=${token}`))).json();
  assert.equal(view.depositAmount, 60000);
  assert.equal(view.token, undefined);

  // 4. Customer pays; the checkout amount comes from the saved booking.
  const pay = await payDeposit(post({ ref, token, amount: 1 }));
  assert.equal(pay.status, 200);
  assert.equal((await pay.json()).redirectUrl, 'https://c.yoco.com/checkout/ch_1');
  assert.equal(lastCheckout.amount, 60000);
  assert.equal(lastCheckout.metadata.bookingRef, ref);

  // 5. Forged webhook is rejected; signed one secures the booking and emails both.
  const forged = new Request('https://x', { method: 'POST', body: '{}', headers: { 'webhook-id': 'x', 'webhook-timestamp': String(Math.floor(Date.now() / 1000)), 'webhook-signature': 'v1,nope' } });
  assert.equal((await webhook(forged)).status, 403);
  emails.length = 0;
  const event = { type: 'payment.succeeded', payload: { id: 'p_1', amount: 60000, metadata: { checkoutId: 'ch_1', bookingRef: ref } } };
  assert.equal((await webhook(signedWebhook(event))).status, 200);
  assert.deepEqual(emails.map((e) => e.to[0]), ['owner@example.com', 'bride@example.com']);

  // Yoco retry does not send duplicate emails; paid bookings cannot be paid or changed again.
  assert.equal((await webhook(signedWebhook(event))).status, 200);
  assert.equal(emails.length, 2);
  assert.equal((await payDeposit(post({ ref, token }))).status, 409);
  assert.equal((await admin(post({ ref, action: 'decline' }, adminHeaders))).status, 409);
  const after = await (await getBooking(new Request(`https://x/api/booking?ref=${ref}&token=${token}`))).json();
  assert.equal(after.status, 'deposit_paid');
  assert.equal(after.paid, true);
});

test('unmatched payment alerts the owner', async () => {
  emails.length = 0;
  const event = { type: 'payment.succeeded', payload: { id: 'p_2', amount: 5000, metadata: { bookingRef: 'LL-000000-ABCDEF' } } };
  assert.equal((await webhook(signedWebhook(event))).status, 200);
  assert.equal(emails.length, 1);
  assert.match(emails[0].subject, /check it in Yoco/);
});
