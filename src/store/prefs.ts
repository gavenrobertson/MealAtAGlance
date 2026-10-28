import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MealSlot, Preferences } from '../../shared/types';
import { DEFAULT_PREFERENCES } from '../../shared/types';

export type Theme = 'system' | 'light' | 'dark';

interface PrefsState {
  prefs: Preferences;
  theme: Theme;
  /** Force mock prices and the demo recipe library even when keys are configured. */
  demoData: boolean;
  /** Last thing typed into the planner box. */
  draftRequest: string;
  setPrefs: (patch: Partial<Preferences>) => void;
  setSlot: (slot: MealSlot, on: boolean) => void;
  setTheme: (theme: Theme) => void;
  setDemoData: (on: boolean) => void;
  setDraftRequest: (text: string) => void;
}

export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      prefs: DEFAULT_PREFERENCES,
      theme: 'system',
      demoData: false,
      draftRequest: 'High-protein, no seafood, quick lunches, ~$120 budget',
      setPrefs: (patch) => set((s) => ({ prefs: { ...s.prefs, ...patch } })),
      setSlot: (slot, on) => set((s) => ({ prefs: { ...s.prefs, slots: { ...s.prefs.slots, [slot]: on } } })),
      setTheme: (theme) => set({ theme }),
      setDemoData: (demoData) => set({ demoData }),
      setDraftRequest: (draftRequest) => set({ draftRequest }),
    }),
    {
      name: 'maag:prefs',
      version: 1,
      // New preference fields get defaults when loading older saved state.
      merge: (persisted, current) => {
        const p = persisted as Partial<PrefsState>;
        return { ...current, ...p, prefs: { ...DEFAULT_PREFERENCES, ...p.prefs, slots: { ...DEFAULT_PREFERENCES.slots, ...p.prefs?.slots } } };
      },
    },
  ),
);
