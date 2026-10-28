import clsx from 'clsx';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  /** "side" slides from the right on desktop; "center" is a dialog. Both are bottom sheets on mobile. */
  variant?: 'side' | 'center';
  footer?: ReactNode;
  wide?: boolean;
}

export function Sheet({ open, onClose, title, subtitle, children, variant = 'center', footer, wide }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  const side = variant === 'side';
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
          <motion.div className="absolute inset-0 bg-black/35 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            className={clsx(
              'relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-4xl bg-surface shadow-lift sm:rounded-4xl',
              side ? 'sm:fixed sm:inset-y-3 sm:right-3 sm:max-h-none sm:w-[440px]' : wide ? 'sm:max-w-2xl' : 'sm:max-w-lg',
            )}
            initial={side ? { x: 40, opacity: 0 } : { y: 40, opacity: 0, scale: 0.98 }}
            animate={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            exit={side ? { x: 40, opacity: 0 } : { y: 40, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 36 }}
          >
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-surface-3 sm:hidden" />
            {(title || subtitle) && (
              <div className="flex items-start gap-3 px-6 pb-3 pt-5">
                <div className="min-w-0 flex-1">
                  {title && <h2 className="text-lg font-extrabold tracking-tight">{title}</h2>}
                  {subtitle && <div className="mt-0.5 text-sm text-muted">{subtitle}</div>}
                </div>
                <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink" aria-label="Close">
                  <X size={18} />
                </button>
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">{children}</div>
            {footer && <div className="border-t border-line bg-surface px-6 py-4">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
