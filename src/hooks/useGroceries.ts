import { useMemo } from 'react';
import type { Product } from '../../shared/types';
import { activeMeals, applyPantry, buildShoppingList, type NeedResult, type ShoppingItem } from '../../shared/list';
import { pickBestProduct, priceLine, round2, type PricedLine } from '../../shared/pricing';
import { usePantry } from '../store/pantry';
import { usePlan } from '../store/plan';
import { usePrefs } from '../store/prefs';
import { useShop } from '../store/shop';

export interface GroceryRow {
  item: ShoppingItem;
  need: NeedResult;
  /** Priced line per provider: for the remaining need, or (if owned) what it would have cost. */
  lines: Record<string, PricedLine | undefined>;
  candidates: Record<string, Product[] | undefined>;
  overridden: Record<string, boolean>;
}

export interface ProviderTotal {
  total: number;
  matched: number;
  missing: number;
  loading: boolean;
}

export interface Groceries {
  rows: GroceryRow[];
  totals: Record<string, ProviderTotal>;
  mealsPlanned: number;
  toBuy: number;
  owned: number;
  /** Value of pantry items at the active store. */
  pantrySavings: number;
}

export function useGroceries(): Groceries {
  const plan = usePlan((s) => s.plan);
  const slots = usePrefs((s) => s.prefs.slots);
  const pantry = usePantry((s) => s.entries);
  const { products, overrides, loading, config } = useShop();
  const provider = useShop((s) => s.provider);

  const items = useMemo(() => (plan ? buildShoppingList(plan, slots) : []), [plan, slots]);
  const mealsPlanned = useMemo(() => (plan ? [...activeMeals(plan, slots)].length : 0), [plan, slots]);

  return useMemo(() => {
    const providerIds = config?.providers.map((p) => p.id) ?? [provider];
    const totals: Record<string, ProviderTotal> = {};
    for (const id of providerIds) totals[id] = { total: 0, matched: 0, missing: 0, loading: !!loading[id] };
    let pantrySavings = 0;

    const rows = items.map((item): GroceryRow => {
      const need = applyPantry(item, pantry[item.key]);
      const row: GroceryRow = { item, need, lines: {}, candidates: {}, overridden: {} };
      for (const id of providerIds) {
        const candidates = products[id]?.[item.key];
        row.candidates[id] = candidates;
        const qty = need.need ?? item.total;
        const overrideId = overrides[id]?.[item.key];
        const chosen = overrideId ? candidates?.find((p) => p.id === overrideId) : undefined;
        const line = candidates ? (chosen ? priceLine(item.key, qty, chosen) : pickBestProduct(item.key, qty, candidates)) : undefined;
        row.lines[id] = line;
        row.overridden[id] = !!chosen;
        if (need.need) {
          if (line) {
            totals[id].total += line.cost;
            totals[id].matched++;
          } else totals[id].missing++;
        }
      }
      // What owning it saved, at the active store (full or partial pantry coverage).
      const full = products[provider]?.[item.key];
      if (need.owned !== 'none' && full) {
        const fullLine = pickBestProduct(item.key, item.total, full);
        const remaining = row.lines[provider]?.cost ?? 0;
        if (fullLine) pantrySavings += Math.max(0, fullLine.cost - (need.need ? remaining : 0));
      }
      return row;
    });

    for (const t of Object.values(totals)) t.total = round2(t.total);
    return {
      rows,
      totals,
      mealsPlanned,
      toBuy: rows.filter((r) => r.need.need).length,
      owned: rows.filter((r) => r.need.owned === 'all').length,
      pantrySavings: round2(pantrySavings),
    };
  }, [items, pantry, products, overrides, loading, config, provider, mealsPlanned]);
}
