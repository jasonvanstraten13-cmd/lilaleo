// Lets a customer with the secret link view their booking on the payment page.
import { publicView } from '../lib/booking.mjs';
import { findByLink } from '../lib/links.mjs';
import { json } from '../lib/http.mjs';

export default async (request) => {
  const url = new URL(request.url);
  const booking = await findByLink(url.searchParams.get('ref'), url.searchParams.get('token'));
  if (!booking) return json(404, { error: 'We could not find this booking. Please check the link in your email.' });
  return json(200, publicView(booking));
};

export const config = { path: '/api/booking' };
