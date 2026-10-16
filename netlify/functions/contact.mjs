import { text, validEmail, BookingError } from '../lib/booking.mjs';
import { sendContactMessage } from '../lib/email.mjs';
import { json, readJson } from '../lib/http.mjs';

export default async (request) => {
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed.' });
  const input = await readJson(request);
  if (!input) return json(400, { error: 'Invalid message.' });
  if (input.company) return json(200, { ok: true }); // spam honeypot
  let message;
  try {
    message = {
      name: text(input.name, 120, 'your name', true),
      email: text(input.email, 200, 'your email', true),
      phone: text(input.phone, 40, 'your phone number', false),
      eventType: text(input.eventType, 40, 'the event type', false),
      eventDate: text(input.eventDate, 10, 'the event date', false),
      decorInterest: input.decorInterest === true,
      message: text(input.message, 4000, 'your message', true)
    };
    if (!validEmail(message.email)) throw new BookingError('Please enter a valid email address.');
  } catch (error) {
    if (error instanceof BookingError) return json(400, { error: error.message });
    throw error;
  }
  try {
    await sendContactMessage(message);
    return json(200, { ok: true });
  } catch (error) {
    console.error(error);
    return json(502, { error: 'Your message could not be sent right now. Please try again, or contact us on WhatsApp or email.' });
  }
};

export const config = { path: '/api/contact' };
