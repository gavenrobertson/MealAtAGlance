import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { Groceries } from '../../hooks/useGroceries';
import { money, titleCase } from '../../lib/format';
import { usePantry } from '../../store/pantry';

export function PantryPanel({ groceries }: { groceries: Groceries }) {
  const { entries, forget } = usePantry();
  const inPlan = new Set(groceries.rows.map((r) => r.item.key));
  const remembered = Object.entries(entries).sort((a, b) => b[1].updatedAt - a[1].updatedAt);
  const notInPlan = remembered.filter(([k]) => !inPlan.has(k));

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-2xl bg-avocado-100 text-lg dark:bg-avocado-400/15">🫙</span>
        <div>
          <h2 className="font-extrabold">Your pantry</h2>
          <p className="text-xs text-muted">Remembered for future weeks</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-2xl bg-surface-2 p-3">
          <div className="text-xl font-extrabold tabular">{groceries.owned}</div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Items covered</div>
        </div>
        <div className="rounded-2xl bg-avocado-100/60 p-3 dark:bg-avocado-400/10">
          <div className="text-xl font-extrabold tabular text-avocado-600 dark:text-avocado-400">{money(groceries.pantrySavings)}</div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Not spent</div>
        </div>
      </div>

      {notInPlan.length > 0 && (
        <div className="mt-4">
          <div className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">Also on hand</div>
          <ul className="flex flex-wrap gap-1.5">
            <AnimatePresence>
              {notInPlan.map(([key]) => (
                <motion.li key={key} layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="chip bg-surface-2 text-ink-soft">
                  {titleCase(key)}
                  <button onClick={() => forget(key)} aria-label={`Forget ${key}`} className="text-muted hover:text-ink">
                    <X size={11} />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>
      )}
      <p className="mt-4 text-xs leading-relaxed text-muted">
        Tip: check off staples like oil, salt and spices once. They stay checked next week, so your total only counts what you need.
      </p>
    </div>
  );
}
