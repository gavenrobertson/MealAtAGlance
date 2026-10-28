import type { MealRequest, MealSlot, PlanRequest, Preferences } from '../../shared/types';
import { DAY_LABELS, MEAL_SLOTS, UNITS } from '../../shared/types';

export const SYSTEM_PROMPT = `You are the meal-planning engine inside "Meal at a Glance", a weekly meal-prep planner that turns plans into priced grocery lists.

Your output feeds code that merges ingredients across recipes and matches them to store products, so the data has to be clean:
- Ingredient "name" is a canonical grocery-store name: lowercase, singular, no quantities or prep words ("yellow onion", "chicken breast", "greek yogurt", "canned diced tomatoes"). Put prep words ("diced", "minced") in "note". Use the same name every time an ingredient repeats across the week.
- Use only these units: ${UNITS.join(', ')}. Prefer how people shop: produce by "each"/"head"/"bunch", meat and fish by "lb" or "oz", liquids by "cup"/"tbsp"/"tsp", canned goods by "can", garlic by "clove".
- Quantities are for the meal's baseServings, which should equal the household servings you are given.
- Include pantry staples (oil, salt, spices) with realistic small amounts; the shopper marks what they already own.

Planning rules:
- Allergies are hard constraints. Never include an allergen or an ingredient that commonly contains it.
- Diet preferences and dislikes are hard constraints unless the user's request explicitly overrides them.
- Stay within the weekly grocery budget for the whole household. Reuse ingredients across meals (a bag of spinach, a pack of chicken) to cut cost and waste, and favor cook-once-eat-twice where it fits.
- Respect cooking-time limits: breakfast and lunch use the quick-meal limit; dinners use the max cook-time limit (prep + cook).
- Vary cuisines and proteins across the week; avoid repeating the same dinner.
- Macros are per serving and should be realistic estimates. Keep steps short (2-5 concise steps).
- Pick one fitting food emoji per meal.`;

function describePrefs(p: Preferences): string {
  const slots = MEAL_SLOTS.filter((s) => p.slots[s]);
  return [
    `Household servings per meal: ${p.householdServings}`,
    `Meals each day: ${slots.join(', ') || 'dinner'}`,
    `Diet: ${p.diets.join(', ') || 'no restrictions'}`,
    `Allergies (strict): ${p.allergies.join(', ') || 'none'}`,
    `Dislikes / avoid: ${p.dislikes.join(', ') || 'none'}`,
    `Favorite cuisines: ${p.cuisines.join(', ') || 'any'}`,
    `Weekly grocery budget: $${p.weeklyBudget} for the household`,
    `Max prep+cook time for dinners: ${p.maxCookMinutes} minutes`,
    `Quick-meal limit for breakfast and lunch: ${p.quickMealMinutes} minutes`,
  ].join('\n');
}

export function planUserPrompt(req: PlanRequest): string {
  const slots = MEAL_SLOTS.filter((s) => req.preferences.slots[s]);
  const locked = req.locked.length
    ? `\n\nThese meals are locked. Keep them exactly where they are (include them in your output unchanged) and plan the rest around them, reusing their ingredients where sensible:\n${req.locked
        .map((l) => `- ${DAY_LABELS[l.dayIndex]} ${l.slot}: ${l.meal.title} (${l.meal.ingredients.map((i) => i.name).join(', ')})`)
        .join('\n')}`
    : '';
  return `Plan 7 days (${DAY_LABELS.join(', ')}). Each day needs exactly these meals: ${slots.join(', ')}.

What I want this week:
"""${req.request.trim() || 'A balanced, tasty week of meals.'}"""

My preferences:
${describePrefs(req.preferences)}${locked}`;
}

export function mealUserPrompt(req: MealRequest): string {
  return `Create one ${req.slot} for ${DAY_LABELS[req.dayIndex]} that fits my week.
${req.hint ? `For this meal specifically: """${req.hint}"""\n` : ''}
The overall request for the week was:
"""${req.request.trim() || 'A balanced, tasty week of meals.'}"""

Do not repeat any of these meals already in the plan: ${req.avoid.join('; ') || 'none'}.

My preferences:
${describePrefs(req.preferences)}`;
}

export function slotLabel(slot: MealSlot) {
  return slot[0].toUpperCase() + slot.slice(1);
}
