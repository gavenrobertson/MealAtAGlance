import type { Category, Product } from '../../shared/types';
import { parseSize } from '../../shared/units';
import { searchCatalog, type CatalogEntry, type CatalogVariant } from '../data/catalog';
import type { StoreProvider } from './types';

// Deterministic 0..1 hash so the same product always has the same demo price.
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function shelfPrice(base: number, factor: number, seed: string): number {
  const jitter = 1 + (hash01(seed) - 0.5) * 0.12; // ±6%
  const raw = Math.max(0.25, base * factor * jitter);
  // Retail-style endings: x.x8 / x.x7
  return Math.max(0.18, Math.floor(raw * 10) / 10 + (hash01(seed + 'c') > 0.5 ? 0.08 : 0.07));
}

function toProduct(p: Pick<StoreProvider, 'id' | 'demo' | 'searchUrl'>, entry: Pick<CatalogEntry, 'emoji' | 'key'>, [label, size, price, tier, w]: CatalogVariant): Product {
  const { storeBrand, organicBrand, priceFactor, promoRate = 0 } = p.demo;
  const name =
    tier === 's' ? `${storeBrand} ${label}`
    : tier === 'o' ? `${organicBrand} ${label.replace(/^Organic\s+/i, '')}`
    : label;
  const seed = `${p.id}:${name}:${size}`;
  const shelf = shelfPrice(price, priceFactor, seed);
  const onSale = hash01(seed + 'promo') < promoRate;
  return {
    id: `${p.id}-demo-${slug(name)}-${slug(size)}`,
    provider: p.id,
    name,
    brand: tier === 's' ? storeBrand : tier === 'o' ? organicBrand : undefined,
    price: onSale ? Math.round(shelf * 0.85 * 100) / 100 : shelf,
    regularPrice: onSale ? shelf : undefined,
    sizeText: w ? `per ${size.replace(/^1\s+/, '')}` : size,
    size: parseSize(size),
    soldByWeight: !!w,
    emoji: entry.emoji,
    url: p.searchUrl(label),
    inStock: true,
    estimated: true,
  };
}

const FALLBACK: Record<Category, [size: string, price: number, emoji: string]> = {
  produce: ['1 lb', 2.48, '🥬'], meat: ['1 lb', 6.98, '🥩'], seafood: ['1 lb', 9.98, '🐟'], dairy: ['16 oz', 3.48, '🧀'],
  eggs: ['12 ct', 3.24, '🥚'], bakery: ['16 oz', 2.98, '🍞'], pantry: ['16 oz', 3.48, '🫙'], grains: ['16 oz', 2.28, '🌾'],
  canned: ['15 oz', 1.28, '🥫'], spices: ['2 oz', 2.48, '🧂'], condiments: ['12 oz', 2.98, '🫙'], frozen: ['16 oz', 3.28, '🧊'],
  snacks: ['10 oz', 3.48, '🍿'], beverages: ['64 fl oz', 3.28, '🧃'], other: ['1 ct', 3.98, '🛒'],
};

const titleCase = (s: string) => s.replace(/\b[a-z]/g, (c) => c.toUpperCase());

/** Realistic mock search used when a store has no keys (or demo mode is on). */
export function demoSearch(p: Pick<StoreProvider, 'id' | 'demo' | 'searchUrl'>, query: string, category: Category = 'other'): Product[] {
  const entries = searchCatalog(query);
  if (entries.length) return entries.flatMap((entry) => entry.variants.map((v) => toProduct(p, entry, v)));
  // Unknown ingredient: synthesize a plausible store-brand and name-brand product from its category.
  const [size, price, emoji] = FALLBACK[category] ?? FALLBACK.other;
  const label = titleCase(query);
  const entry = { key: query, emoji };
  return [toProduct(p, entry, [label, size, price, 's']), toProduct(p, entry, [`Premium ${label}`, size, price * 1.45, 'n'])];
}
