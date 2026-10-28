import type { BaseQuantity, Dimension, Unit } from './types';

// Base units: grams for mass, millilitres for volume.
const MASS: Partial<Record<Unit, number>> = { g: 1, kg: 1000, oz: 28.3495, lb: 453.592 };
const VOLUME: Partial<Record<Unit, number>> = {
  ml: 1, l: 1000, tsp: 4.92892, tbsp: 14.7868, cup: 236.588, fl_oz: 29.5735,
  pint: 473.176, quart: 946.353, gallon: 3785.41,
};

export function unitDimension(unit: Unit): Dimension {
  if (unit in MASS) return 'mass';
  if (unit in VOLUME) return 'volume';
  return 'count';
}

export function toBase(quantity: number, unit: Unit): BaseQuantity {
  if (MASS[unit]) return { dimension: 'mass', amount: quantity * MASS[unit]! };
  if (VOLUME[unit]) return { dimension: 'volume', amount: quantity * VOLUME[unit]! };
  if (unit === 'pinch') return { dimension: 'volume', amount: quantity * 0.3 };
  return { dimension: 'count', amount: quantity, countUnit: unit };
}

export function fromBase(q: BaseQuantity, unit: Unit): number {
  if (q.dimension === 'mass' && MASS[unit]) return q.amount / MASS[unit]!;
  if (q.dimension === 'volume' && VOLUME[unit]) return q.amount / VOLUME[unit]!;
  return q.amount;
}

/** Can two base quantities be added or compared directly? */
export function compatible(a: BaseQuantity, b: BaseQuantity): boolean {
  if (a.dimension !== b.dimension) return false;
  return a.dimension !== 'count' || a.countUnit === b.countUnit;
}

// ---- Ingredient-specific conversions ----
// Approximate grams per "each" (or per named count) so "2 onions" + "200 g onion" merge into one line.
const EACH_GRAMS: Record<string, Record<string, number>> = {
  'yellow onion': { each: 150 }, 'red onion': { each: 150 }, 'white onion': { each: 150 }, onion: { each: 150 },
  'green onion': { each: 15, bunch: 100 }, shallot: { each: 40 },
  garlic: { clove: 5, head: 50, each: 50 },
  tomato: { each: 120 }, 'roma tomato': { each: 65 }, 'cherry tomato': { each: 15 },
  potato: { each: 210 }, 'sweet potato': { each: 180 }, carrot: { each: 60 }, celery: { each: 40, bunch: 450, head: 450 },
  'bell pepper': { each: 150 }, 'red bell pepper': { each: 150 }, 'green bell pepper': { each: 150 },
  zucchini: { each: 200 }, cucumber: { each: 300 }, avocado: { each: 150 }, banana: { each: 120 },
  apple: { each: 180 }, lemon: { each: 100 }, lime: { each: 65 }, orange: { each: 150 },
  'chicken breast': { each: 225 }, 'chicken thigh': { each: 115 }, 'salmon fillet': { each: 170 },
  broccoli: { each: 350, head: 350 }, cauliflower: { each: 600, head: 600 }, 'romaine lettuce': { each: 300, head: 300 },
  spinach: { bunch: 300 }, kale: { bunch: 200 }, cilantro: { bunch: 60 }, parsley: { bunch: 60 }, basil: { bunch: 30 },
  mushroom: { each: 18 }, jalapeno: { each: 15 }, ginger: { each: 30 }, clementine: { each: 75 },
  tuna: { can: 142 }, 'water chestnut': { can: 227 }, 'coconut milk': { can: 400 },
  'cheddar cheese': { slice: 21 }, 'swiss cheese': { slice: 21 }, 'deli turkey': { slice: 28 },
};

// Fallbacks when an ingredient has no specific entry: a standard 15 oz can, a sandwich-bread slice.
const GENERIC_COUNT_GRAMS: Record<string, number> = { can: 425, slice: 28 };

// Density in g/ml for staples that recipes measure by volume but stores sell by weight.
const DENSITY: Record<string, number> = {
  'all-purpose flour': 0.53, flour: 0.53, sugar: 0.85, 'brown sugar': 0.9, rice: 0.85, 'brown rice': 0.85,
  'jasmine rice': 0.85, quinoa: 0.72, 'rolled oats': 0.36, oats: 0.36, 'shredded cheese': 0.45,
  'cheddar cheese': 0.45, 'mozzarella cheese': 0.45, 'parmesan cheese': 0.4, 'feta cheese': 0.55,
  'greek yogurt': 1.03, yogurt: 1.03, butter: 0.96, 'peanut butter': 1.08, 'almond butter': 1.08, honey: 1.42,
  'black beans': 0.75, chickpeas: 0.75, lentils: 0.8, spinach: 0.13, 'baby spinach': 0.13, kale: 0.1,
  'frozen peas': 0.6, 'frozen corn': 0.6, 'cherry tomato': 0.6, blueberries: 0.6, blueberry: 0.6, strawberry: 0.6,
  pasta: 0.4, 'cottage cheese': 1.0, 'cream cheese': 1.0, walnuts: 0.4, almonds: 0.6, 'chia seeds': 0.65,
  'ground beef': 0.95, 'ground turkey': 0.95, granola: 0.45, salsa: 1.05, hummus: 1.05,
  'sour cream': 1.0, tahini: 0.95, pesto: 0.95, 'frozen mixed berry': 0.6, 'pineapple chunk': 0.7, crouton: 0.12,
  'bread crumbs': 0.45, 'kalamata olive': 0.6, 'dark chocolate chip': 0.7, 'mixed greens': 0.05, salt: 1.2,
  cornstarch: 0.5, ginger: 0.4, 'dijon mustard': 1.0, 'sesame seeds': 0.6, 'frozen edamame': 0.6, 'marinara sauce': 1.05,
  'coconut milk': 1.0, 'penne pasta': 0.4, spaghetti: 0.4,
};

export function ingredientEachGrams(name: string, countUnit: string): number | undefined {
  return EACH_GRAMS[name]?.[countUnit] ?? GENERIC_COUNT_GRAMS[countUnit];
}

/**
 * Convert `q` into the dimension of `target` for a given ingredient if we know how.
 * Returns undefined when no sensible conversion exists.
 */
export function convertFor(name: string, q: BaseQuantity, target: BaseQuantity): BaseQuantity | undefined {
  if (compatible(q, target)) return q;
  const grams = toGrams(name, q);
  if (grams === undefined) return undefined;
  if (target.dimension === 'mass') return { dimension: 'mass', amount: grams };
  if (target.dimension === 'volume' && DENSITY[name]) return { dimension: 'volume', amount: grams / DENSITY[name] };
  if (target.dimension === 'count' && target.countUnit) {
    const each = EACH_GRAMS[name]?.[target.countUnit];
    if (each) return { dimension: 'count', countUnit: target.countUnit, amount: grams / each };
  }
  return undefined;
}

function toGrams(name: string, q: BaseQuantity): number | undefined {
  if (q.dimension === 'mass') return q.amount;
  if (q.dimension === 'volume') return DENSITY[name] ? q.amount * DENSITY[name] : undefined;
  const each = q.countUnit ? ingredientEachGrams(name, q.countUnit) : undefined;
  return each ? q.amount * each : undefined;
}

// ---- Name canonicalization ----

const PREP_WORDS = new Set([
  'fresh', 'freshly', 'chopped', 'diced', 'minced', 'sliced', 'shredded', 'grated', 'large', 'medium', 'small',
  'boneless', 'skinless', 'raw', 'cooked', 'finely', 'roughly', 'thinly', 'peeled', 'ripe', 'organic',
  'crushed', 'packed', 'divided', 'optional', 'to', 'taste', 'trimmed', 'halved', 'cubed', 'softened', 'melted',
  'extra-large', 'jumbo', 'uncooked', 'dry', 'low-sodium', 'reduced-sodium',
]);

const ALIASES: Record<string, string> = {
  scallion: 'green onion', 'spring onion': 'green onion', onion: 'yellow onion',
  'garlic clove': 'garlic', 'clove garlic': 'garlic', 'garlic head': 'garlic',
  'chicken breast fillet': 'chicken breast', 'chicken breast half': 'chicken breast',
  'chicken thigh fillet': 'chicken thigh', 'extra virgin olive oil': 'olive oil', evoo: 'olive oil',
  'egg white': 'egg', 'large egg': 'egg', eggs: 'egg', 'plain greek yogurt': 'greek yogurt',
  'nonfat greek yogurt': 'greek yogurt', 'baby spinach': 'spinach',
  'kosher salt': 'salt', 'sea salt': 'salt', pepper: 'black pepper',
  'ground black pepper': 'black pepper', 'old fashioned oats': 'rolled oats', 'old-fashioned oats': 'rolled oats',
  tamari: 'soy sauce',
  'cherry tomatoes': 'cherry tomato', 'grape tomato': 'cherry tomato', 'chickpea': 'chickpeas',
  'garbanzo bean': 'chickpeas', 'black bean': 'black beans', 'ground beef 90/10': 'ground beef',
  'lean ground beef': 'ground beef', 'ground cumin': 'cumin', 'ground cinnamon': 'cinnamon',
  'ground turmeric': 'turmeric', 'ground ginger': 'ground ginger', 'fresh ginger': 'ginger', 'ginger root': 'ginger',
  'diced tomatoes': 'canned tomato', 'canned diced tomatoes': 'canned tomato', 'crushed tomatoes': 'canned tomato', 'lean ground turkey': 'ground turkey', 'shredded mozzarella': 'mozzarella cheese',
  'shredded cheddar': 'cheddar cheese', 'cheddar': 'cheddar cheese', parmesan: 'parmesan cheese',
  feta: 'feta cheese', 'whole wheat tortilla': 'tortilla', 'flour tortilla': 'tortilla', 'corn tortilla': 'corn tortilla',
  'blueberries': 'blueberry', 'strawberries': 'strawberry', 'raspberries': 'raspberry',
};

const IRREGULAR_SINGULAR: Record<string, string> = {
  tomatoes: 'tomato', potatoes: 'potato', leaves: 'leaf', loaves: 'loaf', berries: 'berry',
  chickpeas: 'chickpeas', lentils: 'lentils', oats: 'oats', 'black beans': 'black beans',
  molasses: 'molasses', asparagus: 'asparagus', hummus: 'hummus', couscous: 'couscous', swiss: 'swiss',
  greens: 'greens', noodles: 'noodles', 'rolled oats': 'rolled oats', 'chia seeds': 'chia seeds',
  'sesame seeds': 'sesame seeds', walnuts: 'walnuts', almonds: 'almonds', pecans: 'pecans', cashews: 'cashews',
  'red pepper flakes': 'red pepper flakes', 'bread crumbs': 'bread crumbs', panko: 'panko', peas: 'peas',
};

function singularizeWord(word: string): string {
  if (IRREGULAR_SINGULAR[word]) return IRREGULAR_SINGULAR[word];
  if (word.length <= 3 || word.endsWith('ss') || word.endsWith('us') || word.endsWith('is')) return word;
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (/(ches|shes|xes|zes|oes)$/.test(word)) return word.slice(0, -2);
  if (word.endsWith('s')) return word.slice(0, -1);
  return word;
}

/** Normalize an ingredient name into a merge key: "2 Large Yellow Onions, diced" -> "yellow onion". */
export function canonicalName(raw: string): string {
  let name = raw.toLowerCase().replace(/\(.*?\)/g, ' ').split(',')[0];
  name = name.replace(/[^a-z0-9/\-\s]/g, ' ').replace(/\s+/g, ' ').trim();
  // Leading quantities sometimes leak into names ("2 large onions").
  name = name.replace(/^([\d/.\-]+\s+)+/, '');
  if (ALIASES[name]) return ALIASES[name];
  const irregular = IRREGULAR_SINGULAR[name];
  if (irregular) return ALIASES[irregular] ?? irregular;
  const words = name.split(' ').filter(Boolean);
  const kept = words.filter((w) => !PREP_WORDS.has(w));
  const phrase = (kept.length ? kept : words).join(' ');
  if (ALIASES[phrase]) return ALIASES[phrase];
  if (IRREGULAR_SINGULAR[phrase]) return IRREGULAR_SINGULAR[phrase];
  // Singularize only the head noun (last word).
  const parts = phrase.split(' ');
  parts[parts.length - 1] = singularizeWord(parts[parts.length - 1]);
  const singular = parts.join(' ');
  return ALIASES[singular] ?? singular;
}

// ---- Product size parsing ----

const SIZE_UNITS: Array<[RegExp, (n: number) => BaseQuantity]> = [
  [/^(fl\.?\s*oz|fluid\s*ounces?)$/, (n) => ({ dimension: 'volume', amount: n * VOLUME.fl_oz! })],
  [/^(oz|ounces?|onz)$/, (n) => ({ dimension: 'mass', amount: n * MASS.oz! })],
  [/^(lbs?|pounds?|#)$/, (n) => ({ dimension: 'mass', amount: n * MASS.lb! })],
  [/^(g|grams?|gr)$/, (n) => ({ dimension: 'mass', amount: n })],
  [/^(kg|kilograms?)$/, (n) => ({ dimension: 'mass', amount: n * 1000 })],
  [/^(ml|milliliters?|millilitres?)$/, (n) => ({ dimension: 'volume', amount: n })],
  [/^(l|liters?|litres?|lt)$/, (n) => ({ dimension: 'volume', amount: n * 1000 })],
  [/^(gal|gallons?)$/, (n) => ({ dimension: 'volume', amount: n * VOLUME.gallon! })],
  [/^(qt|quarts?)$/, (n) => ({ dimension: 'volume', amount: n * VOLUME.quart! })],
  [/^(pt|pints?)$/, (n) => ({ dimension: 'volume', amount: n * VOLUME.pint! })],
  [/^(ct|count|pk|pack|each|ea|pcs?|pieces?)$/, (n) => ({ dimension: 'count', amount: n, countUnit: 'each' })],
  [/^(dozen|dz)$/, (n) => ({ dimension: 'count', amount: n * 12, countUnit: 'each' })],
  [/^(bunch|bunches)$/, (n) => ({ dimension: 'count', amount: n, countUnit: 'bunch' })],
  [/^(heads?)$/, (n) => ({ dimension: 'count', amount: n, countUnit: 'head' })],
  [/^(cans?)$/, (n) => ({ dimension: 'count', amount: n, countUnit: 'can' })],
];

/**
 * Parse retail size strings: "16 oz", "1 gal", "12 ct", "2 lb bag", "6 x 5.3 oz", "1.5L", "dozen".
 * Multipacks ("6 x 5.3 oz", "4 pk / 15 oz") multiply out.
 */
export function parseSize(text: string | undefined | null): BaseQuantity | undefined {
  if (!text) return undefined;
  const s = text.toLowerCase().replace(/,/g, '').trim();
  if (/^(a\s+)?dozen\b/.test(s)) return { dimension: 'count', amount: 12, countUnit: 'each' };

  const multi = s.match(/(\d+)\s*(?:x|pk|pack|ct)\s*(?:\/\s*)?(\d*\.?\d+)\s*([a-z.# ]+?)\b(?:\s|$)/);
  if (multi) {
    const one = matchUnit(parseFloat(multi[2]), multi[3]);
    if (one && one.dimension !== 'count') return { ...one, amount: one.amount * parseInt(multi[1], 10) };
  }
  const re = /(\d*\.?\d+)\s*-?\s*(fl\.?\s*oz|fluid\s*ounces?|[a-z#]+)/g;
  for (const m of s.matchAll(re)) {
    const q = matchUnit(parseFloat(m[1]), m[2]);
    if (q) return q;
  }
  return undefined;
}

function matchUnit(n: number, unitText: string): BaseQuantity | undefined {
  if (!Number.isFinite(n) || n <= 0) return undefined;
  const u = unitText.trim().replace(/\.$/, '');
  for (const [re, make] of SIZE_UNITS) if (re.test(u)) return make(n);
  return undefined;
}

// ---- Display ----

const FRACTIONS: Array<[number, string]> = [[0.25, '¼'], [0.333, '⅓'], [0.5, '½'], [0.667, '⅔'], [0.75, '¾']];

export function prettyNumber(n: number): string {
  if (n >= 10) return String(Math.round(n));
  const whole = Math.floor(n);
  const frac = n - whole;
  if (frac < 0.08) return String(whole || (n > 0 ? '<1' : 0));
  if (frac > 0.92) return String(whole + 1);
  for (const [v, glyph] of FRACTIONS) if (Math.abs(frac - v) < 0.07) return whole ? `${whole}${glyph}` : glyph;
  return n.toFixed(1).replace(/\.0$/, '');
}

const COUNT_LABEL: Record<string, [string, string]> = {
  each: ['', ''], clove: ['clove', 'cloves'], can: ['can', 'cans'], slice: ['slice', 'slices'],
  bunch: ['bunch', 'bunches'], head: ['head', 'heads'],
};

/** Human-friendly quantity in US or metric units. */
export function formatQuantity(q: BaseQuantity, system: 'us' | 'metric' = 'us'): string {
  if (q.dimension === 'count') {
    const [one, many] = COUNT_LABEL[q.countUnit ?? 'each'] ?? [q.countUnit ?? '', q.countUnit ?? ''];
    const n = q.amount < 1 ? q.amount : Math.ceil(q.amount * 4 - 0.15) / 4;
    const label = n <= 1 ? one : many;
    return `${prettyNumber(n)}${label ? ' ' + label : ''}`;
  }
  if (q.dimension === 'mass') {
    if (system === 'metric') return q.amount >= 1000 ? `${(q.amount / 1000).toFixed(2).replace(/\.?0+$/, '')} kg` : `${Math.round(q.amount)} g`;
    const oz = q.amount / MASS.oz!;
    return oz < 16 ? `${prettyNumber(oz)} oz` : `${(oz / 16).toFixed(2).replace(/\.?0+$/, '')} lb`;
  }
  if (system === 'metric') return q.amount >= 1000 ? `${(q.amount / 1000).toFixed(2).replace(/\.?0+$/, '')} L` : `${Math.round(q.amount)} ml`;
  const ml = q.amount;
  if (ml < VOLUME.tbsp! - 0.5) return `${prettyNumber(ml / VOLUME.tsp!)} tsp`;
  if (ml < VOLUME.cup! / 4 - 0.5) return `${prettyNumber(ml / VOLUME.tbsp!)} tbsp`;
  if (ml < VOLUME.gallon! / 2) return `${prettyNumber(ml / VOLUME.cup!)} cup${ml > VOLUME.cup! * 1.1 ? 's' : ''}`;
  return `${(ml / VOLUME.gallon!).toFixed(2).replace(/\.?0+$/, '')} gal`;
}
