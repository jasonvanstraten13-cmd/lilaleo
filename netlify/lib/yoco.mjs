import crypto from 'node:crypto';

export const YOCO_API = 'https://payments.yoco.com/api';
const TOLERANCE_SECONDS = 180;

// Verifies a Yoco webhook (Yoco developer docs, "Verifying the events").
export function verifyWebhook({ id, timestamp, signatureHeader, body, secret, now = Date.now() }) {
  if (!id || !timestamp || !signatureHeader || !secret) return false;
  if (Math.abs(now / 1000 - Number(timestamp)) > TOLERANCE_SECONDS) return false;
  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const expected = Buffer.from(crypto.createHmac('sha256', secretBytes).update(`${id}.${timestamp}.${body}`).digest('base64'));
  return signatureHeader.split(' ').some((entry) => {
    const signature = Buffer.from(entry.split(',')[1] || '');
    return signature.length === expected.length && crypto.timingSafeEqual(signature, expected);
  });
}

export async function yocoRequest(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${YOCO_API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${process.env.YOCO_SECRET_KEY}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Yoco ${method} ${path} failed (${response.status}): ${data.message || 'unknown error'}`);
  return data;
}
