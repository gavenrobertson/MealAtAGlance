import { AlertTriangle, ClipboardCopy, ExternalLink, Loader2, Printer, ShoppingCart } from 'lucide-react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import type { CheckoutItem } from '../../../shared/types';
import { formatQuantity } from '../../../shared/units';
import type { Groceries, GroceryRow } from '../../hooks/useGroceries';
import { api } from '../../lib/api';
import { CATEGORY_META, CATEGORY_ORDER, money, titleCase } from '../../lib/format';
import { usePlan } from '../../store/plan';
import { usePrefs } from '../../store/prefs';
import { useShop } from '../../store/shop';
import { toast } from '../../store/toast';
import { Button } from '../ui/Button';
import { GroceryItemRow } from './GroceryItemRow';
import { PantryPanel } from './PantryPanel';
import { ProviderSwitcher } from './ProviderSwitcher';
import { SwapSheet } from './SwapSheet';
import { checkoutQuantity } from './checkout';

interface Props {
  groceries: Groceries;
  onGoToPlan: () => void;
  onOpenPrefs: () => void;
}

export function GroceriesView({ groceries, onGoToPlan, onOpenPrefs }: Props) {
  const plan = usePlan((s) => s.plan);
  const units = usePrefs((s) => s.prefs.units);
  const zip = usePrefs((s) => s.prefs.zipCode);
  const provider = useShop((s) => s.provider);
  const info = useShop((s) => s.config?.providers.find((p) => p.id === provider));
  const meta = useShop((s) => s.meta[provider]);
  const [swapKey, setSwapKey] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);

  const { toBuy, owned } = useMemo(() => {
    const order = (r: GroceryRow) => CATEGORY_ORDER.indexOf(r.item.category);
    const sorted = [...groceries.rows].sort((a, b) => order(a) - order(b) || a.item.name.localeCompare(b.item.name));
    const groups = new Map<string, GroceryRow[]>();
    for (const r of sorted.filter((r) => r.need.owned !== 'all')) groups.set(r.item.category, [...(groups.get(r.item.category) ?? []), r]);
    return { toBuy: [...groups.entries()], owned: sorted.filter((r) => r.need.owned === 'all') };
  }, [groceries.rows]);

  if (!plan) {
    return (
      <div className="card mx-auto mt-8 max-w-lg p-8 text-center">
        <div className="text-5xl">🛒</div>
        <h2 className="mt-3 text-xl font-extrabold">Your list is empty</h2>
        <p className="mt-1 text-sm text-muted">Generate a week of meals and every ingredient lands here, merged and priced.</p>
        <Button variant="primary" className="mt-5" onClick={onGoToPlan}>Plan my week</Button>
      </div>
    );
  }

  const linesToBuy = groceries.rows.filter((r) => r.need.need && r.lines[provider]);

  const copyList = async () => {
    const text = toBuy
      .map(([cat, rows]) => `${CATEGORY_META[cat]?.label ?? cat}\n${rows.map((r) => {
        const line = r.lines[provider];
        return `☐ ${formatQuantity(r.need.need ?? r.item.total, units)} ${r.item.name}${line ? ` · ${line.product.name} ×${Math.ceil(line.packs)} (${money(line.cost)})` : ''}`;
      }).join('\n')}`)
      .join('\n\n');
    await navigator.clipboard.writeText(`${plan.name} · ${info?.name ?? ''} est. ${money(groceries.totals[provider]?.total ?? 0)}\n\n${text}`);
    toast('Shopping list copied', 'success');
  };

  const sendToStore = async () => {
    setCheckingOut(true);
    try {
      const items: CheckoutItem[] = linesToBuy.map((r) => {
        const line = r.lines[provider]!;
        return { name: r.item.name, ...checkoutQuantity(r.need.need!), productId: line.product.estimated ? undefined : line.product.id, packs: line.packs };
      });
      const { url } = await api.checkout(provider, items, zip);
      window.open(url, '_blank', 'noopener');
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setCheckingOut(false);
    }
  };

  const swapRow = groceries.rows.find((r) => r.item.key === swapKey);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">Shopping list</h1>
          <p className="text-sm text-muted">
            {groceries.rows.length} ingredients from {groceries.mealsPlanned} meals, merged into one list. Tap the circle for anything you already have.
          </p>
        </div>
        <div className="no-print flex flex-wrap gap-1.5">
          <Button size="sm" variant="ghost" onClick={copyList}><ClipboardCopy size={14} /> Copy</Button>
          <Button size="sm" variant="ghost" onClick={() => window.print()}><Printer size={14} /> Print</Button>
          <Button
            size="sm"
            variant="primary"
            onClick={sendToStore}
            disabled={!info?.capabilities.checkout || checkingOut || !linesToBuy.length}
            title={info?.capabilities.checkout ? undefined : `Add ${info?.name ?? 'store'} API keys to send your cart`}
          >
            {checkingOut ? <Loader2 size={14} className="animate-spin" /> : <ShoppingCart size={14} />}
            {provider === 'instacart' ? 'Send to Instacart' : `Add to ${info?.name ?? 'store'} cart`}
            <ExternalLink size={12} className="opacity-70" />
          </Button>
        </div>
      </div>

      <ProviderSwitcher groceries={groceries} />

      {meta?.warning && (
        <button onClick={onOpenPrefs} className="flex w-full items-center gap-3 rounded-2xl border border-butter-300 bg-butter-100 px-4 py-3 text-left text-sm font-medium text-butter-800 dark:border-butter-400/30 dark:bg-butter-400/10 dark:text-butter-300">
          <AlertTriangle size={17} className="shrink-0" />
          <span className="flex-1">{meta.warning} Showing estimates for now.</span>
          <span className="font-bold underline">Open preferences</span>
        </button>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <LayoutGroup>
          <div className="space-y-4">
            {toBuy.length === 0 && (
              <div className="card p-8 text-center">
                <div className="text-4xl">🎉</div>
                <div className="mt-2 font-extrabold">You have everything!</div>
                <p className="text-sm text-muted">Nothing left to buy for this week.</p>
              </div>
            )}
            {toBuy.map(([cat, rows]) => (
              <section key={cat} className="card overflow-hidden">
                <h2 className="flex items-center gap-2 border-b border-line bg-surface-2/50 px-4 py-2.5 text-sm font-extrabold">
                  <span>{CATEGORY_META[cat]?.emoji}</span>
                  {CATEGORY_META[cat]?.label ?? titleCase(cat)}
                  <span className="font-semibold text-muted">· {rows.length}</span>
                </h2>
                <ul className="divide-y divide-line">
                  <AnimatePresence initial={false}>
                    {rows.map((r) => (
                      <GroceryItemRow key={r.item.key} row={r} provider={provider} onSwap={() => setSwapKey(r.item.key)} />
                    ))}
                  </AnimatePresence>
                </ul>
              </section>
            ))}

            {owned.length > 0 && (
              <section className="card overflow-hidden opacity-95">
                <h2 className="flex items-center gap-2 border-b border-line bg-avocado-100/40 px-4 py-2.5 text-sm font-extrabold dark:bg-avocado-400/5">
                  ✅ Already in your pantry <span className="font-semibold text-muted">· {owned.length}</span>
                  {groceries.pantrySavings > 0 && (
                    <span className="ml-auto text-xs font-bold text-avocado-600 dark:text-avocado-400">saving ~{money(groceries.pantrySavings)}</span>
                  )}
                </h2>
                <ul className="divide-y divide-line">
                  <AnimatePresence initial={false}>
                    {owned.map((r) => (
                      <GroceryItemRow key={r.item.key} row={r} provider={provider} onSwap={() => setSwapKey(r.item.key)} />
                    ))}
                  </AnimatePresence>
                </ul>
              </section>
            )}
          </div>
        </LayoutGroup>

        <motion.aside layout className="no-print space-y-4 lg:sticky lg:top-20">
          <PantryPanel groceries={groceries} />
        </motion.aside>
      </div>

      <SwapSheet row={swapRow} provider={provider} onClose={() => setSwapKey(null)} />
    </div>
  );
}
