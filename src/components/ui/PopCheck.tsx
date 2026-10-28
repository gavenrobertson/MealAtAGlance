import clsx from 'clsx';
import { Check } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  checked: boolean;
  partial?: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

/** Round "I have this" checkbox with a springy pop. */
export function PopCheck({ checked, partial, onChange, label }: Props) {
  return (
    <motion.button
      role="checkbox"
      aria-checked={partial ? 'mixed' : checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      whileTap={{ scale: 0.85 }}
      animate={checked ? { scale: [1, 1.28, 0.94, 1] } : { scale: 1 }}
      transition={{ duration: 0.38, ease: 'easeOut' }}
      className={clsx(
        'grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition-colors',
        checked
          ? 'border-avocado-500 bg-avocado-500 text-white'
          : partial
            ? 'border-avocado-400 bg-avocado-100 text-avocado-600 dark:bg-avocado-400/20'
            : 'border-line bg-surface hover:border-avocado-400',
      )}
    >
      <motion.span initial={false} animate={{ scale: checked || partial ? 1 : 0, rotate: checked ? 0 : -45 }} transition={{ type: 'spring', stiffness: 600, damping: 20 }}>
        {partial && !checked ? <span className="block h-0.5 w-3 rounded bg-current" /> : <Check size={15} strokeWidth={3.5} />}
      </motion.span>
    </motion.button>
  );
}
