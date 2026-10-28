import clsx from 'clsx';
import { CalendarPlus, ChevronDown, Clock, Flame, Lightbulb, Loader2, Plus, RefreshCw, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { IdeaGoal, Meal, MealSlot } from '../../../shared/types';
import { DAY_LABELS, MEAL_SLOTS } from '../../../shared/types';
import { SLOT_META, money } from '../../lib/format';
import { useIdeas } from '../../store/ideas';
import { usePlan } from '../../store/plan';
import { usePrefs } from '../../store/prefs';
import { toast } from '../../store/toast';
import { Button } from '../ui/Button';
import { PopCheck } from '../ui/PopCheck';
import { Sheet } from '../ui/Sheet';
import { ToggleChip } from '../ui/ToggleChip';
import type { MealRef } from './PlanView';

const GOALS: Array<{ id: IdeaGoal; label: string }> = [
  { id: 'low-cost', label: '💸 Low cost' },
  { id: 'high-protein', label: '💪 High protein' },
  { id: 'meal-prep', label: '🥡 Meal prep' },
  { id: 'quick', label: '⚡ Quick' },
];

interface Props {
  open: boolean;
  /** When set, the sheet picks one meal for this day/slot instead of building the week. */
  target: MealRef | null;
  onClose: () => void;
}

/**
 * Scrollable meal-idea browser. Week mode: tap ideas to pick several per meal, then build the week.
 * Single mode (from an empty slot or a meal's detail): tap "Use this" to drop one idea into that day.
 */
export function IdeasSheet({ open, target, onClose }: Props) {
  const { prefs, draftRequest, setDraftRequest } = usePrefs();
  const { ideas, selected, goals, loading, exhausted, source, toggleGoal, fetch, toggleSelect, picks, clearSelection } = useIdeas();
  const { plan, applyPicks, setMeal } = usePlan();
  const enabled = MEAL_SLOTS.filter((s) => prefs.slots[s]);
  const [tab, setTab] = useState<MealSlot>(target?.slot ?? enabled[0] ?? 'dinner');
  const slot = target?.slot ?? tab;

  useEffect(() => {
    if (open && target) setTab(target.slot);
    else if (open && !enabled.includes(tab) && enabled[0]) setTab(enabled[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, target]);

  // First visit to a slot: fetch a batch automatically (once per opening, so errors don't loop).
  const autoFetched = useRef(new Set<MealSlot>());
  useEffect(() => {
    if (!open) return void autoFetched.current.clear();
    if (ideas[slot]?.length || loading[slot] || autoFetched.current.has(slot)) return;
    autoFetched.current.add(slot);
    void fetch(slot, 'fresh');
  }, [open, slot, ideas, loading, fetch]);

  const refreshAll = () => (target ? [slot] : enabled).forEach((s) => void fetch(s, 'fresh'));
  const list = ideas[slot] ?? [];
  const pickCount = Object.values(selected).reduce((n, ids) => n + (ids?.length ?? 0), 0);
  const lockedCount = plan ? plan.days.reduce((n, d) => n + Object.values(d.meals).filter((m) => m?.locked).length, 0) : 0;

  const build = () => {
    applyPicks(picks(), source);
    clearSelection();
    onClose();
    toast(`Week built from ${pickCount} pick${pickCount > 1 ? 's' : ''}`, 'success');
  };

  const useOne = (meal: Meal) => {
    if (!target) return;
    setMeal(target.dayIndex, target.slot, meal, source);
    onClose();
    toast(`${meal.title} added to ${DAY_LABELS[target.dayIndex]}`, 'success');
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      xl
      title={
        <span className="flex items-center gap-2">
          <Lightbulb size={20} className="text-butter-500" />
          {target ? `Pick a ${SLOT_META[target.slot].label.toLowerCase()} for ${DAY_LABELS[target.dayIndex]}` : 'Meal ideas'}
        </span>
      }
      subtitle={target ? 'Scroll through the options and tap “Use this”.' : 'Scroll, tap the ones you like, then build your week. Picks rotate through the days, meal-prep style.'}
      footer={
        !target && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 text-sm">
              {pickCount === 0 ? (
                <span className="text-muted">Nothing picked yet</span>
              ) : (
                <>
                  <span className="font-bold">{pickCount} picked</span>
                  {MEAL_SLOTS.filter((s) => selected[s]?.length).map((s) => (
                    <span key={s} className={clsx('chip', SLOT_META[s].tone)}>{SLOT_META[s].label} {selected[s]!.length}</span>
                  ))}
                  <button onClick={clearSelection} className="ml-1 text-xs font-semibold text-muted underline hover:text-ink">Clear</button>
                </>
              )}
            </div>
            <Button variant="primary" onClick={build} disabled={!pickCount}>
              <CalendarPlus size={16} />
              {plan ? 'Put picks in my week' : 'Build my week'}
            </Button>
            {plan && pickCount > 0 && (
              <p className="w-full text-xs text-muted">
                Replaces the unlocked meals for the picked meal types{lockedCount ? `, keeping ${lockedCount} locked` : ''}. Meal types with no picks stay as they are.
              </p>
            )}
          </div>
        )
      }
    >
      <div className="sticky top-0 z-10 -mx-6 space-y-3 bg-surface px-6 pb-3">
        <div className="flex gap-2">
          <input
            value={draftRequest}
            onChange={(e) => setDraftRequest(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && refreshAll()}
            placeholder="What sounds good? e.g. “cozy, cheap, lots of veggies”"
            className="h-10 min-w-0 flex-1 rounded-full border border-line bg-surface-2 px-4 text-sm focus:border-tomato-300 focus:outline-none"
            aria-label="What kind of ideas"
          />
          <Button variant="secondary" onClick={refreshAll} disabled={!!loading[slot]}>
            <RefreshCw size={15} className={clsx(loading[slot] && 'animate-spin')} /> New ideas
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {GOALS.map((g) => (
            <ToggleChip key={g.id} on={goals.includes(g.id)} onClick={() => toggleGoal(g.id)} tone="avocado">
              {g.label}
            </ToggleChip>
          ))}
        </div>
        {!target && (
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto" role="tablist" aria-label="Meal type">
            {enabled.map((s) => (
              <button
                key={s}
                role="tab"
                aria-selected={s === slot}
                onClick={() => setTab(s)}
                className={clsx('inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-bold transition', s === slot ? 'bg-ink text-bg' : 'bg-surface-2 text-ink-soft hover:text-ink')}
              >
                {SLOT_META[s].emoji} {SLOT_META[s].label}
                {!!selected[s]?.length && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-tomato-500 px-1 text-[11px] text-white">{selected[s]!.length}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-3 pt-1 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence initial={false}>
          {list.map((meal, i) => (
            <motion.div key={meal.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i % 6, 5) * 0.04 } }} exit={{ opacity: 0, scale: 0.95 }}>
              <IdeaCard
                meal={meal}
                servings={plan?.weekServings ?? prefs.householdServings}
                picked={!!selected[slot]?.includes(meal.id)}
                mode={target ? 'single' : 'multi'}
                onToggle={() => toggleSelect(slot, meal.id)}
                onUse={() => useOne(meal)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        {loading[slot] && Array.from({ length: list.length ? 3 : 6 }, (_, i) => <div key={`sk${i}`} className="skeleton h-52 rounded-3xl" />)}
      </div>

      <div className="mt-4 flex justify-center">
        {exhausted[slot] && !loading[slot] ? (
          <p className="text-sm text-muted">That's every match {source === 'demo' ? 'in the demo recipe library' : 'for now'}. Try changing the goals or request.</p>
        ) : (
          list.length > 0 && (
            <Button variant="soft" onClick={() => fetch(slot, 'more')} disabled={!!loading[slot]}>
              {loading[slot] ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} More {SLOT_META[slot].label.toLowerCase()} ideas
            </Button>
          )
        )}
      </div>
      {source === 'demo' && list.length > 0 && (
        <p className="mt-3 text-center text-xs text-muted">
          <Sparkles size={11} className="mr-1 inline" />
          Demo ideas come from the built-in recipe library. Add an Anthropic key for endless custom ideas.
        </p>
      )}
    </Sheet>
  );
}

function IdeaCard({ meal, servings, picked, mode, onToggle, onUse }: {
  meal: Meal; servings: number; picked: boolean; mode: 'single' | 'multi'; onToggle: () => void; onUse: () => void;
}) {
  const [showIngredients, setShowIngredients] = useState(false);
  const minutes = meal.prepMinutes + meal.cookMinutes;
  const multi = mode === 'multi';
  return (
    <article
      onClick={multi ? onToggle : undefined}
      className={clsx(
        'relative flex h-full flex-col rounded-3xl border bg-surface p-4 transition',
        multi && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-lift',
        picked ? 'border-tomato-400 ring-2 ring-tomato-300/60 dark:ring-tomato-500/30' : 'border-line shadow-soft',
      )}
    >
      <div className="flex items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-surface-2 text-[26px]">{meal.emoji}</span>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold leading-snug">{meal.title}</h3>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted">{meal.description}</p>
        </div>
        {multi && (
          <div onClick={(e) => e.stopPropagation()}>
            <PopCheck checked={picked} onChange={onToggle} label={`Pick ${meal.title}`} />
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 text-[11.5px] font-semibold">
        <span className="chip bg-surface-2 text-ink-soft"><Clock size={11} />{minutes} min</span>
        {meal.macros && <span className="chip bg-surface-2 text-ink-soft"><Flame size={11} />{Math.round(meal.macros.calories)} kcal</span>}
        {meal.macros && <span className="chip bg-avocado-100 text-avocado-800 dark:bg-avocado-400/15 dark:text-avocado-300">{Math.round(meal.macros.protein)}g protein</span>}
        {meal.estCostPerServing !== undefined && (
          <span className="chip bg-butter-100 text-butter-800 dark:bg-butter-400/15 dark:text-butter-300">~{money(meal.estCostPerServing)}/serving</span>
        )}
      </div>

      <button
        onClick={(e) => (e.stopPropagation(), setShowIngredients((v) => !v))}
        className="mt-3 inline-flex items-center gap-1 self-start text-xs font-semibold text-ink-soft hover:text-ink"
        aria-expanded={showIngredients}
      >
        {meal.ingredients.length} ingredients
        <ChevronDown size={13} className={clsx('transition', showIngredients && 'rotate-180')} />
      </button>
      <AnimatePresence initial={false}>
        {showIngredients && (
          <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden text-xs leading-relaxed text-muted">
            {meal.ingredients.map((i) => i.name).join(', ')}
            {meal.estCostPerServing !== undefined && <span className="block pt-1 font-semibold text-ink-soft">≈ {money(meal.estCostPerServing * servings)} for {servings} servings</span>}
          </motion.p>
        )}
      </AnimatePresence>

      <div className="mt-auto pt-3">
        {multi ? (
          <div className={clsx('text-xs font-bold', picked ? 'text-tomato-600 dark:text-tomato-400' : 'text-muted')}>{picked ? '✓ Picked' : 'Tap to pick'}</div>
        ) : (
          <Button size="sm" variant="primary" className="w-full" onClick={onUse}>Use this</Button>
        )}
      </div>
    </article>
  );
}
