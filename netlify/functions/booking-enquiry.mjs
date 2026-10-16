import { newBooking, BookingError } from '../lib/booking.mjs';
import { bookingStore } from '../lib/store.mjs';
import { sendEnquiryEmails } from '../lib/email.mjs';
import { json, readJson, siteUrl } from '../lib/http.mjs';

export default async (request) => {
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed.' });
  const input = await readJson(request);
  if (input?.company) return json(200, { ref: 'received' }); // spam honeypot
  let booking;
  try {
    booking = newBooking(input);
  } catch (error) {
    if (error instanceof BookingError) return json(400, { error: error.message });
    return json(400, { error: 'Invalid booking.' });
  }
  const store = await bookingStore();
  await store.set(booking.ref, booking);
  try {
    await sendEnquiryEmails(booking, siteUrl());
  } catch (error) {
    // The enquiry is saved and visible in the admin page even if an email fails.
    console.error(error);
  }
  return json(200, { ref: booking.ref });
};

export const config = { path: '/api/booking-enquiry' };
