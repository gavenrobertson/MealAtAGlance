import { Hono } from 'hono';
import { stream } from 'hono/streaming';
import { z } from 'zod';
import type { PlanStreamEvent } from '../shared/types';
import { CATEGORIES, MEAL_SLOTS } from '../shared/types';
import { PlannerError, claudeMeal, claudePlan } from './ai/claude';
import { demoMeal, demoPlan } from './ai/demo';
import { mealZ } from './ai/schema';
import { isTruthy, type Env } from './env';
import { PROVIDERS, checkout, getProvider, matchItems, providerInfo } from './providers';
import { ProviderError, type ProviderContext } from './providers/types';

const prefsZ = z.object({
  householdServings: z.number().int().min(1).max(20),
  slots: z.object(Object.fromEntries(MEAL_SLOTS.map((s) => [s, z.boolean()])) as Record<(typeof MEAL_SLOTS)[number], z.ZodBoolean>),
  diets: z.array(z.string().max(40)).max(20),
  allergies: z.array(z.string().max(40)).max(20),
  dislikes: z.array(z.string().max(60)).max(40),
  cuisines: z.array(z.string().max(40)).max(20),
  weeklyBudget: z.number().min(0).max(5000),
  maxCookMinutes: z.number().min(5).max(480),
  quickMealMinutes: z.number().min(0).max(240),
  units: z.enum(['us', 'metric']),
  zipCode: z.string().max(10),
});

const lockedZ = z.object({
  dayIndex: z.number().int().min(0).max(6),
  slot: z.enum(MEAL_SLOTS),
  meal: mealZ.extend({ id: z.string() }),
});

const planReqZ = z.object({ request: z.string().max(2000), preferences: prefsZ, locked: z.array(lockedZ).max(28) });
const mealReqZ = z.object({
  request: z.string().max(2000),
  preferences: prefsZ,
  dayIndex: z.number().int().min(0).max(6),
  slot: z.enum(MEAL_SLOTS),
  avoid: z.array(z.string().max(200)).max(40),
  hint: z.string().max(500).optional(),
});
const matchReqZ = z.object({
  items: z.array(z.object({ key: z.string().max(120), query: z.string().min(1).max(120), category: z.enum(CATEGORIES).catch('other') })).max(200),
  zipCode: z.string().max(10).optional(),
  locationId: z.string().max(40).optional(),
});
const checkoutReqZ = z.object({
  items: z.array(z.object({
    name: z.string().max(120), quantity: z.number(), unit: z.string().max(20), productId: z.string().max(80).optional(), packs: z.number(),
  })).max(200),
  zipCode: z.string().max(10).optional(),
});

type AppEnv = { Bindings: Env };

const aiLive = (env: Env, demo: boolean) => !demo && !isTruthy(env.DEMO_MODE) && !!env.ANTHROPIC_API_KEY;
const wantsDemo = (q: string | undefined) => q === '1' || q === 'true';

export function createApi() {
  const app = new Hono<AppEnv>().basePath('/api');

  app.onError((err, c) => {
    if (err instanceof z.ZodError) return c.json({ error: 'Invalid request', issues: err.issues.slice(0, 5) }, 400);
    const status = err instanceof ProviderError || err instanceof PlannerError ? err.status : 500;
    console.error(`[api] ${c.req.method} ${c.req.path}:`, err.message);
    return c.json({ error: err.message }, status as 400);
  });

  app.get('/health', (c) => c.json({ ok: true }));

  app.get('/config', (c) => {
    const demo = wantsDemo(c.req.query('demo'));
    const ctx: ProviderContext = { env: c.env };
    return c.json({
      demoForced: isTruthy(c.env.DEMO_MODE),
      ai: { live: aiLive(c.env, demo), model: aiLive(c.env, demo) ? c.env.CLAUDE_MODEL || 'claude-opus-5-5' : 'demo recipe library' },
      providers: PROVIDERS.map((p) => providerInfo(p, ctx, demo)),
    });
  });

  // Full-week plan. Streams NDJSON progress events, then the plan.
  app.post('/plan', async (c) => {
    const req = planReqZ.parse(await c.req.json());
    const demo = wantsDemo(c.req.query('demo'));
    c.header('Content-Type', 'application/x-ndjson');
    c.header('Cache-Control', 'no-store');
    return stream(c, async (s) => {
      const send = (ev: PlanStreamEvent) => s.write(JSON.stringify(ev) + '\n');
      try {
        if (!aiLive(c.env, demo)) {
          await send({ type: 'progress', days: 3, message: 'Picking recipes from the demo library…' });
          await new Promise((r) => setTimeout(r, 700)); // let the loading state breathe
          await send({ type: 'plan', plan: demoPlan(req) });
          return;
        }
        await send({ type: 'progress', days: 0, message: 'Claude is planning your week…' });
        const plan = await claudePlan(c.env, req, (days) => void send({ type: 'progress', days }));
        await send({ type: 'plan', plan });
      } catch (err) {
        console.error('[api] plan failed:', (err as Error).message);
        await send({ type: 'error', error: (err as Error).message });
      }
    });
  });

  app.post('/plan/meal', async (c) => {
    const req = mealReqZ.parse(await c.req.json());
    const demo = wantsDemo(c.req.query('demo'));
    const meal = aiLive(c.env, demo) ? await claudeMeal(c.env, req) : demoMeal(req);
    return c.json({ meal, source: aiLive(c.env, demo) ? 'ai' : 'demo' });
  });

  app.post('/stores/:id/match', async (c) => {
    const provider = getProvider(c.req.param('id'));
    const body = matchReqZ.parse(await c.req.json());
    const ctx: ProviderContext = { env: c.env, zipCode: body.zipCode, locationId: body.locationId };
    return c.json(await matchItems(provider, body.items, ctx, wantsDemo(c.req.query('demo'))));
  });

  app.get('/stores/:id/products/:productId', async (c) => {
    const provider = getProvider(c.req.param('id'));
    if (!provider.getPrice || !provider.isConfigured(c.env)) throw new ProviderError('Live price lookup is not available for this store.', 400);
    const product = await provider.getPrice(c.req.param('productId'), { env: c.env, zipCode: c.req.query('zip') });
    if (!product) throw new ProviderError('Product not found', 404);
    return c.json(product);
  });

  app.post('/stores/:id/checkout', async (c) => {
    const provider = getProvider(c.req.param('id'));
    const body = checkoutReqZ.parse(await c.req.json());
    return c.json(await checkout(provider, body.items, { env: c.env, zipCode: body.zipCode }));
  });

  return app;
}
