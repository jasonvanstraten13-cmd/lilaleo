import crypto from 'node:crypto';

export const json = (status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export async function readJson(request) {
  try { return await request.json(); } catch { return null; }
}

export function safeEqual(a, b) {
  const left = Buffer.from(String(a ?? ''));
  const right = Buffer.from(String(b ?? ''));
  return left.length > 0 && left.length === right.length && crypto.timingSafeEqual(left, right);
}

export const siteUrl = () => (process.env.SITE_URL || '').replace(/\/$/, '');
