// Emails sent through Resend (https://resend.com).
const money = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' });
export const rand = (cents) => money.format(cents / 100);
export const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const lines = (value) => escape(value).replace(/\n/g, '<br>');

export async function sendEmail({ to, subject, html, replyTo }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, html, reply_to: replyTo })
  });
  if (!response.ok) throw new Error(`Email to ${to} failed (${response.status}): ${await response.text()}`);
}

export function bookingSummaryHtml(booking) {
  const rows = booking.items.map((item) => `<tr><td>${escape(item.name)} &times; ${item.quantity}</td><td align="right">${rand(item.lineTotal)}</td></tr>`).join('');
  return `
    <p><strong>Booking ${escape(booking.ref)}</strong><br>
    ${escape(booking.event.type)} on ${escape(booking.event.date)}${booking.event.venue ? ` at ${escape(booking.event.venue)}` : ''}</p>
    <table cellpadding="6" style="border-collapse:collapse;min-width:320px">
      ${rows}
      <tr><td><strong>Hire subtotal</strong></td><td align="right"><strong>${rand(booking.subtotal)}</strong></td></tr>
      ${booking.depositAmount ? `<tr><td>Deposit</td><td align="right">${rand(booking.depositAmount)}</td></tr>` : ''}
    </table>
    ${booking.event.decorInterest ? '<p>Also interested in full decor &amp; styling.</p>' : ''}
    ${booking.notes ? `<p><strong>Notes</strong><br>${lines(booking.notes)}</p>` : ''}`;
}

const owner = () => process.env.OWNER_EMAIL;
const sign = '<p>Warm regards,<br>Lilahleo</p>';

export async function sendEnquiryEmails(booking, site) {
  const c = booking.customer;
  await sendEmail({
    to: owner(),
    replyTo: c.email,
    subject: `New booking enquiry ${booking.ref} - ${booking.event.type} ${booking.event.date}`,
    html: `<p>New booking enquiry from <strong>${escape(c.name)}</strong> (${escape(c.email)}, ${escape(c.phone)}).</p>${bookingSummaryHtml(booking)}<p><a href="${site}/admin/">Open bookings admin</a> to approve it and send the deposit link.</p>`
  });
  await sendEmail({
    to: c.email,
    replyTo: owner(),
    subject: `We received your booking enquiry ${booking.ref} - Lilahleo`,
    html: `<p>Hi ${escape(c.name)},</p><p>Thank you for your booking enquiry! We will check availability for your date and get back to you shortly. Once confirmed, you will receive a secure link to pay your deposit and secure your booking.</p>${bookingSummaryHtml(booking)}${sign}`
  });
}

export async function sendDepositRequest(booking, link) {
  await sendEmail({
    to: booking.customer.email,
    replyTo: owner(),
    subject: `Your date is available - secure booking ${booking.ref} - Lilahleo`,
    html: `<p>Hi ${escape(booking.customer.name)},</p><p>Good news, we can do your ${escape(booking.event.type.toLowerCase())} on ${escape(booking.event.date)}!</p>${booking.ownerMessage ? `<p>${lines(booking.ownerMessage)}</p>` : ''}${bookingSummaryHtml(booking)}<p>To secure your booking, please pay your deposit of <strong>${rand(booking.depositAmount)}</strong>:</p><p><a href="${link}" style="display:inline-block;padding:12px 22px;background:#94A187;color:#fff;border-radius:999px;text-decoration:none;font-weight:bold">Pay deposit securely</a></p><p>Payments are processed by Yoco. Your date is secured once the deposit is paid.</p>${sign}`
  });
}

export async function sendDeclined(booking) {
  await sendEmail({
    to: booking.customer.email,
    replyTo: owner(),
    subject: `About your booking enquiry ${booking.ref} - Lilahleo`,
    html: `<p>Hi ${escape(booking.customer.name)},</p><p>Thank you for thinking of us. Unfortunately we are not able to take this booking for ${escape(booking.event.date)}.</p>${booking.ownerMessage ? `<p>${lines(booking.ownerMessage)}</p>` : ''}<p>Please reply to this email if you would like to look at other dates or pieces.</p>${sign}`
  });
}

export async function sendDepositPaid(booking) {
  const c = booking.customer;
  await sendEmail({
    to: owner(),
    replyTo: c.email,
    subject: `Deposit paid ${booking.ref} - ${rand(booking.payment.amount)}`,
    html: `<p><strong>${escape(c.name)}</strong> (${escape(c.email)}, ${escape(c.phone)}) paid the deposit. This booking is now secured.</p>${bookingSummaryHtml(booking)}`
  });
  await sendEmail({
    to: c.email,
    replyTo: owner(),
    subject: `Booking secured ${booking.ref} - Lilahleo`,
    html: `<p>Hi ${escape(c.name)},</p><p>Thank you! We received your deposit of <strong>${rand(booking.payment.amount)}</strong> and your booking is secured. We will be in touch closer to the date to arrange the details.</p>${bookingSummaryHtml(booking)}${sign}`
  });
}

export async function sendContactMessage(message) {
  await sendEmail({
    to: owner(),
    replyTo: message.email,
    subject: `New website message from ${message.name}`,
    html: `<p><strong>${escape(message.name)}</strong> (${escape(message.email)}${message.phone ? `, ${escape(message.phone)}` : ''})</p>
      ${message.eventType ? `<p>Event: ${escape(message.eventType)}${message.eventDate ? ` on ${escape(message.eventDate)}` : ''}</p>` : ''}
      ${message.decorInterest ? '<p>Interested in full decor &amp; styling.</p>' : ''}
      <p>${lines(message.message)}</p>`
  });
}
