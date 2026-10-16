// Registers the deposit webhook with Yoco and prints the signing secret (shown only once).
// Usage (PowerShell): $env:YOCO_SECRET_KEY="sk_..."; $env:SITE_URL="https://www.lilahleo.co.za"; npm run register-webhook
import { yocoRequest } from '../netlify/lib/yoco.mjs';

if (!process.env.YOCO_SECRET_KEY || !process.env.SITE_URL?.startsWith('https://')) {
  console.error('Set YOCO_SECRET_KEY and an https SITE_URL first.');
  process.exit(1);
}
const webhook = await yocoRequest('/webhooks', {
  method: 'POST',
  body: { name: 'lilahleo-deposits', url: `${process.env.SITE_URL.replace(/\/$/, '')}/api/yoco-webhook` }
});
console.log('Webhook registered. Save this as YOCO_WEBHOOK_SECRET in Netlify:');
console.log(webhook.secret);
