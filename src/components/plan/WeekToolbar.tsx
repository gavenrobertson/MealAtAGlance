import { ArrowRight, Bookmark, FolderOpen, RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type React from 'react';
import { usePlan } from '../../store/plan';
import { toast } from '../../store/toast';
import { Button } from '../ui/Button';
import { SavedPlansSheet } from './SavedPlansSheet';

export function WeekToolbar({ onGoToGroceries }: { onGoToGroceries: () => void }) {
  const { plan, saved, renamePlan, savePlan, clearPlan, resetServingOverrides } = usePlan();
  const [savedOpen, setSavedOpen] = useState(false);
  if (!plan) return null;

  const hasOverrides = plan.days.some((d) => d.servings !== undefined || Object.values(d.meals).some((m) => m?.servings !== undefined));

  const clear = () => {
    const snapshot = plan;
    clearPlan();
    toast('Plan cleared', 'info', { label: 'Undo', onClick: () => usePlan.setState({ plan: snapshot }) });
  };

  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <input
            value={plan.name}
            onChange={(e) => renamePlan(e.target.value)}
            className="min-w-0 max-w-full rounded-xl bg-transparent px-1 -ml-1 text-xl font-extrabold tracking-tight hover:bg-surface-2 focus:bg-surface-2 focus:outline-none sm:text-2xl"
            aria-label="Plan name"
            size={Math.max(8, plan.name.length)}
            style={{ fieldSizing: 'content' } as React.CSSProperties}
          />
          <span className="chip bg-surface-2 text-muted">{plan.source === 'ai' ? '✨ AI plan' : '📚 Demo plan'}</span>
        </div>
        {plan.notes && <p className="mt-0.5 line-clamp-2 max-w-3xl text-sm text-muted">{plan.notes}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {hasOverrides && (
          <Button size="sm" variant="ghost" onClick={resetServingOverrides} title="Clear per-day and per-meal servings">
            <RotateCcw size={14} /> Reset servings
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={clear}>
          <Trash2 size={14} /> Clear
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setSavedOpen(true)}>
          <FolderOpen size={14} /> Saved{saved.length ? ` (${saved.length})` : ''}
        </Button>
        <Button size="sm" variant="secondary" onClick={savePlan}>
          <Bookmark size={14} /> Save week
        </Button>
        <Button size="sm" variant="primary" onClick={onGoToGroceries} className="sm:hidden">
          List <ArrowRight size={14} />
        </Button>
      </div>
      <SavedPlansSheet open={savedOpen} onClose={() => setSavedOpen(false)} />
    </div>
  );
}
