import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { IdeaGoal, Meal, MealSlot } from '../../shared/types';
import { api } from '../lib/api';
import { usePrefs } from './prefs';
import { toast } from './toast';

const BATCH = 6;

interface IdeasState {
  ideas: Partial<Record<MealSlot, Meal[]>>;
  /** Picked idea ids per slot, in the order they were picked. */
  selected: Partial<Record<MealSlot, string[]>>;
  goals: IdeaGoal[];
  loading: Partial<Record<MealSlot, boolean>>;
  /** No new ideas came back last time (demo library ran out). */
  exhausted: Partial<Record<MealSlot, boolean>>;
  source: 'ai' | 'demo';
  toggleGoal: (goal: IdeaGoal) => void;
  /** Fresh batch (keeps anything already picked) or `more` to append. */
  fetch: (slot: MealSlot, mode: 'fresh' | 'more') => Promise<void>;
  toggleSelect: (slot: MealSlot, id: string) => void;
  picks: () => Partial<Record<MealSlot, Meal[]>>;
  clearSelection: () => void;
}

export const useIdeas = create<IdeasState>()(
  persist(
    (set, get) => ({
      ideas: {},
      selected: {},
      goals: [],
      loading: {},
      exhausted: {},
      source: 'demo',

      toggleGoal: (goal) => set((s) => ({ goals: s.goals.includes(goal) ? s.goals.filter((g) => g !== goal) : [...s.goals, goal] })),

      async fetch(slot, mode) {
        if (get().loading[slot]) return;
        const { prefs, demoData, draftRequest } = usePrefs.getState();
        const current = get().ideas[slot] ?? [];
        const picked = current.filter((m) => get().selected[slot]?.includes(m.id));
        set((s) => ({ loading: { ...s.loading, [slot]: true } }));
        try {
          const { ideas, source } = await api.ideas(
            { request: draftRequest, preferences: prefs, slot, count: BATCH, goals: get().goals, avoid: current.map((m) => m.title) },
            demoData,
          );
          set((s) => ({
            ideas: { ...s.ideas, [slot]: mode === 'more' ? [...current, ...ideas] : [...picked, ...ideas] },
            exhausted: { ...s.exhausted, [slot]: ideas.length === 0 },
            source,
          }));
        } catch (err) {
          toast(`Couldn't get ideas: ${(err as Error).message}`, 'error');
        } finally {
          set((s) => ({ loading: { ...s.loading, [slot]: false } }));
        }
      },

      toggleSelect: (slot, id) =>
        set((s) => {
          const cur = s.selected[slot] ?? [];
          return { selected: { ...s.selected, [slot]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] } };
        }),

      picks: () => {
        const { ideas, selected } = get();
        const out: Partial<Record<MealSlot, Meal[]>> = {};
        for (const [slot, ids] of Object.entries(selected) as [MealSlot, string[]][]) {
          const meals = ids.map((id) => ideas[slot]?.find((m) => m.id === id)).filter((m): m is Meal => !!m);
          if (meals.length) out[slot] = meals;
        }
        return out;
      },

      clearSelection: () => set({ selected: {} }),
    }),
    { name: 'maag:ideas', version: 1, partialize: (s) => ({ ideas: s.ideas, selected: s.selected, goals: s.goals, source: s.source }) },
  ),
);
