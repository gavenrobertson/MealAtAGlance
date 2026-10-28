import type { BaseQuantity } from '../../../shared/types';

/** Express a needed quantity in units a store's list API understands. */
export function checkoutQuantity(q: BaseQuantity): { quantity: number; unit: string } {
  const r = (n: number) => Math.max(0.25, Math.round(n * 4) / 4);
  if (q.dimension === 'mass') {
    const oz = q.amount / 28.3495;
    return oz >= 16 ? { quantity: r(oz / 16), unit: 'lb' } : { quantity: r(oz), unit: 'oz' };
  }
  if (q.dimension === 'volume') {
    const cups = q.amount / 236.588;
    return cups >= 0.25 ? { quantity: r(cups), unit: 'cup' } : { quantity: r(q.amount / 4.929), unit: 'tsp' };
  }
  return { quantity: Math.ceil(q.amount), unit: q.countUnit ?? 'each' };
}
