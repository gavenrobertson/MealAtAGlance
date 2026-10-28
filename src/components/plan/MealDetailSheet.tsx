import clsx from 'clsx';
import { Clock, Lock, LockOpen, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Ingredient } from '../../../shared/types';
import { prettyNumber } from '../../../shared/units';
import { SLOT_META } from '../../lib/format';
import { usePlan } from '../../store/plan';
import { Button } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import { Stepper } from '../ui/Stepper';
import type { MealRef } from './PlanView';

const UNIT_LABEL: Record<string, [string, string]> = {
  each: ['', ''], clove: ['clove', 'cloves'], can: ['can', 'cans'], slice: ['slice', 'slices'], bunch: ['bunch', 'bunches'],
  head: ['head', 'heads'], pinch: ['pinch', 'pinches'], cup: ['cup', 'cups'], fl_oz: ['fl oz', 'fl oz'], pint: ['pint', 'pints'],
  quart: ['quart', 'quarts'], gallon: ['gallon', 'gallons'],
};

function ingredientText(i: Ingredient, scale: number) {
  const q = i.quantity * scale;
  const [one, many] = UNIT_LABEL[i.unit] ?? [i.unit, i.unit];
  const unit = q > 1 ? many : one;
  return `${prettyNumber(q)}${unit ? ' ' + unit : ''}`;
}

export function MealDetailSheet({ mealRef, onClose }: { mealRef: MealRef | null; onClose: () => void }) {
  const plan = usePlan((s) => s.plan);
  const { toggleLock, regenerateMeal, setMealServings, removeMeal, status } = usePlan();
  const [hint, setHint] = useState('');
  useEffect(() => setHint(''), [mealRef?.dayIndex, mealRef?.slot]);

  const day = mealRef && plan ? plan.days[mealRef.dayIndex] : undefined;
  const pm = mealRef && day ? day.meals[mealRef.slot] : undefined;
  const open = !!pm;
  if (!mealRef || !plan || !day) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;

  const { dayIndex, slot } = mealRef;
  const pending = status.pendingMeals.includes(`${dayIndex}:${slot}`);
  const servings = pm ? pm.servings ?? day.servings ?? plan.weekServings : plan.weekServings;
  const meal = pm?.meal;
  const scale = meal ? servings / Math.max(1, meal.baseServings) : 1;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      wide
      title={meal && <span className="flex items-center gap-2"><span className="text-2xl">{meal.emoji}</span>{meal.title}</span>}
      subtitle={meal?.description}
      footer={
        pm && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !pm.locked && regenerateMeal(dayIndex, slot, hint || undefined)}
                placeholder="Optional: “something lighter”, “use the leftover chicken”…"
                className="h-10 min-w-0 flex-1 rounded-full border border-line bg-surface-2 px-4 text-sm focus:border-tomato-300 focus:outline-none"
                disabled={pm.locked}
              />
              <Button variant="primary" onClick={() => regenerateMeal(dayIndex, slot, hint || undefined)} disabled={pm.locked || pending}>
                <RefreshCw size={15} className={clsx(pending && 'animate-spin')} /> Swap meal
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <Button size="sm" variant={pm.locked ? 'soft' : 'secondary'} onClick={() => toggleLock(dayIndex, slot)}>
                {pm.locked ? <Lock size={14} /> : <LockOpen size={14} />}
                {pm.locked ? 'Locked: kept on regenerate' : 'Lock this meal'}
              </Button>
              <Button size="sm" variant="danger" onClick={() => (removeMeal(dayIndex, slot), onClose())}>
                <Trash2 size={14} /> Remove
              </Button>
            </div>
          </div>
        )
      }
    >
      {meal && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={clsx('chip', SLOT_META[slot].tone)}>{SLOT_META[slot].label} · {day.label}</span>
            <span className="chip bg-surface-2 text-ink-soft"><Clock size={12} /> {meal.prepMinutes}m prep · {meal.cookMinutes}m cook</span>
            {meal.tags.slice(0, 4).map((t) => (
              <span key={t} className="chip bg-surface-2 text-muted">{t}</span>
            ))}
          </div>

          {meal.macros && (
            <div className="grid grid-cols-4 gap-2">
              {([
                ['Calories', meal.macros.calories, '', 'bg-tomato-50 dark:bg-tomato-500/10'],
                ['Protein', meal.macros.protein, 'g', 'bg-avocado-100/70 dark:bg-avocado-400/10'],
                ['Carbs', meal.macros.carbs, 'g', 'bg-butter-100/80 dark:bg-butter-400/10'],
                ['Fat', meal.macros.fat, 'g', 'bg-berry-100/70 dark:bg-berry-400/10'],
              ] as const).map(([label, v, unit, tone]) => (
                <div key={label} className={clsx('rounded-2xl p-3 text-center', tone)}>
                  <div className="text-lg font-extrabold tabular">{Math.round(v)}{unit}</div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between rounded-2xl bg-surface-2 p-3">
            <div>
              <div className="text-sm font-bold">Servings for this meal</div>
              <div className="text-xs text-muted">
                Recipe written for {meal.baseServings}. {pm?.servings !== undefined ? 'Custom for this meal.' : day.servings !== undefined ? `Following ${day.label}.` : 'Following the week.'}
                {pm?.servings !== undefined && (
                  <button className="ml-1 font-semibold text-tomato-600 dark:text-tomato-400" onClick={() => setMealServings(dayIndex, slot, undefined)}>Reset</button>
                )}
              </div>
            </div>
            <Stepper value={servings} highlighted={pm?.servings !== undefined} label="Meal servings" onChange={(n) => setMealServings(dayIndex, slot, n)} />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-muted">Ingredients</h3>
            <ul className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
              {meal.ingredients.map((i, idx) => (
                <li key={idx} className="flex items-baseline gap-2 text-sm">
                  <span className="min-w-14 font-bold tabular text-tomato-600 dark:text-tomato-400">{ingredientText(i, scale)}</span>
                  <span>
                    {i.name}
                    {i.note && <span className="text-muted">, {i.note}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-muted">Steps</h3>
            <ol className="space-y-2">
              {meal.steps.map((s, idx) => (
                <li key={idx} className="flex gap-3 text-sm leading-relaxed">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-xs font-bold text-bg">{idx + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </Sheet>
  );
}
