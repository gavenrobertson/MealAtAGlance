import { readFileSync, existsSync } from 'node:fs';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { createApi } from './app';
import type { Env } from './env';

// Node entry: reads .env (via `tsx --env-file`), optionally loads the Walmart key from a file,
// serves the API, and in production also serves the built frontend from ./dist.
const env: Env = { ...(process.env as Env) };
if (!env.WALMART_PRIVATE_KEY && process.env.WALMART_PRIVATE_KEY_PATH) {
  env.WALMART_PRIVATE_KEY = readFileSync(process.env.WALMART_PRIVATE_KEY_PATH, 'utf8');
}

const app = new Hono();
app.route('/', createApi());

if (process.env.NODE_ENV === 'production' && existsSync('./dist')) {
  app.use('/*', serveStatic({ root: './dist' }));
  app.get('*', serveStatic({ path: './dist/index.html' }));
}

const port = Number(process.env.PORT) || 8787;
serve({ fetch: (req) => app.fetch(req, env), port }, () => {
  const on = (b: boolean) => (b ? 'live' : 'demo');
  console.log(`🍽️  Meal at a Glance API on http://localhost:${port}`);
  console.log(`   AI: ${on(!!env.ANTHROPIC_API_KEY)} · Walmart: ${on(!!(env.WALMART_CONSUMER_ID && env.WALMART_PRIVATE_KEY))} · Kroger: ${on(!!(env.KROGER_CLIENT_ID && env.KROGER_CLIENT_SECRET))} · Instacart: ${on(!!env.INSTACART_API_KEY)}`);
});
