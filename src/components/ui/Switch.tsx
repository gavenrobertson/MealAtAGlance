import clsx from 'clsx';
import { motion } from 'motion/react';

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={clsx('relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors', checked ? 'bg-tomato-500' : 'bg-surface-3')}
    >
      <motion.span layout transition={{ type: 'spring', stiffness: 700, damping: 35 }} className={clsx('h-5 w-5 rounded-full bg-white shadow', checked && 'ml-auto')} />
    </button>
  );
}
