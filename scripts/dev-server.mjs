// Minimal local server: serves the static site and runs the /api functions.
// Usage: npm start  (reads .env if present; bookings are saved as files in LOCAL_STORE_DIR).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT) || 8888;
if (fs.existsSync(path.join(root, '.env'))) process.loadEnvFile(path.join(root, '.env'));
process.env.SITE_URL ||= `http://localhost:${port}`;
process.env.LOCAL_STORE_DIR = path.resolve(root, process.env.LOCAL_STORE_DIR || '.data/bookings');

// Map each function's configured path to its file.
const functions = {};
for (const file of fs.readdirSync(path.join(root, 'netlify/functions'))) {
  const mod = await import(pathToFileURL(path.join(root, 'netlify/functions', file)).href);
  if (mod.config?.path) functions[mod.config.path] = mod.default;
}

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.xml': 'application/xml', '.txt': 'text/plain' };
const hidden = ['netlify', 'scripts', 'tests', '.data', '.git', 'node_modules'];

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  const handler = functions[url.pathname];
  if (handler) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const response = await handler(new Request(url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks) }));
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
    return;
  }
  let file = path.normalize(path.join(root, decodeURIComponent(url.pathname)));
  const top = path.relative(root, file).split(path.sep)[0];
  if (!file.startsWith(root) || hidden.includes(top) || file.endsWith('.env')) { res.writeHead(404).end('Not found'); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404).end('Not found'); return; }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(port, () => console.log(`Lilahleo running at http://localhost:${port}/`));
