import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES } from '../shared/types';
import { createApi } from './app';

describe('POST /api/ideas', () => {
  const app = createApi();
  const call = (body: unknown) =>
    app.request('/api/ideas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, {});

  it('returns demo ideas without an API key', async () => {
    const res = await call({ request: 'cheap', preferences: DEFAULT_PREFERENCES, slot: 'lunch', count: 4, goals: ['high-protein'], avoid: [] });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ideas: { slot: string }[]; source: string };
    expect(body.source).toBe('demo');
    expect(body.ideas).toHaveLength(4);
    expect(body.ideas.every((m) => m.slot === 'lunch')).toBe(true);
  });

  it('rejects unknown goals', async () => {
    const res = await call({ request: '', preferences: DEFAULT_PREFERENCES, slot: 'lunch', count: 4, goals: ['free-food'], avoid: [] });
    expect(res.status).toBe(400);
  });
});
