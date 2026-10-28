import { z } from 'zod';
import { CATEGORIES, DAY_LABELS, MEAL_SLOTS, UNITS } from '../../shared/types';

// JSON Schema handed to Claude via structured outputs, so the response is guaranteed parseable.
// (Structured outputs support a subset of JSON Schema: no numeric ranges, so ranges live in the prompt.)
const ingredientSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'quantity', 'unit', 'category', 'note'],
  properties: {
    name: { type: 'string', description: 'Canonical singular grocery name, lowercase, no prep words: "yellow onion", "chicken breast".' },
    quantity: { type: 'number', description: 'Amount for baseServings servings.' },
    unit: { type: 'string', enum: [...UNITS] },
    category: { type: 'string', enum: [...CATEGORIES] },
    note: { type: 'string', description: 'Prep detail like "diced", or empty string.' },
  },
} as const;

export const mealJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['slot', 'title', 'description', 'emoji', 'prepMinutes', 'cookMinutes', 'baseServings', 'ingredients', 'steps', 'macros', 'tags'],
  properties: {
    slot: { type: 'string', enum: [...MEAL_SLOTS] },
    title: { type: 'string' },
    description: { type: 'string', description: 'One appetizing sentence.' },
    emoji: { type: 'string', description: 'A single food emoji.' },
    prepMinutes: { type: 'integer' },
    cookMinutes: { type: 'integer' },
    baseServings: { type: 'integer' },
    ingredients: { type: 'array', items: ingredientSchema },
    steps: { type: 'array', items: { type: 'string' } },
    macros: {
      type: 'object',
      additionalProperties: false,
      required: ['calories', 'protein', 'carbs', 'fat'],
      properties: { calories: { type: 'number' }, protein: { type: 'number' }, carbs: { type: 'number' }, fat: { type: 'number' } },
    },
    tags: { type: 'array', items: { type: 'string' } },
  },
} as const;

export const planJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['planName', 'notes', 'days'],
  properties: {
    planName: { type: 'string', description: 'Short, fun name for the week, max 5 words.' },
    notes: { type: 'string', description: 'One or two sentences on how the plan meets the request (prep tips, shared ingredients).' },
    days: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['day', 'meals'],
        properties: { day: { type: 'string', enum: DAY_LABELS }, meals: { type: 'array', items: mealJsonSchema } },
      },
    },
  },
} as const;

export const singleMealJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['meal'],
  properties: { meal: mealJsonSchema },
} as const;

// Runtime validation (belt and braces: also guards against truncated output).
const ingredient = z.object({
  name: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.enum(UNITS),
  category: z.enum(CATEGORIES).catch('other'),
  note: z.string().optional(),
});

export const mealZ = z.object({
  slot: z.enum(MEAL_SLOTS),
  title: z.string().min(1),
  description: z.string(),
  emoji: z.string().catch('🍽️'),
  prepMinutes: z.number().int().nonnegative(),
  cookMinutes: z.number().int().nonnegative(),
  baseServings: z.number().int().positive(),
  ingredients: z.array(ingredient).min(1),
  steps: z.array(z.string()),
  macros: z.object({ calories: z.number(), protein: z.number(), carbs: z.number(), fat: z.number() }).optional(),
  tags: z.array(z.string()),
});

export const planZ = z.object({
  planName: z.string(),
  notes: z.string(),
  days: z.array(z.object({ day: z.enum(DAY_LABELS as [string, ...string[]]), meals: z.array(mealZ) })),
});
