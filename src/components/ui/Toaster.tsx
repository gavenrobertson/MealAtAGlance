import clsx from 'clsx';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useToasts } from '../../store/toast';

const ICON = { info: Info, success: CheckCircle2, error: AlertCircle };

export function Toaster() {
  const { toasts, dismiss } = useToasts();
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = ICON[t.tone];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ y: -20, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -10, opacity: 0, scale: 0.95 }}
              className="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-medium shadow-lift"
              role="status"
            >
              <Icon size={18} className={clsx(t.tone === 'error' ? 'text-tomato-500' : t.tone === 'success' ? 'text-avocado-500' : 'text-muted')} />
              <span className="flex-1">{t.message}</span>
              {t.action && (
                <button className="font-bold text-tomato-600 dark:text-tomato-400" onClick={() => (t.action!.onClick(), dismiss(t.id))}>
                  {t.action.label}
                </button>
              )}
              <button onClick={() => dismiss(t.id)} className="text-muted hover:text-ink" aria-label="Dismiss">
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
