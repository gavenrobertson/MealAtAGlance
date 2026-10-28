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
import { IdeasSheet } from './IdeasSheet';

export interface MealRef {
  dayIndex: number;
  slot: MealSlot;
}

export function PlanView({ onOpenPrefs, onGoToGroceries }: { onOpenPrefs: () => void; onGoToGroceries: () => void }) {
  const plan = usePlan((s) => s.plan);
  const generating = usePlan((s) => s.status.generating);
  const [open, setOpen] = useState<MealRef | null>(null);
  const [ideas, setIdeas] = useState<{ open: boolean; target: MealRef | null }>({ open: false, target: null });
  const browseIdeas = (target: MealRef | null = null) => setIdeas({ open: true, target });

  return (
    <div className="space-y-5">
      <PlannerPanel onOpenPrefs={onOpenPrefs} onBrowseIdeas={() => browseIdeas()} />
      <AnimatePresence mode="popLayout">
        {generating ? (
          <motion.div key="gen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <GeneratingState />
          </motion.div>
        ) : plan ? (
          <motion.div key={plan.id} className="space-y-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <WeekToolbar onGoToGroceries={onGoToGroceries} />
            <WeekView onOpenMeal={setOpen} onPickIdea={browseIdeas} />
          </motion.div>
        ) : (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <EmptyPlan onBrowseIdeas={() => browseIdeas()} />
          </motion.div>
        )}
      </AnimatePresence>
      <MealDetailSheet mealRef={open} onClose={() => setOpen(null)} onBrowseIdeas={(ref) => (setOpen(null), browseIdeas(ref))} />
      <IdeasSheet open={ideas.open} target={ideas.target} onClose={() => setIdeas((s) => ({ ...s, open: false }))} />
    </div>
  );
}
