import { createApp } from '../apps/api/src/app.js';
import { seedIfEmpty } from '../apps/api/src/seed.js';

seedIfEmpty();

const app = createApp();

function originalApiPath(req) {
  const candidates = [
    req.headers['x-forwarded-uri'],
    req.headers['x-vercel-original-url'],
    req.headers['x-invoke-path'],
    req.headers['x-original-url'],
    req.originalUrl,
    req.url
  ];
  for (const value of candidates) {
    if (typeof value === 'string' && (value === '/api' || value.startsWith('/api/'))) return value;
  }
  return req.url;
}

export default function handler(req, res) {
  const path = originalApiPath(req);
  console.log(JSON.stringify({
    url: req.url,
    originalUrl: req.originalUrl,
    chosen: path,
    forwarded: req.headers['x-forwarded-uri'] || null,
    invoke: req.headers['x-invoke-path'] || null
  }));
  req.url = path;
  return app(req, res);
}
