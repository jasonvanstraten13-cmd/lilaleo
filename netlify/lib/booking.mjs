// Booking enquiries and deposits. Prices always come from shop/data, never from the browser.
import crypto from 'node:crypto';
import products from '../../shop/data/products.json' with { type: 'json' };
import settings from '../../shop/data/booking.json' with { type: 'json' };

export const EVENT_TYPES = ['Wedding', 'Kitchen tea', 'Baby shower', 'Bachelorette', 'Other'];
const MAX_LINES = 30;

export class BookingError extends Error {}

export function text(value, max, field, required) {
  const result = typeof value === 'string' ? value.trim() : '';
  if (required && !result) throw new BookingError(`Please fill in ${field}.`);
  if (result.length > max) throw new BookingError(`${field} is too long.`);
  return result;
}

export function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// Today's date in South Africa (UTC+2) as YYYY-MM-DD.
export function todaySA(now = new Date()) {
  return new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function addDays(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function makeRef(now = new Date()) {
  const date = now.toISOString().slice(2, 10).replace(/-/g, '');
  return `LL-${date}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

export function defaultDeposit(subtotal) {
  return Math.round((subtotal * settings.depositPercent) / 100);
}

export function buildEnquiry(input, { catalogue = products, now = new Date() } = {}) {
  if (!input || typeof input !== 'object') throw new BookingError('Invalid booking.');
  const requested = Array.isArray(input.items) ? input.items : [];
  if (!requested.length) throw new BookingError('Your booking list is empty.');
  if (requested.length > MAX_LINES) throw new BookingError('Too many items in one booking.');

  const items = requested.map((entry) => {
    const product = catalogue.find((candidate) => candidate.id === entry?.id);
    if (!product) throw new BookingError('One of the items in your booking list is no longer available.');
    if (!product.inStock) throw new BookingError(`${product.name} is currently booked out.`);
    const quantity = Number(entry.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > settings.maxQuantityPerItem) {
      throw new BookingError(`Please choose a quantity between 1 and ${settings.maxQuantityPerItem} for ${product.name}.`);
    }
    return { id: product.id, name: product.name, unitPrice: product.price, quantity, lineTotal: product.price * quantity };
  });

  const customer = {
    name: text(input.name, 120, 'your name', true),
    email: text(input.email, 200, 'your email', true),
    phone: text(input.phone, 40, 'your phone number', true)
  };
  if (!validEmail(customer.email)) throw new BookingError('Please enter a valid email address.');

  const eventType = text(input.eventType, 40, 'the event type', true);
  if (!EVENT_TYPES.includes(eventType)) throw new BookingError('Please choose an event type.');
  const eventDate = text(input.eventDate, 10, 'the event date', true);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || Number.isNaN(Date.parse(eventDate))) throw new BookingError('Please choose a valid event date.');
  const earliest = addDays(todaySA(now), settings.minNoticeDays);
  if (eventDate < earliest) throw new BookingError(`Please choose an event date from ${earliest} onwards, or contact us directly for short-notice bookings.`);

  return {
    status: 'enquiry',
    createdAt: now.toISOString(),
    customer,
    event: { type: eventType, date: eventDate, venue: text(input.venue, 200, 'the venue', false), decorInterest: input.decorInterest === true },
    notes: text(input.notes, 2000, 'your notes', false),
    items,
    subtotal: items.reduce((total, item) => total + item.lineTotal, 0),
    depositAmount: null
  };
}

export function newBooking(input, options) {
  return { ...buildEnquiry(input, options), ref: makeRef(options?.now), token: crypto.randomBytes(24).toString('base64url') };
}

// What the customer may see on the payment page.
export function publicView(booking) {
  const { token, ownerNote, payment, ...rest } = booking;
  return { ...rest, paid: Boolean(payment) };
}

export function payLink(booking, site) {
  return `${site}/shop/pay.html?ref=${encodeURIComponent(booking.ref)}&token=${encodeURIComponent(booking.token)}`;
}
