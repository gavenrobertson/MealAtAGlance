import clsx from 'clsx';
import { Loader2, MapPin, Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import type { Groceries } from '../../hooks/useGroceries';
import { money } from '../../lib/format';
import { usePrefs } from '../../store/prefs';
import { useShop } from '../../store/shop';
import { AnimatedNumber } from '../ui/AnimatedNumber';

/**
 * Store switcher that doubles as a side-by-side price comparison:
 * each segment shows that store's total for the same list.
 */
export function ProviderSwitcher({ groceries }: { groceries: Groceries }) {
  const { provider, setProvider, config, meta } = useShop();
  const providers = config?.providers ?? [];
  const settled = providers.filter((p) => !groceries.totals[p.id]?.loading && groceries.totals[p.id]?.matched);
  const cheapest = settled.length > 1 ? Math.min(...settled.map((p) => groceries.totals[p.id].total)) : undefined;

  if (!providers.length) return <div className="skeleton h-28 rounded-3xl" />;

  return (
    <div role="radiogroup" aria-label="Store" className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="inline-flex min-w-full gap-1.5 rounded-[28px] bg-surface-2 p-1.5">
        {providers.map((p) => {
          const t = groceries.totals[p.id];
          const active = p.id === provider;
          const isCheapest = cheapest !== undefined && t && !t.loading && Math.abs(t.total - cheapest) < 0.005;
          const delta = cheapest !== undefined && t ? t.total - cheapest : 0;
          const store = meta[p.id]?.store;
          return (
            <button
              key={p.id}
              role="radio"
              aria-checked={active}
              onClick={() => setProvider(p.id)}
              className="relative min-w-[180px] flex-1 rounded-[22px] px-4 py-3 text-left transition"
            >
              {active && (
                <motion.span
                  layoutId="provider-pill"
                  className="absolute inset-0 rounded-[22px] bg-surface shadow-lift"
                  style={{ boxShadow: `0 0 0 2px ${p.color}, var(--shadow-lift)` }}
                  transition={{ type: 'spring', stiffness: 450, damping: 36 }}
                />
              )}
              <span className="relative block">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="font-extrabold">{p.name}</span>
                  <span
                    className={clsx(
                      'ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                      p.live ? 'bg-avocado-100 text-avocado-800 dark:bg-avocado-400/15 dark:text-avocado-300' : 'bg-butter-100 text-butter-800 dark:bg-butter-400/15 dark:text-butter-300',
                    )}
                  >
                    {p.live ? 'Live' : p.capabilities.livePrices ? 'Demo' : 'Estimate'}
                  </span>
                </span>
                <span className="mt-1.5 flex items-end gap-2">
                  <span className={clsx('text-2xl font-extrabold tabular', !active && 'text-ink-soft')}>
                    <AnimatedNumber value={t?.total ?? 0} format={money} />
                  </span>
                  {t?.loading && <Loader2 size={14} className="mb-1.5 animate-spin text-muted" />}
                </span>
                <span className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-muted">
                  {isCheapest ? (
                    <span className="inline-flex items-center gap-1 text-avocado-600 dark:text-avocado-400">
                      <Trophy size={12} /> Cheapest
                    </span>
                  ) : delta > 0.004 ? (
                    <span>+{money(delta)} vs cheapest</span>
                  ) : (
                    <span>{t?.matched ?? 0} items priced</span>
                  )}
                  {store && (
                    <span className="inline-flex items-center gap-0.5 truncate" title={store.name}>
                      · <MapPin size={11} /> {store.name}
                    </span>
                  )}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 px-2 text-xs text-muted">
        <BudgetChip total={groceries.totals[provider]?.total ?? 0} />
        {providers.find((p) => p.id === provider)?.note}
      </div>
    </div>
  );
}

function BudgetChip({ total }: { total: number }) {
  const budget = usePrefs((s) => s.prefs.weeklyBudget);
  if (!total) return null;
  const over = total - budget;
  return (
    <span
      className={clsx(
        'chip',
        over > 0 ? 'bg-tomato-100 text-tomato-700 dark:bg-tomato-500/15 dark:text-tomato-300' : 'bg-avocado-100 text-avocado-800 dark:bg-avocado-400/15 dark:text-avocado-300',
      )}
    >
      {over > 0 ? `${money(over)} over your $${budget} budget` : `${money(-over)} under your $${budget} budget`}
    </span>
  );
}
