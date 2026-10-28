import { generateKeyPairSync, verify } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { matchItems } from '.';
import type { Env } from '../env';
import { mapWalmartItem, walmart, walmartHeaders } from './walmart';

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

// .env files usually hold the PEM on one line with literal \n escapes.
const env: Env = { WALMART_CONSUMER_ID: 'consumer-123', WALMART_KEY_VERSION: '2', WALMART_PRIVATE_KEY: privateKey.replace(/\n/g, '\\n') };

const item = (over: Record<string, unknown> = {}) => ({
  itemId: 10450114, name: 'Great Value Large White Eggs, 12 Count', salePrice: 3.24, msrp: 3.48,
  mediumImage: 'https://i5.walmartimages.com/eggs.jpeg', productTrackingUrl: 'https://goto.walmart.com/c/1/eggs', stock: 'Available', ...over,
});

afterEach(() => vi.unstubAllGlobals());

describe('Walmart signing', () => {
  it('signs consumerId\\ntimestamp\\nkeyVersion\\n with SHA256withRSA', async () => {
    const h = await walmartHeaders(env, '1700000000000');
    expect(h['WM_CONSUMER.ID']).toBe('consumer-123');
    expect(h['WM_SEC.KEY_VERSION']).toBe('2');
    expect(h['WM_CONSUMER.INTIMESTAMP']).toBe('1700000000000');
    const ok = verify('sha256', Buffer.from('consumer-123\n1700000000000\n2\n'), publicKey, Buffer.from(h['WM_SEC.AUTH_SIGNATURE'], 'base64'));
    expect(ok).toBe(true);
  });

  it('explains how to convert a PKCS#1 key', async () => {
    const pkcs1 = generateKeyPairSync('rsa', { modulusLength: 1024, privateKeyEncoding: { type: 'pkcs1', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } }).privateKey;
    await expect(walmartHeaders({ ...env, WALMART_PRIVATE_KEY: pkcs1 })).rejects.toThrow(/openssl pkcs8/);
  });
});

describe('Walmart product mapping', () => {
  it('maps price, sale, size, image and link', () => {
    const p = mapWalmartItem(item())!;
    expect(p).toMatchObject({ id: '10450114', price: 3.24, regularPrice: 3.48, image: 'https://i5.walmartimages.com/eggs.jpeg', inStock: true });
    expect(p.size).toEqual({ dimension: 'count', amount: 12, countUnit: 'each' });
  });
  it('handles per-lb produce and items without a price', () => {
    const p = mapWalmartItem(item({ name: 'Fresh Roma Tomato, per lb', salePrice: 1.27, msrp: undefined }))!;
    expect(p.soldByWeight).toBe(true);
    expect(p.size?.dimension).toBe('mass');
    expect(mapWalmartItem(item({ salePrice: undefined }))).toBeNull();
  });
});

describe('Walmart search', () => {
  it('calls the affiliate search API with signed headers, retrying without the Food filter', async () => {
    const calls: Array<{ url: URL; headers: Record<string, string> }> = [];
    vi.stubGlobal('fetch', vi.fn(async (url: URL, init: RequestInit) => {
      calls.push({ url: new URL(url), headers: init.headers as Record<string, string> });
      const items = calls.length === 1 ? [] : [item()];
      return new Response(JSON.stringify({ items }), { status: 200 });
    }));
    const products = await walmart.searchProducts('eggs', { env });
    expect(calls[0].url.pathname).toBe('/api-proxy/service/affil/product/v2/search');
    expect(calls[0].url.searchParams.get('query')).toBe('eggs');
    expect(calls[0].url.searchParams.get('categoryId')).toBe('976759');
    expect(calls[1].url.searchParams.has('categoryId')).toBe(false);
    expect(calls[0].headers['WM_SEC.AUTH_SIGNATURE']).toBeTruthy();
    expect(products).toHaveLength(1);
  });

  it('serves live results through the registry and falls back to estimates per item on errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: URL) => {
      const q = new URL(url).searchParams.get('query');
      if (q === 'saffron') return new Response('rate limited', { status: 429 });
      return new Response(JSON.stringify({ items: [item()] }), { status: 200 });
    }));
    const res = await matchItems(walmart, [
      { key: 'egg', query: 'egg', category: 'eggs' },
      { key: 'saffron', query: 'saffron', category: 'spices' },
    ], { env }, false);
    expect(res.mode).toBe('live');
    expect(res.results.egg[0].id).toBe('10450114');
    expect(res.results.saffron[0].estimated).toBe(true);
    expect(res.errors?.saffron).toMatch(/429/);
  });

  it('builds an affiliate add-to-cart link from live item ids', async () => {
    const { url } = await walmart.checkout!([{ name: 'egg', quantity: 12, unit: 'each', productId: '10450114', packs: 2 }], { env });
    expect(url).toBe('https://affil.walmart.com/cart/addToCart?items=10450114%7C2');
  });
});
