// Booking storage: Netlify Blobs in production, JSON files in a folder for local runs and tests.
import fs from 'node:fs/promises';
import path from 'node:path';

function fileStore(dir) {
  const file = (key) => path.join(dir, `${key.replace(/[^A-Za-z0-9-]/g, '')}.json`);
  return {
    async get(key) {
      try { return JSON.parse(await fs.readFile(file(key), 'utf8')); } catch { return null; }
    },
    async set(key, value) {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(file(key), JSON.stringify(value, null, 2));
    },
    async list() {
      try { return (await fs.readdir(dir)).filter((name) => name.endsWith('.json')).map((name) => name.slice(0, -5)); } catch { return []; }
    }
  };
}

export async function bookingStore() {
  if (process.env.LOCAL_STORE_DIR) return fileStore(process.env.LOCAL_STORE_DIR);
  const { getStore } = await import('@netlify/blobs');
  const store = getStore({ name: 'bookings', consistency: 'strong' });
  return {
    get: (key) => store.get(key, { type: 'json' }),
    set: (key, value) => store.setJSON(key, value),
    list: async () => (await store.list()).blobs.map((blob) => blob.key)
  };
}
