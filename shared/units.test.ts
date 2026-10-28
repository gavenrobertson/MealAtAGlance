import { describe, expect, it } from 'vitest';
import { canonicalName, formatQuantity, parseSize, toBase } from './units';
import { buildShoppingList, applyPantry, mergeQuantities } from './list';
import { priceLine, pickBestProduct } from './pricing';
import type { Meal, WeekPlan } from './types';

describe('canonicalName', () => {
  it.each([
    ['2 Large Yellow Onions, diced', 'yellow onion'],
    ['onions', 'yellow onion'],
    ['Boneless skinless chicken breasts', 'chicken breast'],
    ['cherry tomatoes', 'cherry tomato'],
    ['Garlic cloves (minced)', 'garlic'],
    ['scallions', 'green onion'],
    ['berries', 'berry'],
    ['chickpeas', 'chickpeas'],
    ['frozen peas', 'frozen peas'],
    ['whole milk', 'whole milk'],
  ])('%s -> %s', (raw, expected) => expect(canonicalName(raw)).toBe(expected));
});

describe('parseSize', () => {
  it('parses common retail sizes', () => {
    expect(parseSize('16 oz')).toMatchObject({ dimension: 'mass' });
    expect(parseSize('1 gal')?.dimension).toBe('volume');
    expect(parseSize('32 fl oz')?.dimension).toBe('volume');
    expect(parseSize('12 ct')).toEqual({ dimension: 'count', amount: 12, countUnit: 'each' });
    expect(parseSize('Large Eggs, 1 Dozen')?.amount).toBe(12);
    expect(parseSize('6 x 5.3 oz')!.amount).toBeCloseTo(6 * 5.3 * 28.3495, 1);
    expect(parseSize('2 lb bag')!.amount).toBeCloseTo(907.18, 1);
    expect(parseSize('nonsense')).toBeUndefined();
  });
});

describe('merging', () => {
  it('sums 2 lbs chicken + 12 oz chicken into one total', () => {
    const { total, extras } = mergeQuantities('chicken', [toBase(2, 'lb'), toBase(12, 'oz')]);
    expect(extras).toHaveLength(0);
    expect(formatQuantity(total)).toBe('2.75 lb');
  });
  it('converts counts to mass when the ingredient has a known weight', () => {
    const { total, extras } = mergeQuantities('yellow onion', [toBase(2, 'each'), toBase(200, 'g')]);
    expect(extras).toHaveLength(0);
    expect(total.dimension).toBe('mass');
    expect(total.amount).toBeCloseTo(500);
  });
  it('keeps unconvertible quantities as extras', () => {
    const { extras } = mergeQuantities('mystery sauce', [toBase(1, 'cup'), toBase(2, 'each')]);
    expect(extras).toHaveLength(1);
  });
});

const meal = (id: string, ingredients: Meal['ingredients']): Meal => ({
  id, slot: 'dinner', title: id, description: '', emoji: '🍽️', prepMinutes: 5, cookMinutes: 10,
  baseServings: 2, ingredients, steps: [], tags: [],
});

describe('buildShoppingList', () => {
  const plan: WeekPlan = {
    id: 'p', name: 'p', request: '', createdAt: 0, weekServings: 2, source: 'demo',
    days: [
      { label: 'Monday', meals: { dinner: { locked: false, meal: meal('a', [{ name: 'onions', quantity: 1, unit: 'each', category: 'produce' }]) } } },
      { label: 'Tuesday', servings: 4, meals: { dinner: { locked: false, meal: meal('b', [{ name: 'yellow onion, diced', quantity: 1, unit: 'each', category: 'produce' }]) } } },
      { label: 'Wednesday', meals: { lunch: { locked: false, meal: meal('c', [{ name: 'Onion', quantity: 1, unit: 'each', category: 'produce' }]) } } },
    ],
  };
  it('merges three recipes needing onions into one line and respects servings overrides', () => {
    const list = buildShoppingList(plan, { breakfast: true, lunch: true, dinner: true, snack: false });
    expect(list).toHaveLength(1);
    // Monday 1 + Tuesday doubled to 2 + Wednesday 1 = 4 onions
    expect(list[0].total).toEqual({ dimension: 'count', countUnit: 'each', amount: 4 });
    expect(list[0].sources).toHaveLength(3);
  });
  it('drops disabled meal slots', () => {
    const list = buildShoppingList(plan, { breakfast: true, lunch: false, dinner: true, snack: false });
    expect(list[0].total.amount).toBe(3);
  });
  it('applies partial pantry quantities', () => {
    const [item] = buildShoppingList(plan, { breakfast: true, lunch: true, dinner: true, snack: false });
    const r = applyPantry(item, { mode: 'partial', quantity: 1, unit: 'each', updatedAt: 0 });
    expect(r.owned).toBe('partial');
    expect(r.need!.amount).toBe(3);
    expect(applyPantry(item, { mode: 'all', updatedAt: 0 }).owned).toBe('all');
  });
});

describe('pricing', () => {
  const p = (id: string, name: string, price: number, sizeText: string) => ({ id, provider: 'x', name, price, sizeText, size: parseSize(sizeText) });
  it('buys enough packages to cover the need', () => {
    const line = priceLine('chicken breast', toBase(2.75, 'lb'), p('1', 'Chicken Breast', 9.97, '2.5 lb'));
    expect(line.packs).toBe(2);
    expect(line.cost).toBeCloseTo(19.94);
  });
  it('picks the cheapest relevant product for the need', () => {
    const best = pickBestProduct('chicken breast', toBase(3, 'lb'), [
      p('a', 'Chicken Broth', 1.5, '32 fl oz'),
      p('b', 'Chicken Breast Family Pack', 13.5, '3 lb'),
      p('c', 'Boneless Chicken Breast', 6.0, '1 lb'),
    ]);
    expect(best?.product.id).toBe('b');
  });
});

describe('can and slice conversions', () => {
  it('relates cans to package weights', () => {
    expect(canonicalName('diced tomatoes')).toBe('canned tomato');
    const line = priceLine('black beans', toBase(3, 'can'), { id: 'x', provider: 'x', name: 'Black Beans', price: 0.98, size: parseSize('15 oz') });
    expect(line.packs).toBe(3);
  });
});
