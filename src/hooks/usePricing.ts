import { useEffect } from 'react';
import type { ShoppingItem } from '../../shared/list';
import { api } from '../lib/api';
import { usePrefs } from '../store/prefs';
import { useShop } from '../store/shop';
import { toast } from '../store/toast';

const RETRY_AFTER_MS = 30_000;
const failedAt = new Map<string, number>();

/**
 * Keeps product candidates loaded for every list item at every store, so switching stores
 * and comparing totals is instant. Only fetches items a store hasn't seen yet.
 */
export function usePricing(items: ShoppingItem[]) {
  const config = useShop((s) => s.config);
  const loadingSig = useShop((s) => Object.entries(s.loading).filter(([, v]) => v).map(([k]) => k).join(','));
  const demoData = usePrefs((s) => s.demoData);
  const zip = usePrefs((s) => s.prefs.zipCode);
  const keys = items.map((i) => i.key).join('|');

  useEffect(() => {
    if (!config || !items.length) return;
    const sig = `${demoData}:${zip}`;
    if (useShop.getState().cacheSig !== sig) useShop.getState().resetProducts(sig);

    const timer = setTimeout(() => {
      for (const p of config.providers) {
        const state = useShop.getState();
        if (state.loading[p.id] || Date.now() - (failedAt.get(p.id) ?? 0) < RETRY_AFTER_MS) continue;
        const have = state.products[p.id] ?? {};
        const missing = items.filter((i) => !have[i.key]);
        if (!missing.length) continue;
        state.setLoading(p.id, true);
        api
          .match(p.id, missing.map((i) => ({ key: i.key, query: i.name, category: i.category })), zip, demoData)
          .then((res) => {
            // Drop responses for a stale demo/ZIP setting.
            if (useShop.getState().cacheSig === sig) useShop.getState().mergeProducts(p.id, res);
          })
          .catch((err) => {
            failedAt.set(p.id, Date.now());
            toast(`${p.name}: ${(err as Error).message}`, 'error');
          })
          .finally(() => useShop.getState().setLoading(p.id, false));
      }
    }, 250);
    return () => clearTimeout(timer);
    // `items` is captured via `keys`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys, config, demoData, zip, loadingSig]);
}
