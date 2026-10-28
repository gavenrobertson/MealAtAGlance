import { afterEach, describe, expect, it, vi } from 'vitest';
import { matchItems } from '.';
import { kroger } from './kroger';

afterEach(() => vi.unstubAllGlobals());

const env = { KROGER_CLIENT_ID: 'id', KROGER_CLIENT_SECRET: 'secret' };

describe('Kroger', () => {
  it('authenticates, finds the nearest store by ZIP, and maps promo prices', async () => {
    const seen: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL) => {
      const url = new URL(input);
      seen.push(url.pathname);
      if (url.pathname.endsWith('/token')) return Response.json({ access_token: 't', expires_in: 1800 });
      if (url.pathname.endsWith('/locations')) return Response.json({ data: [{ locationId: '01400943', name: 'Kroger', address: { city: 'Cincinnati' } }] });
      expect(url.searchParams.get('filter.locationId')).toBe('01400943');
      return Response.json({
        data: [{
          productId: '0001111060933', description: 'Kroger® Grade A Large White Eggs', brand: 'Kroger',
          images: [{ perspective: 'front', featured: true, sizes: [{ size: 'medium', url: 'https://img/eggs.jpg' }] }],
          items: [{ itemId: '1', size: '12 ct', soldBy: 'UNIT', price: { regular: 3.49, promo: 2.99 } }],
        }],
      });
    }));
    const res = await matchItems(kroger, [{ key: 'egg', query: 'egg', category: 'eggs' }], { env, zipCode: '45202' }, false);
    expect(res.mode).toBe('live');
    expect(res.store).toEqual({ id: '01400943', name: 'Kroger · Cincinnati' });
    expect(res.results.egg[0]).toMatchObject({ price: 2.99, regularPrice: 3.49, image: 'https://img/eggs.jpg', size: { dimension: 'count', amount: 12 } });
    expect(seen[0]).toMatch(/token$/);
  });

  it('falls back to estimates with a warning when no ZIP or store is set', async () => {
    const res = await matchItems(kroger, [{ key: 'egg', query: 'egg', category: 'eggs' }], { env }, false);
    expect(res.mode).toBe('demo');
    expect(res.warning).toMatch(/ZIP/);
    expect(res.results.egg.length).toBeGreaterThan(0);
  });
});
