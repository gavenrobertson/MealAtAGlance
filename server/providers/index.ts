import type { CheckoutItem, MatchRequestItem, MatchResponse, Product, ProviderInfo } from '../../shared/types';
import { isTruthy } from '../env';
import { TTLCache, mapLimit } from '../cache';
import { demoSearch } from './demo';
import { instacart } from './instacart';
import { kroger } from './kroger';
import { ProviderError, type ProviderContext, type StoreProvider } from './types';
import { walmart } from './walmart';

/** Every store the app knows about. To add one: write ./<store>.ts and append it here. */
export const PROVIDERS: StoreProvider[] = [walmart, kroger, instacart];

export function getProvider(id: string): StoreProvider {
  const p = PROVIDERS.find((x) => x.id === id);
  if (!p) throw new ProviderError(`Unknown store "${id}"`, 404);
  return p;
}

function usesLivePrices(p: StoreProvider, ctx: ProviderContext, forceDemo: boolean): boolean {
  return !forceDemo && !isTruthy(ctx.env.DEMO_MODE) && p.capabilities.livePrices && p.isConfigured(ctx.env);
}

export function providerInfo(p: StoreProvider, ctx: ProviderContext, forceDemo = false): ProviderInfo {
  const live = usesLivePrices(p, ctx, forceDemo);
  const configured = p.isConfigured(ctx.env) && !isTruthy(ctx.env.DEMO_MODE);
  return {
    id: p.id,
    name: p.name,
    color: p.color,
    live,
    note: live ? p.note : p.capabilities.livePrices ? 'Demo prices. Add API keys for live pricing.' : p.note,
    capabilities: { ...p.capabilities, checkout: p.capabilities.checkout && configured && !forceDemo },
  };
}

const searchCache = new TTLCache<Product[]>(6 * 3600_000);

/** Match every shopping-list item to candidate products at one store. */
export async function matchItems(p: StoreProvider, items: MatchRequestItem[], ctx: ProviderContext, forceDemo: boolean): Promise<MatchResponse> {
  const results: Record<string, Product[]> = {};
  if (!usesLivePrices(p, ctx, forceDemo)) {
    for (const item of items) results[item.key] = demoSearch(p, item.query, item.category);
    return { provider: p.id, mode: 'demo', results };
  }

  let store: { id: string; name: string } | undefined;
  try {
    store = p.resolveStore ? await p.resolveStore(ctx) : undefined;
  } catch (err) {
    // Without a store we can't get real prices; keep the app usable with estimates and say why.
    for (const item of items) results[item.key] = demoSearch(p, item.query, item.category);
    return { provider: p.id, mode: 'demo', results, warning: (err as Error).message };
  }

  const errors: Record<string, string> = {};
  await mapLimit(items, 4, async (item) => {
    const cacheKey = `${p.id}:${store?.id ?? ''}:${item.query.toLowerCase()}`;
    const cached = searchCache.get(cacheKey);
    if (cached) return (results[item.key] = cached);
    try {
      const products = await p.searchProducts(item.query, { ...ctx, locationId: store?.id });
      searchCache.set(cacheKey, products);
      results[item.key] = products.length ? products : demoSearch(p, item.query, item.category);
      if (!products.length) errors[item.key] = 'No live match; showing an estimate.';
    } catch (err) {
      errors[item.key] = (err as Error).message;
      results[item.key] = demoSearch(p, item.query, item.category);
    }
  });
  return { provider: p.id, mode: 'live', results, errors: Object.keys(errors).length ? errors : undefined, store };
}

export async function checkout(p: StoreProvider, items: CheckoutItem[], ctx: ProviderContext): Promise<{ url: string }> {
  if (!p.checkout || !p.isConfigured(ctx.env)) throw new ProviderError(`${p.name} checkout needs API keys.`, 400);
  return p.checkout(items, ctx);
}
