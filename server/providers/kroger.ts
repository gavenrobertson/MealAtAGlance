import type { Product } from '../../shared/types';
import { parseSize } from '../../shared/units';
import type { Env } from '../env';
import { TTLCache } from '../cache';
import { ProviderError, type ProviderContext, type StoreProvider } from './types';

/**
 * Kroger Public API (developer.kroger.com). Free and self-serve.
 * OAuth2 client-credentials with the `product.compact` scope; prices are per store location,
 * so a locationId (or the user's ZIP) is required.
 * Also covers Kroger-family banners: Ralphs, Fred Meyer, King Soopers, Harris Teeter, Smith's, Fry's...
 */
const DEFAULT_API = 'https://api.kroger.com/v1';
const base = (env: Env) => (env.KROGER_API_BASE || DEFAULT_API).replace(/\/$/, '');

let token: { value: string; expires: number } | undefined;
const locations = new TTLCache<{ id: string; name: string }>(24 * 3600_000);

async function getToken(env: Env): Promise<string> {
  if (token && token.expires > Date.now() + 60_000) return token.value;
  const res = await fetch(`${base(env)}/connect/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${env.KROGER_CLIENT_ID}:${env.KROGER_CLIENT_SECRET}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials&scope=product.compact',
  });
  if (!res.ok) throw new ProviderError(`Kroger auth failed (${res.status}). Check KROGER_CLIENT_ID / KROGER_CLIENT_SECRET.`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  token = { value: data.access_token, expires: Date.now() + data.expires_in * 1000 };
  return token.value;
}

async function call<T>(env: Env, path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${base(env)}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${await getToken(env)}`, Accept: 'application/json' } });
  if (!res.ok) throw new ProviderError(`Kroger API ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`, res.status === 429 ? 429 : 502);
  return res.json() as Promise<T>;
}

interface KrogerProduct {
  productId: string;
  description: string;
  brand?: string;
  productPageURI?: string;
  images?: Array<{ perspective: string; featured?: boolean; sizes: Array<{ size: string; url: string }> }>;
  items?: Array<{ itemId: string; size?: string; soldBy?: string; price?: { regular: number; promo: number }; fulfillment?: Record<string, boolean> }>;
}

function mapProduct(p: KrogerProduct): Product | null {
  const item = p.items?.[0];
  const regular = item?.price?.regular;
  if (!regular) return null;
  const promo = item.price?.promo && item.price.promo > 0 && item.price.promo < regular ? item.price.promo : undefined;
  const byWeight = item.soldBy?.toUpperCase() === 'WEIGHT';
  const image = (p.images?.find((i) => i.featured) ?? p.images?.[0])?.sizes;
  return {
    id: p.productId,
    provider: 'kroger',
    name: p.description,
    brand: p.brand,
    price: promo ?? regular,
    regularPrice: promo ? regular : undefined,
    sizeText: byWeight ? 'per lb' : item.size,
    size: byWeight ? parseSize('1 lb') : parseSize(item.size) ?? parseSize(p.description),
    soldByWeight: byWeight,
    image: (image?.find((s) => s.size === 'medium') ?? image?.find((s) => s.size === 'large') ?? image?.[0])?.url,
    url: p.productPageURI ? `https://www.kroger.com${p.productPageURI}` : `https://www.kroger.com/search?query=${encodeURIComponent(p.description)}`,
    inStock: item.fulfillment ? Object.values(item.fulfillment).some(Boolean) : undefined,
  };
}

async function resolveStore(ctx: ProviderContext): Promise<{ id: string; name: string }> {
  const fixed = ctx.locationId || ctx.env.KROGER_LOCATION_ID;
  if (fixed) return { id: fixed, name: `Kroger store ${fixed}` };
  if (!ctx.zipCode) throw new ProviderError('Add your ZIP code in Preferences so Kroger can price items at your nearest store.', 400);
  const cached = locations.get(ctx.zipCode);
  if (cached) return cached;
  type LocResponse = { data?: Array<{ locationId: string; name: string; address?: { city?: string } }> };
  const data = await call<LocResponse>(ctx.env, '/locations', { 'filter.zipCode.near': ctx.zipCode, 'filter.limit': '1' });
  const loc = data.data?.[0];
  if (!loc) throw new ProviderError(`No Kroger-family store found near ${ctx.zipCode}.`, 404);
  const store = { id: loc.locationId, name: `${loc.name}${loc.address?.city ? ` · ${loc.address.city}` : ''}` };
  locations.set(ctx.zipCode, store);
  return store;
}

export const kroger: StoreProvider = {
  id: 'kroger',
  name: 'Kroger',
  color: '#2c58a6',
  note: 'Store-specific prices for your nearest Kroger-family store.',
  capabilities: { livePrices: true, checkout: false, storeSpecific: true },
  demo: { priceFactor: 1.05, storeBrand: 'Kroger', organicBrand: 'Simple Truth Organic', promoRate: 0.22 },
  searchUrl: (q) => `https://www.kroger.com/search?query=${encodeURIComponent(q)}`,

  isConfigured: (env) => !!(env.KROGER_CLIENT_ID && env.KROGER_CLIENT_SECRET),
  resolveStore,

  async searchProducts(query, ctx) {
    const store = await resolveStore(ctx);
    // filter.term must be 3+ characters and at most 8 words.
    const term = query.split(/\s+/).slice(0, 8).join(' ');
    if (term.length < 3) return [];
    type SearchResponse = { data?: KrogerProduct[] };
    const data = await call<SearchResponse>(ctx.env, '/products', { 'filter.term': term, 'filter.locationId': store.id, 'filter.limit': '15' });
    return (data.data ?? []).map(mapProduct).filter((p): p is Product => !!p);
  },

  async getPrice(productId, ctx) {
    const store = await resolveStore(ctx);
    const data = await call<{ data?: KrogerProduct }>(ctx.env, `/products/${encodeURIComponent(productId)}`, { 'filter.locationId': store.id });
    return data.data ? mapProduct(data.data) : null;
  },
};
