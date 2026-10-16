// Owner-only: list bookings, approve with a deposit (emails the pay link) or decline.
import { bookingStore } from '../lib/store.mjs';
import { defaultDeposit, payLink, text, BookingError } from '../lib/booking.mjs';
import { sendDepositRequest, sendDeclined } from '../lib/email.mjs';
import { json, readJson, safeEqual, siteUrl } from '../lib/http.mjs';

function authorised(request) {
  const header = request.headers.get('authorization') || '';
  return Boolean(process.env.ADMIN_PASSWORD) && safeEqual(header.replace(/^Bearer /, ''), process.env.ADMIN_PASSWORD);
}

export default async (request) => {
  if (!authorised(request)) return json(401, { error: 'Wrong password.' });
  const store = await bookingStore();

  if (request.method === 'GET') {
    const bookings = (await Promise.all((await store.list()).map((key) => store.get(key)))).filter(Boolean);
    bookings.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return json(200, bookings.map(({ token, ...booking }) => ({ ...booking, suggestedDeposit: defaultDeposit(booking.subtotal) })));
  }
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed.' });

  const input = await readJson(request);
  const booking = typeof input?.ref === 'string' ? await store.get(input.ref) : null;
  if (!booking) return json(404, { error: 'Booking not found.' });
  if (booking.payment) return json(409, { error: 'This deposit has already been paid.' });

  try {
    booking.ownerMessage = text(input.message, 2000, 'the message', false);
    if (input.action === 'approve') {
      const deposit = Math.round(Number(input.depositAmount));
      if (!Number.isInteger(deposit) || deposit < 100) throw new BookingError('Please enter a deposit of at least R1.');
      booking.status = 'approved';
      booking.depositAmount = deposit;
      booking.approvedAt = new Date().toISOString();
      await store.set(booking.ref, booking);
      await sendDepositRequest(booking, payLink(booking, siteUrl()));
    } else if (input.action === 'decline') {
      booking.status = 'declined';
      booking.declinedAt = new Date().toISOString();
      await store.set(booking.ref, booking);
      await sendDeclined(booking);
    } else {
      throw new BookingError('Unknown action.');
    }
  } catch (error) {
    if (error instanceof BookingError) return json(400, { error: error.message });
    console.error(error);
    return json(502, { error: `Saved, but the email could not be sent: ${error.message}` });
  }
  const { token, ...rest } = booking;
  return json(200, rest);
};

export const config = { path: '/api/admin/bookings' };
