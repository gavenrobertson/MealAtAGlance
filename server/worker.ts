import { Hono } from 'hono';
import { createApi } from './app';
import type { Env } from './env';

// Cloudflare Workers entry. Static assets are served by Workers Assets (see wrangler.toml);
// set keys with `wrangler secret put ANTHROPIC_API_KEY` etc.
const app = new Hono<{ Bindings: Env }>();
app.route('/', createApi());

export default app;
