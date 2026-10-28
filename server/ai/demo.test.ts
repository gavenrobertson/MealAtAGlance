import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES } from '../../shared/types';
import { RECIPES } from '../data/recipes';
import { demoMeal, demoPlan } from './demo';

const proteinOf = (title: string) => RECIPES.find((r) => r.title === title)!;

describe('demo planner', () => {
  it('honors "no seafood" and fills every enabled slot for 7 days', () => {
    const plan = demoPlan({ request: 'high-protein, no seafood, quick lunches, ~$120 budget', preferences: DEFAULT_PREFERENCES, locked: [] });
    expect(plan.days).toHaveLength(7);
    for (const day of plan.days) {
      expect(Object.keys(day).sort()).toEqual(['breakfast', 'dinner', 'lunch']);
      for (const meal of Object.values(day)) expect(['fish', 'shellfish']).not.toContain(proteinOf(meal!.title).protein);
    }
  });

  it('honors allergies and diets from preferences', () => {
    const prefs = { ...DEFAULT_PREFERENCES, diets: ['vegetarian'], allergies: ['dairy'] };
    const plan = demoPlan({ request: '', preferences: prefs, locked: [] });
    for (const day of plan.days) for (const meal of Object.values(day)) {
      const r = proteinOf(meal!.title);
      expect(['chicken', 'turkey', 'beef', 'pork', 'fish', 'shellfish']).not.toContain(r.protein);
      expect(r.allergens).not.toContain('dairy');
    }
  });

  it('keeps locked meals in place and avoids repeats when swapping one meal', () => {
    const first = demoPlan({ request: '', preferences: DEFAULT_PREFERENCES, locked: [] });
    const locked = { dayIndex: 2, slot: 'dinner' as const, meal: first.days[0].dinner! };
    const next = demoPlan({ request: '', preferences: DEFAULT_PREFERENCES, locked: [locked] });
    expect(next.days[2].dinner).toBe(locked.meal);
    const swapped = demoMeal({ request: '', preferences: DEFAULT_PREFERENCES, dayIndex: 0, slot: 'dinner', avoid: [first.days[0].dinner!.title] });
    expect(swapped.title).not.toBe(first.days[0].dinner!.title);
    expect(swapped.slot).toBe('dinner');
  });
});
