import { afterEach, describe, expect, it, vi } from 'vitest';
import { DAY_LABELS, DEFAULT_PREFERENCES } from '../../shared/types';
import { claudePlan } from './claude';

afterEach(() => vi.unstubAllGlobals());

const meal = (slot: string, title: string) => ({
  slot, title, description: 'Tasty.', emoji: '🍗', prepMinutes: 10, cookMinutes: 20, baseServings: 2,
  ingredients: [{ name: 'chicken breast', quantity: 1, unit: 'lb', category: 'meat', note: 'sliced' }],
  steps: ['Cook it.'], macros: { calories: 500, protein: 40, carbs: 30, fat: 15 }, tags: ['high-protein'],
});

/** Minimal Messages API SSE stream that emits `text` in a few deltas. */
function sse(text: string, stopReason = 'end_turn') {
  const chunks = text.match(/[\s\S]{1,400}/g)!;
  const events = [
    { type: 'message_start', message: { id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-opus-5-5', content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 1 } } },
    { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
    ...chunks.map((t) => ({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: t } })),
    { type: 'content_block_stop', index: 0 },
    { type: 'message_delta', delta: { stop_reason: stopReason, stop_sequence: null }, usage: { output_tokens: 100 } },
    { type: 'message_stop' },
  ];
  const body = events.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join('');
  return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } });
}

describe('claudePlan', () => {
  it('requests structured JSON with refusal fallbacks and turns it into a plan', async () => {
    let request: { headers: Headers; body: Record<string, any> } | undefined;
    const planJson = {
      planName: 'Protein Week',
      notes: 'Batch-cook chicken on Sunday.',
      days: DAY_LABELS.map((day, i) => ({ day, meals: [meal('dinner', `Dinner ${i}`), meal('snack', 'Not enabled')] })),
    };
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
      request = { headers: new Headers(init.headers), body: JSON.parse(init.body as string) };
      return sse(JSON.stringify(planJson));
    }));

    const progress: number[] = [];
    const plan = await claudePlan({ ANTHROPIC_API_KEY: 'sk-test' }, { request: 'high protein', preferences: DEFAULT_PREFERENCES, locked: [] }, (d) => progress.push(d));

    expect(request!.body.model).toBe('claude-opus-5-5');
    expect(request!.body.fallbacks).toBe('default');
    expect(request!.headers.get('anthropic-beta')).toContain('server-side-fallback-2026-07-01');
    expect(request!.body.output_config.format.type).toBe('json_schema');
    expect(request!.body.stream).toBe(true);
    expect(plan.planName).toBe('Protein Week');
    expect(plan.days[3].dinner?.title).toBe('Dinner 3');
    expect(plan.days[3].dinner?.ingredients[0]).toMatchObject({ name: 'chicken breast', unit: 'lb', note: 'sliced' });
    expect(plan.days[0].snack).toBeUndefined(); // snack slot is off by default
    expect(progress.at(-1)).toBe(7);
  });

  it('surfaces refusals as a friendly error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => sse('{}', 'refusal')));
    await expect(claudePlan({ ANTHROPIC_API_KEY: 'sk-test' }, { request: '', preferences: DEFAULT_PREFERENCES, locked: [] }, () => {})).rejects.toThrow(/declined/);
  });
});
