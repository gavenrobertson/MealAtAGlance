import clsx from 'clsx';
import { ArrowLeftRight, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import type { Unit } from '../../../shared/types';
import { formatQuantity, fromBase } from '../../../shared/units';
import type { GroceryRow } from '../../hooks/useGroceries';
import { money, titleCase } from '../../lib/format';
import { usePantry } from '../../store/pantry';
import { usePrefs } from '../../store/prefs';
import { useShop } from '../../store/shop';
import { PopCheck } from '../ui/PopCheck';
import { ProductThumb } from './ProductThumb';

const PARTIAL_UNITS: Record<string, Unit[]> = {
  mass: ['oz', 'lb', 'g'],
  volume: ['cup', 'tbsp', 'tsp', 'ml'],
};

export function GroceryItemRow({ row, provider, onSwap }: { row: GroceryRow; provider: string; onSwap: () => void }) {
  const { item, need } = row;
  const units = usePrefs((s) => s.prefs.units);
  const { setOwned, setPartial } = usePantry();
  const entry = usePantry((s) => s.entries[item.key]);
  const loading = useShop((s) => s.loading[provider]);
  const error = useShop((s) => s.meta[provider]?.errors[item.key]);
  const [editing, setEditing] = useState(false);

  const line = row.lines[provider];
  const ownedAll = need.owned === 'all';
  const partialUnits: Unit[] = item.total.dimension === 'count' ? [(item.total.countUnit ?? 'each') as Unit] : PARTIAL_UNITS[item.total.dimension];
  const [unit, setUnit] = useState<Unit>(entry?.mode === 'partial' ? entry.unit : partialUnits[0]);
  const qtyText = formatQuantity(need.need ?? item.total, units) + item.extras.map((e) => ` + ${formatQuantity(e, units)}`).join('');
  const meals = [...new Set(item.sources.map((s) => s.mealTitle))];

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 60, transition: { duration: 0.22 } }}
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
      className={clsx('flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center', ownedAll && 'bg-surface-2/30')}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className="pt-0.5">
          <PopCheck
            checked={ownedAll}
            partial={need.owned === 'partial'}
            onChange={(c) => setOwned(item.key, c)}
            label={`I have ${item.name}`}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className={clsx('flex flex-wrap items-baseline gap-x-2 font-bold', ownedAll && 'text-muted line-through decoration-avocado-500 decoration-2')}>
            <span>{titleCase(item.name)}</span>
            <span className={clsx('text-sm tabular', ownedAll ? 'text-muted' : 'text-tomato-600 dark:text-tomato-400')}>{qtyText}</span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
            <span title={meals.join('\n')} className="inline-flex items-center gap-1">
              {item.sources.slice(0, 3).map((s, i) => <span key={i}>{s.emoji}</span>)}
              {meals.length === 1 ? meals[0] : `${meals.length} meals`}
            </span>
            {need.owned === 'partial' && need.haveAmount && (
              <span className="font-semibold text-avocado-600 dark:text-avocado-400">· have {formatQuantity(need.haveAmount, units)}</span>
            )}
            {!ownedAll && (
              <button onClick={() => setEditing((v) => !v)} className="font-semibold text-ink-soft underline decoration-dotted underline-offset-2 hover:text-ink">
                {need.owned === 'partial' ? 'edit' : 'have some?'}
              </button>
            )}
          </div>
          {editing && !ownedAll && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2 flex items-center gap-2">
              <span className="text-xs font-semibold">I have</span>
              <input
                type="number"
                min={0}
                step="any"
                autoFocus
                defaultValue={entry?.mode === 'partial' ? entry.quantity : ''}
                onChange={(e) => setPartial(item.key, Number(e.target.value), unit)}
                onKeyDown={(e) => e.key === 'Enter' && setEditing(false)}
                className="h-8 w-20 rounded-full border border-line bg-surface-2 px-3 text-sm tabular focus:border-tomato-300 focus:outline-none"
                placeholder={String(Math.round(fromBase(item.total, partialUnits[0]) * 10) / 10)}
              />
              {partialUnits.length > 1 ? (
                <select
                  value={unit}
                  onChange={(e) => {
                    setUnit(e.target.value as Unit);
                    if (entry?.mode === 'partial') setPartial(item.key, entry.quantity, e.target.value as Unit);
                  }}
                  className="h-8 rounded-full border border-line bg-surface-2 px-2 text-sm"
                >
                  {partialUnits.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              ) : (
                <span className="text-sm text-muted">{partialUnits[0] === 'each' ? '' : partialUnits[0]}</span>
              )}
              <button className="text-xs font-bold text-tomato-600 dark:text-tomato-400" onClick={() => setEditing(false)}>Done</button>
            </motion.div>
          )}
        </div>
      </div>

      <div className={clsx('flex items-center gap-3 pl-10 sm:w-[46%] sm:pl-0', ownedAll && 'opacity-50')}>
        {line ? (
          <>
            <ProductThumb product={line.product} />
            <div className="min-w-0 flex-1">
              <a href={line.product.url} target="_blank" rel="noopener noreferrer" className="line-clamp-1 text-[13px] font-semibold hover:underline">
                {line.product.name}
              </a>
              <div className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted">
                <span>{line.product.sizeText}</span>
                <span className="tabular">· {line.product.soldByWeight ? `${line.packs.toFixed(2)} lb` : `${line.packs} ×`} {money(line.product.price)}</span>
                {line.product.regularPrice && <span className="font-bold text-avocado-600 dark:text-avocado-400">sale</span>}
                {row.overridden[provider] && <span className="font-bold text-berry-500 dark:text-berry-300">your pick</span>}
                {error && (
                  <span title={error} className="inline-flex items-center gap-0.5 text-butter-800 dark:text-butter-300">
                    <Info size={11} /> est.
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className={clsx('text-[15px] font-extrabold tabular', ownedAll && 'line-through')}>{money(line.cost)}</div>
              <button onClick={onSwap} className="no-print inline-flex items-center gap-1 text-xs font-bold text-tomato-600 hover:text-tomato-700 dark:text-tomato-400">
                <ArrowLeftRight size={11} /> Swap
              </button>
            </div>
          </>
        ) : loading ? (
          <div className="flex flex-1 items-center gap-3">
            <div className="skeleton h-11 w-11 rounded-xl" />
            <div className="flex-1 space-y-1.5">
              <div className="skeleton h-3 w-3/4 rounded-full" />
              <div className="skeleton h-3 w-1/3 rounded-full" />
            </div>
          </div>
        ) : (
          <span className="text-xs text-muted">No match at this store</span>
        )}
      </div>
    </motion.li>
  );
}
