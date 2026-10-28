import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { MealSlot } from '../../../shared/types';
import { usePlan } from '../../store/plan';
import { PlannerPanel } from './PlannerPanel';
import { WeekToolbar } from './WeekToolbar';
import { WeekView } from './WeekView';
import { MealDetailSheet } from './MealDetailSheet';
import { GeneratingState } from './GeneratingState';
import { EmptyPlan } from './EmptyPlan';

export interface MealRef {
  dayIndex: number;
  slot: MealSlot;
}

export function PlanView({ onOpenPrefs, onGoToGroceries }: { onOpenPrefs: () => void; onGoToGroceries: () => void }) {
  const plan = usePlan((s) => s.plan);
  const generating = usePlan((s) => s.status.generating);
  const [open, setOpen] = useState<MealRef | null>(null);

  return (
    <div className="space-y-5">
      <PlannerPanel onOpenPrefs={onOpenPrefs} />
      <AnimatePresence mode="popLayout">
        {generating ? (
          <motion.div key="gen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <GeneratingState />
          </motion.div>
        ) : plan ? (
          <motion.div key={plan.id} className="space-y-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <WeekToolbar onGoToGroceries={onGoToGroceries} />
            <WeekView onOpenMeal={setOpen} />
          </motion.div>
        ) : (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <EmptyPlan />
          </motion.div>
        )}
      </AnimatePresence>
      <MealDetailSheet mealRef={open} onClose={() => setOpen(null)} />
    </div>
  );
}
