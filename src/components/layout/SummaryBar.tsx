import clsx from 'clsx';
import { ArrowRight, CalendarDays, Check, Loader2, ShoppingBasket, Wallet } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Groceries } from '../../hooks/useGroceries';
import { money } from '../../lib/format';
import { usePlan } from '../../store/plan';
import { useShop } from '../../store/shop';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import type { Tab } from './Header';

function Stat({ icon, label, children, tone }: { icon: ReactNode; label: string; children: ReactNode; tone: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className={clsx('hidden h-9 w-9 shrink-0 place-items-center rounded-2xl sm:grid', tone)}>{icon}</span>
      <div className="min-w-0 leading-tight">
        <div className="text-[17px] font-extrabold tabular sm:text-lg">{children}</div>
        <div className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</div>
      </div>
    </div>
  );
}

export function SummaryBar({ groceries, tab, onTab }: { groceries: Groceries; tab: Tab; onTab: (t: Tab) => void }) {
  const hasPlan = usePlan((s) => !!s.plan);
  const provider = useShop((s) => s.provider);
  const config = useShop((s) => s.config);
  const info = config?.providers.find((p) => p.id === provider);
  const total = groceries.totals[provider];
  if (!hasPlan) return null;

  return (
    <div className="no-print pointer-events-none fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(env(safe-area-inset-bottom),12px)] sm:px-6">
      <div className="pointer-events-auto mx-auto flex max-w-5xl items-center gap-3 rounded-[28px] border border-line bg-surface/90 p-2.5 pl-4 shadow-lift backdrop-blur-xl sm:gap-6 sm:pl-5">
        <div className="grid flex-1 grid-cols-4 gap-2 sm:gap-5">
          <Stat icon={<CalendarDays size={18} />} label="Meals" tone="bg-butter-100 text-butter-800 dark:bg-butter-400/15 dark:text-butter-300">
            <AnimatedNumber value={groceries.mealsPlanned} />
          </Stat>
          <Stat icon={<ShoppingBasket size={18} />} label="To buy" tone="bg-tomato-100 text-tomato-700 dark:bg-tomato-500/15 dark:text-tomato-300">
            <AnimatedNumber value={groceries.toBuy} />
          </Stat>
          <Stat icon={<Check size={18} strokeWidth={3} />} label="Have" tone="bg-avocado-100 text-avocado-800 dark:bg-avocado-400/15 dark:text-avocado-300">
            <AnimatedNumber value={groceries.owned} />
          </Stat>
          <Stat icon={<Wallet size={18} />} label={info ? `Est. · ${info.name}` : 'Estimated'} tone="bg-berry-100 text-berry-700 dark:bg-berry-400/15 dark:text-berry-300">
            <span className="inline-flex items-center gap-1">
              <AnimatedNumber value={total?.total ?? 0} format={money} />
              {total?.loading && <Loader2 size={13} className="animate-spin text-muted" />}
            </span>
          </Stat>
        </div>
        <button
          onClick={() => onTab(tab === 'plan' ? 'groceries' : 'plan')}
          className="group hidden h-12 shrink-0 items-center gap-2 rounded-full bg-ink px-5 text-sm font-bold text-bg transition active:scale-95 sm:inline-flex"
        >
          {tab === 'plan' ? 'Shopping list' : 'Back to plan'}
          <ArrowRight size={16} className={clsx('transition group-hover:translate-x-0.5', tab === 'groceries' && 'rotate-180 group-hover:-translate-x-0.5')} />
        </button>
      </div>
    </div>
  );
}
