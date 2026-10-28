import type { MealSlot } from '../../shared/types';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
export const money = (n: number) => usd.format(n);

export const SLOT_META: Record<MealSlot, { label: string; emoji: string; tone: string; dot: string; text: string }> = {
  breakfast: { label: 'Breakfast', emoji: '☀️', tone: 'bg-butter-100 text-butter-800 dark:bg-butter-400/15 dark:text-butter-300', dot: 'bg-butter-400', text: 'text-butter-800 dark:text-butter-300' },
  lunch: { label: 'Lunch', emoji: '🥗', tone: 'bg-avocado-100 text-avocado-800 dark:bg-avocado-400/15 dark:text-avocado-300', dot: 'bg-avocado-500', text: 'text-avocado-600 dark:text-avocado-400' },
  dinner: { label: 'Dinner', emoji: '🍲', tone: 'bg-tomato-100 text-tomato-700 dark:bg-tomato-500/15 dark:text-tomato-300', dot: 'bg-tomato-500', text: 'text-tomato-600 dark:text-tomato-400' },
  snack: { label: 'Snack', emoji: '🍪', tone: 'bg-berry-100 text-berry-700 dark:bg-berry-400/15 dark:text-berry-300', dot: 'bg-berry-500', text: 'text-berry-500 dark:text-berry-300' },
};

export const CATEGORY_META: Record<string, { label: string; emoji: string }> = {
  produce: { label: 'Produce', emoji: '🥬' }, meat: { label: 'Meat', emoji: '🥩' }, seafood: { label: 'Seafood', emoji: '🐟' },
  dairy: { label: 'Dairy & chilled', emoji: '🧀' }, eggs: { label: 'Eggs', emoji: '🥚' }, bakery: { label: 'Bakery', emoji: '🍞' },
  grains: { label: 'Grains & pasta', emoji: '🌾' }, canned: { label: 'Canned & jarred', emoji: '🥫' }, pantry: { label: 'Pantry', emoji: '🫙' },
  condiments: { label: 'Sauces & spreads', emoji: '🍯' }, spices: { label: 'Spices', emoji: '🧂' }, frozen: { label: 'Frozen', emoji: '🧊' },
  snacks: { label: 'Snacks', emoji: '🍿' }, beverages: { label: 'Drinks', emoji: '🧃' }, other: { label: 'Other', emoji: '🛒' },
};

export const CATEGORY_ORDER = ['produce', 'meat', 'seafood', 'eggs', 'dairy', 'bakery', 'grains', 'canned', 'condiments', 'pantry', 'spices', 'frozen', 'snacks', 'beverages', 'other'];

export const titleCase = (s: string) => s.replace(/\b[a-z]/g, (c) => c.toUpperCase());

export const uid = () => (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)).slice(0, 12);
