import { bookingStore } from './store.mjs';
import { safeEqual } from './http.mjs';

// Finds a booking from the secret link emailed to the customer.
export async function findByLink(ref, token) {
  if (typeof ref !== 'string' || typeof token !== 'string' || !/^LL-[0-9A-F-]+$/.test(ref)) return null;
  const booking = await (await bookingStore()).get(ref);
  return booking && safeEqual(booking.token, token) ? booking : null;
}
