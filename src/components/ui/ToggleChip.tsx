import clsx from 'clsx';
import { Check } from 'lucide-react';
import type { ReactNode } from 'react';

export function ToggleChip({ on, onClick, children, tone = 'tomato' }: { on: boolean; onClick: () => void; children: ReactNode; tone?: 'tomato' | 'avocado' }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-all active:scale-95',
        on
          ? tone === 'tomato'
            ? 'border-tomato-500 bg-tomato-500 text-white'
            : 'border-avocado-500 bg-avocado-500 text-white'
          : 'border-line bg-surface text-ink-soft hover:border-ink/20 hover:text-ink',
      )}
    >
      {on && <Check size={14} strokeWidth={3} />}
      {children}
    </button>
  );
}
