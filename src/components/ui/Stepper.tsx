import clsx from 'clsx';
import { Minus, Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface Props {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md';
  label?: string;
  /** Visually mark a value that overrides an inherited one. */
  highlighted?: boolean;
  suffix?: string;
}

export function Stepper({ value, onChange, min = 1, max = 20, size = 'md', label, highlighted, suffix }: Props) {
  const btn = clsx('grid place-items-center rounded-full text-ink-soft transition hover:bg-surface-3 hover:text-ink active:scale-90 disabled:opacity-30', size === 'sm' ? 'h-6 w-6' : 'h-8 w-8');
  return (
    <div
      className={clsx(
        'inline-flex items-center rounded-full border p-0.5',
        highlighted ? 'border-tomato-300 bg-tomato-50 dark:border-tomato-500/40 dark:bg-tomato-500/10' : 'border-line bg-surface-2',
      )}
      role="group"
      aria-label={label}
    >
      <button className={btn} onClick={(e) => (e.stopPropagation(), onChange(value - 1))} disabled={value <= min} aria-label={`Decrease ${label ?? ''}`}>
        <Minus size={size === 'sm' ? 12 : 14} strokeWidth={2.5} />
      </button>
      <span className={clsx('relative overflow-hidden text-center font-bold tabular', size === 'sm' ? 'min-w-7 text-xs' : 'min-w-9 text-sm')}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span key={value} className="inline-block" initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }} transition={{ duration: 0.15 }}>
            {value}
            {suffix}
          </motion.span>
        </AnimatePresence>
      </span>
      <button className={btn} onClick={(e) => (e.stopPropagation(), onChange(value + 1))} disabled={value >= max} aria-label={`Increase ${label ?? ''}`}>
        <Plus size={size === 'sm' ? 12 : 14} strokeWidth={2.5} />
      </button>
    </div>
  );
}
