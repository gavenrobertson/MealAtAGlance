import type { BaseQuantity, Product } from './types';
import { convertFor } from './units';

export interface PricedLine {
  product: Product;
  /** Packages to buy (fractional only for sold-by-weight items). */
  packs: number;
  cost: number;
  /** True when we could not relate package size to the needed quantity and assumed one pack. */
  sizeUnknown: boolean;
}

export function priceLine(key: string, need: BaseQuantity, product: Product): PricedLine {
  if (!product.size) return { product, packs: 1, cost: product.price, sizeUnknown: true };
  const converted = convertFor(key, need, product.size);
  if (!converted) return { product, packs: 1, cost: product.price, sizeUnknown: true };
  const ratio = converted.amount / product.size.amount;
  if (product.soldByWeight) {
    const packs = Math.max(ratio, 0.25);
    return { product, packs, cost: round2(packs * product.price), sizeUnknown: false };
  }
  // 3% tolerance so 16.2 oz needed against a 16 oz bag doesn't force a second bag.
  const packs = Math.max(1, Math.ceil(ratio - 0.03));
  return { product, packs, cost: round2(packs * product.price), sizeUnknown: false };
}

const STOP = new Set(['and', 'or', 'of', 'the', 'a', 'with', 'fresh']);

function tokens(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((t) => t && !STOP.has(t));
}

/** 0..1: share of query words that appear in the product name (with naive plural matching). */
export function relevance(query: string, productName: string): number {
  const q = tokens(query);
  if (!q.length) return 0;
  const name = new Set(tokens(productName).flatMap((t) => [t, t.replace(/(es|s)$/, '')]));
  const hits = q.filter((t) => name.has(t) || name.has(t.replace(/(es|s)$/, ''))).length;
  return hits / q.length;
}

/**
 * Choose the default product: among the most relevant results, the one that covers the
 * need for the least money. Ties go to the store's own ranking order.
 */
export function pickBestProduct(key: string, need: BaseQuantity, products: Product[]): PricedLine | undefined {
  const available = products.filter((p) => p.inStock !== false && p.price > 0);
  if (!available.length) return undefined;
  const scored = available.map((p, i) => ({ p, i, rel: relevance(key, p.name) }));
  const top = Math.max(...scored.map((s) => s.rel));
  const pool = scored.filter((s) => s.rel >= top - 0.001 && s.rel > 0).slice(0, 6);
  const candidates = pool.length ? pool : scored.slice(0, 3);
  let best: PricedLine | undefined;
  for (const { p } of candidates) {
    const line = priceLine(key, need, p);
    // Penalize unknown sizes slightly so a measurable product wins when prices are close.
    const effective = line.cost * (line.sizeUnknown ? 1.15 : 1);
    const bestEffective = best ? best.cost * (best.sizeUnknown ? 1.15 : 1) : Infinity;
    if (effective < bestEffective) best = line;
  }
  return best;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
