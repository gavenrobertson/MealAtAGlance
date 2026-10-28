import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GeneratedPlan, LockedMeal, Meal, MealSlot, PlannedMeal, WeekPlan } from '../../shared/types';
import { DAY_LABELS, MEAL_SLOTS } from '../../shared/types';
import { api } from '../lib/api';
import { uid } from '../lib/format';
import { usePrefs } from './prefs';
import { toast } from './toast';

interface Status {
  generating: boolean;
  progressDays: number;
  message?: string;
  error?: string;
  /** "dayIndex:slot" of meals currently being regenerated. */
  pendingMeals: string[];
}

interface PlanState {
  plan: WeekPlan | null;
  saved: WeekPlan[];
  status: Status;
  generate: (request: string) => Promise<void>;
  cancel: () => void;
  regenerateMeal: (dayIndex: number, slot: MealSlot, hint?: string) => Promise<void>;
  toggleLock: (dayIndex: number, slot: MealSlot) => void;
  removeMeal: (dayIndex: number, slot: MealSlot) => void;
  /** Put a specific meal (e.g. a picked idea) into one day/slot. */
  setMeal: (dayIndex: number, slot: MealSlot, meal: Meal, source: WeekPlan['source']) => void;
  /** Fill the week from picked ideas: each slot's picks rotate across unlocked days. */
  applyPicks: (picks: Partial<Record<MealSlot, Meal[]>>, source: WeekPlan['source']) => void;
  setWeekServings: (n: number) => void;
  setDayServings: (dayIndex: number, n: number | undefined) => void;
  setMealServings: (dayIndex: number, slot: MealSlot, n: number | undefined) => void;
  resetServingOverrides: () => void;
  renamePlan: (name: string) => void;
  savePlan: () => void;
  loadPlan: (id: string) => void;
  deleteSaved: (id: string) => void;
  clearPlan: () => void;
}

const IDLE: Status = { generating: false, progressDays: 0, pendingMeals: [] };
let controller: AbortController | null = null;

const clampServings = (n: number) => Math.min(20, Math.max(1, Math.round(n)));

function lockedMeals(plan: WeekPlan | null): LockedMeal[] {
  if (!plan) return [];
  return plan.days.flatMap((day, dayIndex) =>
    MEAL_SLOTS.flatMap((slot) => {
      const pm = day.meals[slot];
      return pm?.locked ? [{ dayIndex, slot, meal: pm.meal }] : [];
    }),
  );
}

function fromGenerated(gen: GeneratedPlan, request: string, previous: WeekPlan | null, servings: number): WeekPlan {
  return {
    id: uid(),
    name: gen.planName,
    notes: gen.notes,
    request,
    createdAt: Date.now(),
    weekServings: servings,
    source: gen.source,
    days: DAY_LABELS.map((label, i) => {
      const meals: Partial<Record<MealSlot, PlannedMeal>> = {};
      for (const slot of MEAL_SLOTS) {
        const meal = gen.days[i]?.[slot];
        if (!meal) continue;
        const prev = previous?.days[i]?.meals[slot];
        // Locked meals keep their lock and any per-meal servings override.
        meals[slot] = prev?.locked && prev.meal.id === meal.id ? prev : { meal, locked: false };
      }
      return { label, meals };
    }),
  };
}

function emptyPlan(servings: number, source: WeekPlan['source']): WeekPlan {
  return {
    id: uid(),
    name: 'My Picks Week',
    notes: 'Built from meal ideas you picked.',
    request: usePrefs.getState().draftRequest,
    createdAt: Date.now(),
    weekServings: servings,
    source,
    days: DAY_LABELS.map((label) => ({ label, meals: {} })),
  };
}

export const usePlan = create<PlanState>()(
  persist(
    (set, get) => {
      const updateMeal = (dayIndex: number, slot: MealSlot, fn: (pm: PlannedMeal) => PlannedMeal | undefined) =>
        set((s) => {
          if (!s.plan) return s;
          const days = s.plan.days.map((d, i) => {
            if (i !== dayIndex || !d.meals[slot]) return d;
            const next = fn(d.meals[slot]!);
            const meals = { ...d.meals };
            if (next) meals[slot] = next;
            else delete meals[slot];
            return { ...d, meals };
          });
          return { plan: { ...s.plan, days } };
        });

      return {
        plan: null,
        saved: [],
        status: IDLE,

        async generate(request) {
          controller?.abort();
          controller = new AbortController();
          const { prefs, demoData } = usePrefs.getState();
          const previous = get().plan;
          set({ status: { ...IDLE, generating: true, message: 'Warming up the kitchen…' } });
          try {
            let received = false;
            await api.plan(
              { request, preferences: prefs, locked: lockedMeals(previous) },
              demoData,
              (ev) => {
                if (ev.type === 'progress') set((s) => ({ status: { ...s.status, progressDays: Math.max(s.status.progressDays, ev.days), message: ev.message ?? s.status.message } }));
                if (ev.type === 'error') throw new Error(ev.error);
                if (ev.type === 'plan') {
                  received = true;
                  set({ plan: fromGenerated(ev.plan, request, previous, previous?.weekServings ?? prefs.householdServings), status: IDLE });
                }
              },
              controller.signal,
            );
            if (!received) throw new Error('The planner stopped before sending a plan.');
          } catch (err) {
            if ((err as Error).name === 'AbortError') {
              set({ status: IDLE });
              return;
            }
            set({ status: { ...IDLE, error: (err as Error).message } });
            toast((err as Error).message, 'error');
          }
        },

        cancel() {
          controller?.abort();
          set({ status: IDLE });
        },

        async regenerateMeal(dayIndex, slot, hint) {
          const { plan } = get();
          if (!plan) return;
          const key = `${dayIndex}:${slot}`;
          const { prefs, demoData } = usePrefs.getState();
          set((s) => ({ status: { ...s.status, pendingMeals: [...s.status.pendingMeals, key] } }));
          try {
            const avoid = plan.days.flatMap((d) => Object.values(d.meals).map((m) => m!.meal.title));
            const { meal } = await api.meal({ request: plan.request, preferences: prefs, dayIndex, slot, avoid, hint }, demoData);
            set((s) => {
              if (!s.plan) return s;
              const days = s.plan.days.map((d, i) => {
                if (i !== dayIndex) return d;
                const prev = d.meals[slot];
                return { ...d, meals: { ...d.meals, [slot]: { meal, locked: false, servings: prev?.servings } } };
              });
              return { plan: { ...s.plan, days } };
            });
          } catch (err) {
            toast(`Couldn't swap that meal: ${(err as Error).message}`, 'error');
          } finally {
            set((s) => ({ status: { ...s.status, pendingMeals: s.status.pendingMeals.filter((k) => k !== key) } }));
          }
        },

        toggleLock: (d, slot) => updateMeal(d, slot, (pm) => ({ ...pm, locked: !pm.locked })),
        removeMeal: (d, slot) => updateMeal(d, slot, () => undefined),

        setMeal(dayIndex, slot, meal, source) {
          const plan = get().plan ?? emptyPlan(usePrefs.getState().prefs.householdServings, source);
          const days = plan.days.map((d, i) => {
            if (i !== dayIndex) return d;
            const prev = d.meals[slot];
            return { ...d, meals: { ...d.meals, [slot]: { meal: { ...meal, id: uid() }, locked: false, servings: prev?.servings } } };
          });
          set({ plan: { ...plan, days } });
        },

        applyPicks(picks, source) {
          const plan = get().plan ?? emptyPlan(usePrefs.getState().prefs.householdServings, source);
          const days = plan.days.map((d) => ({ ...d, meals: { ...d.meals } }));
          for (const slot of MEAL_SLOTS) {
            const list = picks[slot];
            if (!list?.length) continue;
            let n = 0;
            for (const day of days) {
              const prev = day.meals[slot];
              if (prev?.locked) continue;
              // Fresh id per placement so each day's copy is independent (servings, locks, swaps).
              day.meals[slot] = { meal: { ...structuredClone(list[n++ % list.length]), id: uid() }, locked: false, servings: prev?.servings };
            }
          }
          set({ plan: { ...plan, days } });
        },
        setMealServings: (d, slot, n) => updateMeal(d, slot, (pm) => ({ ...pm, servings: n === undefined ? undefined : clampServings(n) })),

        setWeekServings: (n) => set((s) => (s.plan ? { plan: { ...s.plan, weekServings: clampServings(n) } } : s)),
        setDayServings: (dayIndex, n) =>
          set((s) => {
            if (!s.plan) return s;
            const days = s.plan.days.map((d, i) => (i === dayIndex ? { ...d, servings: n === undefined ? undefined : clampServings(n) } : d));
            return { plan: { ...s.plan, days } };
          }),
        resetServingOverrides: () =>
          set((s) => {
            if (!s.plan) return s;
            const days = s.plan.days.map((d) => ({
              ...d,
              servings: undefined,
              meals: Object.fromEntries(Object.entries(d.meals).map(([k, pm]) => [k, { ...pm!, servings: undefined }])),
            }));
            return { plan: { ...s.plan, days } };
          }),

        renamePlan: (name) => set((s) => (s.plan ? { plan: { ...s.plan, name } } : s)),
        savePlan() {
          const { plan, saved } = get();
          if (!plan) return;
          const copy: WeekPlan = { ...structuredClone(plan), id: uid(), createdAt: Date.now() };
          set({ saved: [copy, ...saved.filter((p) => p.name !== plan.name)].slice(0, 20) });
          toast(`Saved “${plan.name}”`, 'success');
        },
        loadPlan(id) {
          const found = get().saved.find((p) => p.id === id);
          if (found) set({ plan: structuredClone(found) });
        },
        deleteSaved: (id) => set((s) => ({ saved: s.saved.filter((p) => p.id !== id) })),
        clearPlan: () => set({ plan: null }),
      };
    },
    { name: 'maag:plan', version: 1, partialize: (s) => ({ plan: s.plan, saved: s.saved }) },
  ),
);
