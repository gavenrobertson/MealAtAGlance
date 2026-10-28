import { motion } from 'motion/react';
import { DAY_LABELS } from '../../../shared/types';
import { usePlan } from '../../store/plan';

const FOODS = ['🥑', '🍋', '🥕', '🍗', '🫐', '🥦', '🍅', '🧄'];

export function GeneratingState() {
  const { progressDays, message } = usePlan((s) => s.status);
  const pct = Math.min(100, Math.round((progressDays / 7) * 100));
  const current = DAY_LABELS[Math.min(6, progressDays)];

  return (
    <div className="space-y-4">
      <div className="card flex flex-col items-center gap-4 px-6 py-8 text-center">
        <div className="flex gap-1.5 text-2xl" aria-hidden>
          {FOODS.map((f, i) => (
            <motion.span key={f} animate={{ y: [0, -10, 0] }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.1, ease: 'easeInOut' }}>
              {f}
            </motion.span>
          ))}
        </div>
        <div>
          <div className="text-lg font-extrabold">{progressDays > 0 ? `Planning ${current}…` : message ?? 'Planning your week…'}</div>
          <div className="text-sm text-muted">Balancing your preferences, budget and cook times.</div>
        </div>
        <div className="h-2 w-full max-w-sm overflow-hidden rounded-full bg-surface-2">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-butter-400 via-tomato-500 to-berry-500" animate={{ width: `${Math.max(8, pct)}%` }} transition={{ type: 'spring', stiffness: 80, damping: 20 }} />
        </div>
      </div>
      <div className="hidden grid-cols-7 gap-3 lg:grid" aria-hidden>
        {DAY_LABELS.map((d, i) => (
          <div key={d} className="space-y-2 rounded-3xl bg-surface-2/60 p-2">
            <div className="skeleton h-6 w-16 rounded-full" style={{ opacity: i < progressDays ? 1 : 0.5 }} />
            {[0, 1, 2].map((j) => (
              <div key={j} className="skeleton h-28 rounded-2xl" style={{ opacity: i < progressDays ? 1 : 0.5 }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
