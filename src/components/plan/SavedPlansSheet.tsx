import { Trash2 } from 'lucide-react';
import { usePlan } from '../../store/plan';
import { Button } from '../ui/Button';
import { Sheet } from '../ui/Sheet';

export function SavedPlansSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { saved, loadPlan, deleteSaved, plan } = usePlan();
  return (
    <Sheet open={open} onClose={onClose} title="Saved weeks" subtitle="Stored on this device.">
      {saved.length === 0 ? (
        <div className="rounded-3xl bg-surface-2 p-6 text-center text-sm text-muted">No saved weeks yet. Hit “Save week” to keep a plan you like.</div>
      ) : (
        <ul className="space-y-2">
          {saved.map((p) => {
            const meals = p.days.reduce((n, d) => n + Object.keys(d.meals).length, 0);
            const emojis = p.days.flatMap((d) => Object.values(d.meals).map((m) => m!.meal.emoji)).slice(0, 6).join('');
            return (
              <li key={p.id} className="flex items-center gap-3 rounded-2xl border border-line p-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">{p.name}</div>
                  <div className="text-xs text-muted">
                    {new Date(p.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {meals} meals · {emojis}
                  </div>
                </div>
                <Button size="sm" variant={plan?.name === p.name ? 'soft' : 'secondary'} onClick={() => (loadPlan(p.id), onClose())}>
                  Load
                </Button>
                <Button size="icon-sm" variant="danger" onClick={() => deleteSaved(p.id)} aria-label={`Delete ${p.name}`}>
                  <Trash2 size={15} />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}
