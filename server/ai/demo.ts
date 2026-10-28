import type { GeneratedPlan, IdeasRequest, Meal, MealRequest, MealSlot, PlanRequest, Preferences } from '../../shared/types';
import { DAY_LABELS, MEAL_SLOTS } from '../../shared/types';
import { RECIPES, type Allergen, type DemoRecipe, type Protein } from '../data/recipes';
import { newMealId } from './claude';

/**
 * Offline planner used when no ANTHROPIC_API_KEY is configured (or demo mode is on).
 * Picks from a hand-written recipe library while honoring diets, allergies, time, and budget,
 * so the whole app works end to end with no keys.
 */
interface Constraints {
  allergens: Set<Allergen>;
  proteins: Set<Protein>;
  dislikes: string[];
  prefer: Set<string>;
  quickMinutes: number;
  dinnerMinutes: number;
  targetCostPerServing: number;
  /** Favor the cheapest recipes. */
  cheap: boolean;
}

const MEAT: Protein[] = ['chicken', 'turkey', 'beef', 'pork'];

function deriveConstraints(prefs: Preferences, text: string): Constraints {
  const t = text.toLowerCase();
  const c: Constraints = {
    allergens: new Set(prefs.allergies as Allergen[]),
    proteins: new Set(),
    dislikes: prefs.dislikes.map((d) => d.toLowerCase()),
    prefer: new Set(),
    quickMinutes: prefs.quickMealMinutes,
    dinnerMinutes: prefs.maxCookMinutes,
    targetCostPerServing: 0,
    cheap: false,
  };
  const diets = new Set(prefs.diets);
  const has = (re: RegExp) => re.test(t);

  if (diets.has('vegan') || has(/\bvegan\b|plant[- ]based/)) {
    [...MEAT, 'fish', 'shellfish', 'eggs', 'dairy'].forEach((p) => c.proteins.add(p as Protein));
    c.allergens.add('dairy').add('eggs');
  }
  if (diets.has('vegetarian') || has(/vegetarian|meatless/)) [...MEAT, 'fish', 'shellfish'].forEach((p) => c.proteins.add(p as Protein));
  if (diets.has('pescatarian') || has(/pescatarian/)) MEAT.forEach((p) => c.proteins.add(p));
  if (diets.has('gluten-free') || has(/gluten[- ]free/)) c.allergens.add('gluten');
  if (diets.has('dairy-free') || has(/dairy[- ]free|no dairy/)) c.allergens.add('dairy');
  if (has(/no (sea ?food|fish)/)) c.proteins.add('fish').add('shellfish');
  if (has(/no (shellfish|shrimp)/)) c.proteins.add('shellfish');
  if (has(/no pork/)) c.proteins.add('pork');
  if (has(/no (beef|red meat)/)) c.proteins.add('beef').add('pork');
  if (has(/no chicken/)) c.proteins.add('chicken');
  if (has(/no eggs?\b/)) c.allergens.add('eggs');
  if (has(/no nuts?\b|nut[- ]free/)) c.allergens.add('peanuts').add('tree nuts');

  for (const d of prefs.diets) c.prefer.add(d);
  if (has(/high[- ]protein|protein/)) c.prefer.add('high-protein');
  if (has(/low[- ]carb|keto/)) c.prefer.add('low-carb');
  if (has(/quick|fast|easy|simple/)) c.prefer.add('quick');
  if (has(/meal[- ]prep|batch/)) c.prefer.add('meal-prep');
  if (has(/cheap|low[- ]cost|budget|inexpensive|frugal/)) c.cheap = true;

  const budget = Number(t.match(/\$\s?(\d{2,4})/)?.[1]) || prefs.weeklyBudget;
  const mealsPerDay = Math.max(1, MEAL_SLOTS.filter((s) => prefs.slots[s]).length);
  c.targetCostPerServing = budget / (7 * mealsPerDay * Math.max(1, prefs.householdServings));
  return c;
}

function eligible(r: DemoRecipe, c: Constraints): boolean {
  if (c.proteins.has(r.protein)) return false;
  if (r.allergens.some((a) => c.allergens.has(a))) return false;
  const names = r.ingredients.map((i) => i.name).join(' ') + ' ' + r.title.toLowerCase();
  return !c.dislikes.some((d) => d && names.includes(d));
}

function score(r: DemoRecipe, c: Constraints, rand: () => number): number {
  let s = rand() * 1.5;
  for (const tag of r.tags) if (c.prefer.has(tag)) s += 3.5;
  const total = r.prepMinutes + r.cookMinutes;
  const limit = r.slot === 'dinner' ? c.dinnerMinutes : c.quickMinutes;
  if (total > limit) s -= ((total - limit) / Math.max(10, limit)) * 3;
  if (c.cheap) s += Math.max(0, 3 - r.costPerServing) * 1.5;
  if (r.costPerServing > c.targetCostPerServing * 1.25) s -= (r.costPerServing / c.targetCostPerServing - 1) * 3;
  return s;
}

function seeded(seed: number) {
  let x = seed || 1;
  return () => ((x = (x * 1664525 + 1013904223) % 4294967296) / 4294967296);
}

function toMeal(r: DemoRecipe): Meal {
  const { protein: _p, allergens: _a, costPerServing, ...meal } = r;
  return { ...structuredClone(meal), estCostPerServing: costPerServing, id: newMealId() };
}

/** How many distinct recipes to rotate per slot: real meal-preppers repeat lunches and breakfasts. */
const ROTATION: Record<MealSlot, number> = { breakfast: 3, lunch: 4, dinner: 7, snack: 3 };

function rank(slot: MealSlot, c: Constraints, rand: () => number, exclude: Set<string>): DemoRecipe[] {
  const pool = RECIPES.filter((r) => r.slot === slot && !exclude.has(r.title));
  const strict = pool.filter((r) => eligible(r, c));
  // If constraints wipe out a slot, fall back to the closest matches rather than an empty day.
  const usable = strict.length ? strict : pool;
  return usable.map((r) => ({ r, s: score(r, c, rand) })).sort((a, b) => b.s - a.s).map((x) => x.r);
}

export function demoPlan(req: PlanRequest): GeneratedPlan {
  const c = deriveConstraints(req.preferences, req.request);
  const rand = seeded(Date.now() % 100000);
  const days: GeneratedPlan['days'] = DAY_LABELS.map(() => ({}));
  const lockedTitles = new Set(req.locked.map((l) => l.meal.title));

  for (const slot of MEAL_SLOTS) {
    if (!req.preferences.slots[slot]) continue;
    const ranked = rank(slot, c, rand, lockedTitles).slice(0, ROTATION[slot]);
    if (!ranked.length) continue;
    for (let d = 0; d < 7; d++) days[d][slot] = toMeal(ranked[d % ranked.length]);
  }
  for (const l of req.locked) days[l.dayIndex][l.slot] = l.meal;

  const flavor = c.prefer.has('high-protein') ? 'High-Protein' : c.prefer.has('quick') ? 'Speedy' : c.prefer.has('vegan') ? 'Plant-Powered' : c.prefer.has('vegetarian') ? 'Veggie-Forward' : 'Feel-Good';
  return {
    planName: `${flavor} Prep Week`,
    notes: 'Demo plan from the built-in recipe library. Lunches and breakfasts rotate so you can batch-prep on Sunday. Add an Anthropic API key for fully custom AI plans.',
    source: 'demo',
    days,
  };
}

export function demoMeal(req: MealRequest): Meal {
  const c = deriveConstraints(req.preferences, `${req.request} ${req.hint ?? ''}`);
  const ranked = rank(req.slot, c, Math.random, new Set(req.avoid));
  const pick = ranked[Math.floor(Math.random() * Math.min(3, ranked.length))] ?? RECIPES.find((r) => r.slot === req.slot)!;
  return toMeal(pick);
}

const GOAL_WORDS: Record<IdeasRequest['goals'][number], string> = {
  'low-cost': 'cheap', 'high-protein': 'high-protein', 'meal-prep': 'meal prep', quick: 'quick',
};

/** Best-matching library recipes for one slot that the user hasn't seen yet. */
export function demoIdeas(req: IdeasRequest): Meal[] {
  const c = deriveConstraints(req.preferences, `${req.request} ${req.goals.map((g) => GOAL_WORDS[g]).join(' ')}`);
  return rank(req.slot, c, seeded(Date.now() % 100000), new Set(req.avoid)).slice(0, req.count).map(toMeal);
}
