import clsx from 'clsx';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'soft' | 'danger';
type Size = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-tomato-500 text-white shadow-[0_8px_20px_-8px_rgb(255_90_54/0.7)] hover:bg-tomato-600 active:bg-tomato-700',
  secondary: 'bg-surface text-ink border border-line hover:bg-surface-2',
  ghost: 'text-ink-soft hover:bg-surface-2 hover:text-ink',
  soft: 'bg-tomato-50 text-tomato-700 hover:bg-tomato-100 dark:bg-tomato-500/15 dark:text-tomato-300 dark:hover:bg-tomato-500/25',
  danger: 'text-tomato-700 hover:bg-tomato-50 dark:text-tomato-300 dark:hover:bg-tomato-500/15',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-full',
  md: 'h-10 px-4 text-sm gap-2 rounded-full',
  lg: 'h-12 px-6 text-[15px] gap-2 rounded-full',
  icon: 'h-10 w-10 rounded-full',
  'icon-sm': 'h-8 w-8 rounded-full',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = 'secondary', size = 'md', className, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={clsx(
        'inline-flex shrink-0 select-none items-center justify-center font-semibold transition-[background-color,color,transform,box-shadow] duration-150 active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
});
