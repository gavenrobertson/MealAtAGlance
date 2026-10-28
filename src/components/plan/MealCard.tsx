import clsx from 'clsx';
import { Clock, Flame, Lock, LockOpen, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import type { MealSlot } from '../../../shared/types';
import { SLOT_META } from '../../lib/format';
import { usePlan } from '../../store/plan';
import { Stepper } from '../ui/Stepper';

interface Props {
  dayIndex: number;
  slot: MealSlot;
  pending: boolean;
  onOpen: () => void;
}

export function MealCard({ dayIndex, slot, pending, onOpen }: Props) {
  const plan = usePlan((s) => s.plan)!;
  const { toggleLock, regenerateMeal, setMealServings } = usePlan();
  const day = plan.days[dayIndex];
  const pm = day.meals[slot]!;
  const { meal } = pm;
  const servings = pm.servings ?? day.servings ?? plan.weekServings;
  const meta = SLOT_META[slot];
  const minutes = meal.prepMinutes + meal.cookMinutes;

  return (
    <article
      onClick={onOpen}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget && (e.preventDefault(), onOpen())}
      tabIndex={0}
      aria-label={`${meta.label}: ${meal.title}`}
      className={clsx(
        'group relative cursor-pointer rounded-2xl border bg-surface p-3 shadow-soft transition duration-200 hover:-translate-y-0.5 hover:shadow-lift',
        pm.locked ? 'border-butter-400 ring-2 ring-butter-300/60 dark:ring-butter-400/30' : 'border-line',
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-xl transition group-hover:-rotate-6 group-hover:scale-110">{meal.emoji}</span>
        <div className="ml-auto flex items-center">
          <motion.button
            whileTap={{ scale: 0.8 }}
            onClick={(e) => (e.stopPropagation(), toggleLock(dayIndex, slot))}
            className={clsx(
              'grid h-7 w-7 place-items-center rounded-full transition',
              pm.locked ? 'bg-butter-100 text-butter-800 dark:bg-butter-400/20 dark:text-butter-300' : 'text-muted opacity-60 hover:bg-surface-2 hover:text-ink group-hover:opacity-100',
            )}
            aria-label={pm.locked ? 'Unlock meal' : 'Lock meal'}
            aria-pressed={pm.locked}
            title={pm.locked ? 'Locked: kept when you regenerate' : 'Lock this meal'}
          >
            {pm.locked ? <Lock size={13} strokeWidth={2.5} /> : <LockOpen size={13} />}
          </motion.button>
          <button
            onClick={(e) => (e.stopPropagation(), regenerateMeal(dayIndex, slot))}
            disabled={pm.locked || pending}
            className="grid h-7 w-7 place-items-center rounded-full text-muted opacity-60 transition hover:bg-surface-2 hover:text-ink group-hover:opacity-100 disabled:opacity-25"
            aria-label="Regenerate this meal"
            title={pm.locked ? 'Unlock to swap' : 'Swap for a different meal'}
          >
            <RefreshCw size={13} className={clsx(pending && 'animate-spin')} />
          </button>
        </div>
      </div>

      <div className={clsx('mt-2 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider', meta.text)}>
        <span className={clsx('h-1.5 w-1.5 rounded-full', meta.dot)} />
        {meta.label}
      </div>
      <h3 className="mt-0.5 line-clamp-2 min-h-[2.75em] text-[13.5px] font-bold leading-snug">{meal.title}</h3>

      <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11.5px] font-semibold text-muted">
        <span className="inline-flex items-center gap-1"><Clock size={12} />{minutes}m</span>
        {meal.macros && <span className="inline-flex items-center gap-1"><Flame size={12} />{Math.round(meal.macros.calories)}</span>}
        {meal.macros && <span>{Math.round(meal.macros.protein)}g P</span>}
      </div>

      <div className="mt-2.5 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Serves</span>
        <Stepper size="sm" label={`${meal.title} servings`} value={servings} highlighted={pm.servings !== undefined} onChange={(n) => setMealServings(dayIndex, slot, n)} />
      </div>

      {pending && (
        <div className="absolute inset-0 grid place-items-center rounded-2xl bg-surface/70 backdrop-blur-[1px]">
          <RefreshCw size={20} className="animate-spin text-tomato-500" />
        </div>
      )}
    </article>
  );
}
