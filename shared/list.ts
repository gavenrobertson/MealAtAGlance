import type { BaseQuantity, Category, MealSlot, Unit, WeekPlan } from './types';
import { MEAL_SLOTS } from './types';
import { canonicalName, compatible, convertFor, toBase } from './units';

export interface ItemSource {
  mealId: string;
  mealTitle: string;
  emoji: string;
  dayLabel: string;
  slot: MealSlot;
  quantity: BaseQuantity;
}

export interface ShoppingItem {
  key: string;
  name: string;
  category: Category;
  /** Merged total in the item's primary dimension. */
  total: BaseQuantity;
  /** Quantities that could not be converted into the primary dimension (rare). */
  extras: BaseQuantity[];
  sources: ItemSource[];
}

export function effectiveServings(plan: WeekPlan, dayIndex: number, slot: MealSlot): number {
  const day = plan.days[dayIndex];
  return day?.meals[slot]?.servings ?? day?.servings ?? plan.weekServings;
}

/** Iterate every active meal in the plan with its resolved servings. */
export function* activeMeals(plan: WeekPlan, slots: Record<MealSlot, boolean>) {
  for (let d = 0; d < plan.days.length; d++) {
    const day = plan.days[d];
    for (const slot of MEAL_SLOTS) {
      const planned = day.meals[slot];
      if (!slots[slot] || !planned) continue;
      yield { dayIndex: d, day, slot, planned, servings: effectiveServings(plan, d, slot) };
    }
  }
}

const DIM_PRIORITY: Record<BaseQuantity['dimension'], number> = { mass: 0, volume: 1, count: 2 };

/**
 * Combine every ingredient across the plan into one line per canonical ingredient,
 * scaling to the servings in effect and normalizing units so they can be summed.
 */
export function buildShoppingList(plan: WeekPlan, slots: Record<MealSlot, boolean>): ShoppingItem[] {
  const groups = new Map<string, { name: string; category: Category; sources: ItemSource[] }>();

  for (const { day, slot, planned, servings } of activeMeals(plan, slots)) {
    const { meal } = planned;
    const scale = servings / Math.max(1, meal.baseServings);
    for (const ing of meal.ingredients) {
      if (!(ing.quantity > 0)) continue;
      const key = canonicalName(ing.name);
      if (!key) continue;
      const group = groups.get(key) ?? { name: key, category: ing.category, sources: [] };
      group.sources.push({
        mealId: meal.id, mealTitle: meal.title, emoji: meal.emoji, dayLabel: day.label, slot,
        quantity: toBase(ing.quantity * scale, ing.unit),
      });
      groups.set(key, group);
    }
  }

  const items: ShoppingItem[] = [];
  for (const [key, group] of groups) {
    const { total, extras } = mergeQuantities(key, group.sources.map((s) => s.quantity));
    items.push({ key, name: group.name, category: group.category, total, extras, sources: group.sources });
  }
  return items.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}

export function mergeQuantities(key: string, quantities: BaseQuantity[]): { total: BaseQuantity; extras: BaseQuantity[] } {
  // Primary dimension: mass beats volume beats count, so "2 onions" + "200 g onion" lands on grams,
  // but only if the other quantities can actually be converted into it.
  const candidates = [...quantities].sort((a, b) => DIM_PRIORITY[a.dimension] - DIM_PRIORITY[b.dimension]);
  let best = { primary: quantities[0], converted: 0 };
  for (const cand of candidates) {
    const converted = quantities.filter((q) => convertFor(key, q, cand)).length;
    if (converted > best.converted) best = { primary: cand, converted };
    if (converted === quantities.length) break;
  }

  const total: BaseQuantity = { ...best.primary, amount: 0 };
  const extras: BaseQuantity[] = [];
  for (const q of quantities) {
    const c = convertFor(key, q, total);
    if (c) {
      total.amount += c.amount;
      continue;
    }
    const extra = extras.find((e) => compatible(e, q));
    if (extra) extra.amount += q.amount;
    else extras.push({ ...q });
  }
  return { total, extras };
}

// ---- Pantry ----

export type PantryEntry = { mode: 'all'; updatedAt: number } | { mode: 'partial'; quantity: number; unit: Unit; updatedAt: number };

export interface NeedResult {
  /** What still has to be bought; undefined when fully covered by the pantry. */
  need?: BaseQuantity;
  owned: 'none' | 'partial' | 'all';
  haveAmount?: BaseQuantity;
}

export function applyPantry(item: ShoppingItem, entry: PantryEntry | undefined): NeedResult {
  if (!entry) return { need: item.total, owned: 'none' };
  if (entry.mode === 'all') return { owned: 'all' };
  const have = convertFor(item.key, toBase(entry.quantity, entry.unit), item.total);
  if (!have) return { need: item.total, owned: 'none' };
  const remaining = item.total.amount - have.amount;
  if (remaining <= item.total.amount * 0.02) return { owned: 'all', haveAmount: have };
  return { need: { ...item.total, amount: remaining }, owned: 'partial', haveAmount: have };
}
