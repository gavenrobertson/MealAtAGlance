import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Unit } from '../../shared/types';
import type { PantryEntry } from '../../shared/list';

interface PantryState {
  /** Keyed by canonical ingredient name, so it carries over to next week's plan. */
  entries: Record<string, PantryEntry>;
  setOwned: (key: string, owned: boolean) => void;
  setPartial: (key: string, quantity: number, unit: Unit) => void;
  forget: (key: string) => void;
  clear: () => void;
}

export const usePantry = create<PantryState>()(
  persist(
    (set) => ({
      entries: {},
      setOwned: (key, owned) =>
        set((s) => {
          const entries = { ...s.entries };
          if (owned) entries[key] = { mode: 'all', updatedAt: Date.now() };
          else delete entries[key];
          return { entries };
        }),
      setPartial: (key, quantity, unit) =>
        set((s) => {
          const entries = { ...s.entries };
          if (quantity > 0) entries[key] = { mode: 'partial', quantity, unit, updatedAt: Date.now() };
          else delete entries[key];
          return { entries };
        }),
      forget: (key) => set((s) => {
        const entries = { ...s.entries };
        delete entries[key];
        return { entries };
      }),
      clear: () => set({ entries: {} }),
    }),
    { name: 'maag:pantry', version: 1 },
  ),
);
