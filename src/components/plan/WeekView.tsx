import clsx from 'clsx';
import { Plus, RotateCcw } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { MEAL_SLOTS, type MealSlot } from '../../../shared/types';
import { SLOT_META } from '../../lib/format';
import { usePlan } from '../../store/plan';
import { usePrefs } from '../../store/prefs';
import { Stepper } from '../ui/Stepper';
import { MealCard } from './MealCard';
import type { MealRef } from './PlanView';

/**
 * 7-column grid on desktop; horizontally swipeable, snap-aligned day cards on mobile.
 * Same DOM for both so state (scroll position aside) is shared.
 */
export function WeekView({ onOpenMeal, onPickIdea }: { onOpenMeal: (ref: MealRef) => void; onPickIdea: (ref: MealRef) => void }) {
  const plan = usePlan((s) => s.plan)!;
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  // Track which day card is centered on mobile to highlight its pill.
  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.day));
      },
      { root, threshold: 0.6 },
    );
    root.querySelectorAll('[data-day]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [plan.id]);

  const scrollTo = (i: number) => {
    const el = scroller.current?.querySelector<HTMLElement>(`[data-day="${i}"]`);
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  };

  return (
    <div>
      <div className="no-scrollbar -mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 lg:hidden" role="tablist" aria-label="Days">
        {plan.days.map((d, i) => (
          <button
            key={d.label}
            role="tab"
            aria-selected={active === i}
            onClick={() => scrollTo(i)}
            className={clsx(
              'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-bold transition',
              active === i ? 'bg-ink text-bg' : 'bg-surface text-ink-soft ring-1 ring-line',
            )}
          >
            {d.label.slice(0, 3)}
          </button>
        ))}
      </div>

      <div
        ref={scroller}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 lg:mx-0 lg:grid lg:grid-cols-7 lg:overflow-visible lg:px-0"
      >
        {plan.days.map((_, i) => (
          <DayColumn key={i} dayIndex={i} onOpenMeal={onOpenMeal} onPickIdea={onPickIdea} />
        ))}
      </div>
    </div>
  );
}

function DayColumn({ dayIndex, onOpenMeal, onPickIdea }: { dayIndex: number; onOpenMeal: (ref: MealRef) => void; onPickIdea: (ref: MealRef) => void }) {
  const plan = usePlan((s) => s.plan)!;
  const { setDayServings, status } = usePlan();
  const slots = usePrefs((s) => s.prefs.slots);
  const day = plan.days[dayIndex];
  const servings = day.servings ?? plan.weekServings;
  const kcal = MEAL_SLOTS.reduce((n, s) => n + (slots[s] && day.meals[s]?.meal.macros ? day.meals[s]!.meal.macros!.calories : 0), 0);

  return (
    <section
      data-day={dayIndex}
      className="flex w-[86%] shrink-0 snap-center flex-col gap-2 rounded-[26px] bg-surface-2/70 p-2 sm:w-[46%] md:w-[36%] lg:w-auto"
      aria-label={day.label}
    >
      <header className="flex items-center justify-between gap-1 px-1.5 pt-1">
        <div className="leading-tight">
          <div className="text-[15px] font-extrabold">
            <span className="lg:hidden">{day.label}</span>
            <span className="hidden lg:inline">{day.label.slice(0, 3)}</span>
          </div>
          {kcal > 0 && <div className="whitespace-nowrap text-[11px] font-semibold text-muted tabular" title="Calories per serving for the day">{Math.round(kcal)} kcal</div>}
        </div>
        <div className="flex items-center gap-0.5">
          {day.servings !== undefined && (
            <button onClick={() => setDayServings(dayIndex, undefined)} className="grid h-6 w-6 place-items-center rounded-full text-muted hover:bg-surface-3 hover:text-ink" title="Use week servings" aria-label="Reset day servings">
              <RotateCcw size={11} />
            </button>
          )}
          <Stepper size="sm" label={`${day.label} servings`} value={servings} highlighted={day.servings !== undefined} onChange={(n) => setDayServings(dayIndex, n)} />
        </div>
      </header>

      {MEAL_SLOTS.filter((s) => slots[s]).map((slot) => {
        const pm = day.meals[slot];
        const pending = status.pendingMeals.includes(`${dayIndex}:${slot}`);
        return (
          <AnimatePresence key={slot} mode="popLayout" initial={false}>
            {pm ? (
              <motion.div
                key={pm.meal.id}
                layout
                initial={{ opacity: 0, scale: 0.94, rotateX: -12 }}
                animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              >
                <MealCard pm={pm} dayIndex={dayIndex} slot={slot} pending={pending} onOpen={() => onOpenMeal({ dayIndex, slot })} />
              </motion.div>
            ) : (
              <EmptySlot key={`empty-${slot}`} slot={slot} pending={pending} onAdd={() => onPickIdea({ dayIndex, slot })} />
            )}
          </AnimatePresence>
        );
      })}
    </section>
  );
}

function EmptySlot({ slot, pending, onAdd }: { slot: MealSlot; pending: boolean; onAdd: () => void }) {
  if (pending) return <div className="skeleton h-[124px] rounded-2xl" />;
  return (
    <motion.button
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onAdd}
      className="flex h-[88px] flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-line text-sm font-semibold text-muted transition hover:border-tomato-300 hover:text-tomato-600 dark:hover:text-tomato-400"
    >
      <Plus size={18} />
      Add {SLOT_META[slot].label.toLowerCase()}
    </motion.button>
  );
}
