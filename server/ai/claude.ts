import Anthropic from '@anthropic-ai/sdk';
import type { GeneratedPlan, Meal, MealRequest, MealSlot, PlanRequest } from '../../shared/types';
import { DAY_LABELS } from '../../shared/types';
import type { Env } from '../env';
import { SYSTEM_PROMPT, mealUserPrompt, planUserPrompt } from './prompt';
import { mealZ, planJsonSchema, planZ, singleMealJsonSchema } from './schema';

const DEFAULT_MODEL = 'claude-opus-5-5';

export class PlannerError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message);
  }
}

function client(env: Env) {
  return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
}

export const newMealId = () => `m_${crypto.randomUUID().slice(0, 8)}`;

/**
 * Stream a structured JSON response. `onText` sees the accumulated text so callers can report progress.
 * Uses server-side refusal fallbacks so a safety-classifier false positive retries on another model
 * instead of failing the request.
 */
async function streamJson(env: Env, schema: Record<string, unknown>, userPrompt: string, effort: 'low' | 'medium' | 'high', onText?: (text: string) => void) {
  const stream = client(env).beta.messages.stream({
    model: env.CLAUDE_MODEL || DEFAULT_MODEL,
    max_tokens: 64000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: SYSTEM_PROMPT,
    output_config: { effort: env.CLAUDE_EFFORT || effort, format: { type: 'json_schema', schema } },
    messages: [{ role: 'user', content: userPrompt }],
  });

  let text = '';
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      text += event.delta.text;
      onText?.(text);
    }
  }
  const message = await stream.finalMessage();
  if (message.stop_reason === 'refusal') throw new PlannerError('The meal planner declined this request. Try rephrasing it.', 422);
  if (message.stop_reason === 'max_tokens') throw new PlannerError('The plan was cut off before it finished. Try fewer meals per day.', 502);
  const body = message.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new PlannerError('The planner returned malformed JSON.', 502);
  }
}

function toMeal(raw: ReturnType<typeof mealZ.parse>, slot?: MealSlot): Meal {
  return {
    ...raw,
    id: newMealId(),
    slot: slot ?? raw.slot,
    ingredients: raw.ingredients.map((i) => ({ ...i, note: i.note || undefined })),
  };
}

export async function claudePlan(env: Env, req: PlanRequest, onProgress: (days: number) => void): Promise<GeneratedPlan> {
  let reported = 0;
  const json = await streamJson(env, planJsonSchema, planUserPrompt(req), 'medium', (text) => {
    // Each completed day object starts with "day": — a cheap, good-enough progress signal.
    const days = (text.match(/"day"\s*:/g) ?? []).length;
    if (days !== reported) onProgress((reported = days));
  });
  const parsed = planZ.safeParse(json);
  if (!parsed.success) throw new PlannerError(`Plan did not match the expected shape: ${parsed.error.issues[0]?.message}`);

  const days: GeneratedPlan['days'] = DAY_LABELS.map(() => ({}));
  for (const day of parsed.data.days) {
    const idx = DAY_LABELS.indexOf(day.day);
    for (const m of day.meals) if (req.preferences.slots[m.slot]) days[idx][m.slot] = toMeal(m);
  }
  // Locked meals always win, exactly as the user had them.
  for (const l of req.locked) days[l.dayIndex][l.slot] = l.meal;
  return { planName: parsed.data.planName, notes: parsed.data.notes, source: 'ai', days };
}

export async function claudeMeal(env: Env, req: MealRequest): Promise<Meal> {
  const json = await streamJson(env, singleMealJsonSchema, mealUserPrompt(req), 'low');
  const parsed = mealZ.safeParse((json as { meal?: unknown })?.meal);
  if (!parsed.success) throw new PlannerError(`Meal did not match the expected shape: ${parsed.error.issues[0]?.message}`);
  return toMeal(parsed.data, req.slot);
}
