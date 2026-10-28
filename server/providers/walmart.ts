import type { Product } from '../../shared/types';
import { parseSize } from '../../shared/units';
import type { Env } from '../env';
import { ProviderError, type StoreProvider } from './types';

/**
 * Walmart Affiliate API (walmart.io).
 *
 * Auth: every request is signed with your RSA private key. The signature covers
 * "<consumerId>\n<timestamp>\n<keyVersion>\n" using SHA256withRSA, base64-encoded.
 * Implemented with WebCrypto so it runs unchanged on Node and Cloudflare Workers.
 */
const BASE = 'https://developer.api.walmart.com/api-proxy/service/affil/product/v2';
// Walmart's "Food" department. Searches fall back to all departments if this returns nothing.
const FOOD_CATEGORY = '976759';

interface WalmartItem {
  itemId: number;
  name: string;
  salePrice?: number;
  msrp?: number;
  size?: string;
  brandName?: string;
  thumbnailImage?: string;
  mediumImage?: string;
  largeImage?: string;
  productTrackingUrl?: string;
  productUrl?: string;
  stock?: string;
  availableOnline?: boolean;
}

let cachedKey: { pem: string; key: Promise<CryptoKey> } | undefined;

function importPrivateKey(pem: string): Promise<CryptoKey> {
  if (cachedKey?.pem === pem) return cachedKey.key;
  const normalized = pem.replace(/\\n/g, '\n').trim();
  if (normalized.includes('BEGIN RSA PRIVATE KEY')) {
    throw new ProviderError(
      'WALMART_PRIVATE_KEY is PKCS#1. Convert it with: openssl pkcs8 -topk8 -inform PEM -in key.pem -out key.pk8.pem -nocrypt', 500);
  }
  const b64 = normalized.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const key = crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  cachedKey = { pem, key };
  return key;
}

function toBase64(buf: ArrayBuffer): string {
  let s = '';
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s);
}

export async function walmartHeaders(env: Env, timestamp = Date.now().toString()): Promise<Record<string, string>> {
  const consumerId = env.WALMART_CONSUMER_ID!;
  const keyVersion = env.WALMART_KEY_VERSION || '1';
  const key = await importPrivateKey(env.WALMART_PRIVATE_KEY!);
  const payload = `${consumerId}\n${timestamp}\n${keyVersion}\n`;
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(payload));
  return {
    'WM_CONSUMER.ID': consumerId,
    'WM_CONSUMER.INTIMESTAMP': timestamp,
    'WM_SEC.KEY_VERSION': keyVersion,
    'WM_SEC.AUTH_SIGNATURE': toBase64(signature),
    Accept: 'application/json',
  };
}

async function call<T>(env: Env, path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  if (env.WALMART_PUBLISHER_ID) url.searchParams.set('publisherId', env.WALMART_PUBLISHER_ID);
  const res = await fetch(url, { headers: await walmartHeaders(env) });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new ProviderError(`Walmart API ${res.status}: ${body.slice(0, 200)}`, res.status === 429 ? 429 : 502);
  }
  return res.json() as Promise<T>;
}

export function mapWalmartItem(item: WalmartItem): Product | null {
  if (!item.salePrice) return null;
  const perLb = /\bper\s*lb\b|\/\s*lb\b/i.test(item.name);
  const each = /,\s*each\b|\beach$/i.test(item.name);
  const size = perLb
    ? parseSize('1 lb')
    : parseSize(item.size) ?? parseSize(item.name) ?? (each ? parseSize('1 ct') : undefined);
  return {
    id: String(item.itemId),
    provider: 'walmart',
    name: item.name,
    brand: item.brandName,
    price: item.salePrice,
    regularPrice: item.msrp && item.msrp > item.salePrice ? item.msrp : undefined,
    sizeText: perLb ? 'per lb' : item.size ?? item.name.match(/(\d*\.?\d+\s*(?:fl\.?\s*oz|oz|lb|ct|count|gal|g|kg|ml|l)\b)/i)?.[1],
    size,
    soldByWeight: perLb,
    image: item.mediumImage ?? item.thumbnailImage ?? item.largeImage,
    url: item.productTrackingUrl ?? item.productUrl,
    inStock: item.stock ? item.stock === 'Available' : item.availableOnline !== false,
  };
}

export const walmart: StoreProvider = {
  id: 'walmart',
  name: 'Walmart',
  color: '#0071dc',
  note: 'National online prices via the Walmart Affiliate API.',
  capabilities: { livePrices: true, checkout: true, storeSpecific: false },
  demo: { priceFactor: 1, storeBrand: 'Great Value', organicBrand: 'Marketside Organic', promoRate: 0.08 },
  searchUrl: (q) => `https://www.walmart.com/search?q=${encodeURIComponent(q)}`,

  isConfigured: (env) => !!(env.WALMART_CONSUMER_ID && env.WALMART_PRIVATE_KEY),

  async searchProducts(query, { env }) {
    type SearchResponse = { items?: WalmartItem[] };
    let data = await call<SearchResponse>(env, '/search', { query, numItems: '15', categoryId: FOOD_CATEGORY });
    if (!data.items?.length) data = await call<SearchResponse>(env, '/search', { query, numItems: '15' });
    return (data.items ?? []).map(mapWalmartItem).filter((p): p is Product => !!p);
  },

  async getPrice(productId, { env }) {
    const data = await call<{ items?: WalmartItem[] }>(env, '/items', { ids: productId });
    const item = data.items?.[0];
    return item ? mapWalmartItem(item) : null;
  },

  async checkout(items) {
    // Affiliate "add to cart" deep link: items=ID|QTY,ID|QTY
    const ids = items.filter((i) => i.productId && /^\d+$/.test(i.productId));
    if (!ids.length) throw new ProviderError('No live Walmart products to add to a cart.', 400);
    const list = ids.map((i) => `${i.productId}|${Math.max(1, Math.ceil(i.packs))}`).join(',');
    const url = new URL('https://affil.walmart.com/cart/addToCart');
    url.searchParams.set('items', list);
    return { url: url.toString() };
  },
};
