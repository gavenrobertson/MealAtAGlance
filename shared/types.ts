// Domain types shared by the browser app and the API server.

export const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];

export const UNITS = [
  'g', 'kg', 'oz', 'lb', // mass
  'ml', 'l', 'tsp', 'tbsp', 'cup', 'fl_oz', 'pint', 'quart', 'gallon', // volume
  'each', 'clove', 'can', 'slice', 'bunch', 'head', 'pinch', // count-ish
] as const;
export type Unit = (typeof UNITS)[number];

export const CATEGORIES = [
  'produce', 'meat', 'seafood', 'dairy', 'eggs', 'bakery', 'pantry', 'grains', 'canned',
  'spices', 'condiments', 'frozen', 'snacks', 'beverages', 'other',
] as const;
export type Category = (typeof CATEGORIES)[number];

export interface Ingredient {
  /** Canonical, singular, lowercase grocery name: "yellow onion", "chicken breast". */
  name: string;
  quantity: number;
  unit: Unit;
  category: Category;
  /** Prep or detail that should not affect list merging: "diced", "room temperature". */
  note?: string;
}

export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Meal {
  id: string;
  slot: MealSlot;
  title: string;
  description: string;
  emoji: string;
  prepMinutes: number;
  cookMinutes: number;
  /** Servings the ingredient quantities are written for. */
  baseServings: number;
  ingredients: Ingredient[];
  steps: string[];
  /** Per serving. */
  macros?: Macros;
  tags: string[];
}

export interface PlannedMeal {
  meal: Meal;
  /** Per-meal servings override. */
  servings?: number;
  locked: boolean;
}

export interface DayPlan {
  label: string;
  /** Per-day servings override. */
  servings?: number;
  meals: Partial<Record<MealSlot, PlannedMeal>>;
}

export interface WeekPlan {
  id: string;
  name: string;
  request: string;
  createdAt: number;
  notes?: string;
  weekServings: number;
  days: DayPlan[];
  source: 'ai' | 'demo';
}

export const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const DIETS = [
  'vegetarian', 'vegan', 'pescatarian', 'keto', 'low-carb', 'high-protein', 'gluten-free', 'dairy-free', 'mediterranean',
] as const;
export const ALLERGENS = ['peanuts', 'tree nuts', 'shellfish', 'fish', 'eggs', 'dairy', 'soy', 'gluten', 'sesame'] as const;

export interface Preferences {
  householdServings: number;
  slots: Record<MealSlot, boolean>;
  diets: string[];
  allergies: string[];
  dislikes: string[];
  cuisines: string[];
  weeklyBudget: number;
  maxCookMinutes: number;
  /** Separate, tighter limit for weekday lunches/breakfasts. */
  quickMealMinutes: number;
  units: 'us' | 'metric';
  zipCode: string;
}

export const DEFAULT_PREFERENCES: Preferences = {
  householdServings: 2,
  slots: { breakfast: true, lunch: true, dinner: true, snack: false },
  diets: [],
  allergies: [],
  dislikes: [],
  cuisines: [],
  weeklyBudget: 120,
  maxCookMinutes: 45,
  quickMealMinutes: 15,
  units: 'us',
  zipCode: '',
};

// ---- Store / pricing ----

export type ProviderId = string;

export type Dimension = 'mass' | 'volume' | 'count';

/** A quantity in base units: grams, millilitres, or a named count ("each", "can", "clove"...). */
export interface BaseQuantity {
  dimension: Dimension;
  amount: number;
  /** For count dimension only: what is being counted. */
  countUnit?: string;
}

export interface Product {
  id: string;
  provider: ProviderId;
  name: string;
  brand?: string;
  price: number;
  regularPrice?: number;
  sizeText?: string;
  size?: BaseQuantity;
  /** Product sold by weight: price is per `size` (e.g. per lb). */
  soldByWeight?: boolean;
  image?: string;
  emoji?: string;
  url?: string;
  inStock?: boolean;
  /** Price is an estimate rather than a live quote. */
  estimated?: boolean;
}

export interface ProviderInfo {
  id: ProviderId;
  name: string;
  /** Brand-ish accent used for the switcher chip. */
  color: string;
  /** True when keys are configured and live calls will be made. */
  live: boolean;
  /** Short notes shown in the UI, e.g. "Prices are estimates". */
  note?: string;
  capabilities: { livePrices: boolean; checkout: boolean; storeSpecific: boolean };
}

export interface MatchRequestItem {
  key: string;
  query: string;
  category: Category;
}

export interface MatchResponse {
  provider: ProviderId;
  mode: 'live' | 'demo';
  results: Record<string, Product[]>;
  errors?: Record<string, string>;
  store?: { id: string; name: string };
  /** Why live prices could not be used (e.g. missing ZIP for a store-specific provider). */
  warning?: string;
}

export interface CheckoutItem {
  name: string;
  quantity: number;
  unit: string;
  productId?: string;
  packs: number;
}

// ---- API payloads ----

export interface LockedMeal {
  dayIndex: number;
  slot: MealSlot;
  meal: Meal;
}

export interface PlanRequest {
  request: string;
  preferences: Preferences;
  /** Meals the user locked; the planner keeps these and plans around them. */
  locked: LockedMeal[];
}

export interface MealRequest {
  request: string;
  preferences: Preferences;
  dayIndex: number;
  slot: MealSlot;
  /** Titles already in the week, to keep variety. */
  avoid: string[];
  /** Optional nudge for this one meal ("something lighter"). */
  hint?: string;
}

export interface GeneratedPlan {
  planName: string;
  notes: string;
  source: 'ai' | 'demo';
  days: Array<Partial<Record<MealSlot, Meal>>>;
}

export type PlanStreamEvent =
  | { type: 'progress'; days: number; message?: string }
  | { type: 'plan'; plan: GeneratedPlan }
  | { type: 'error'; error: string };
