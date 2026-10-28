import { animate, useMotionValue, useTransform, motion } from 'motion/react';
import { useEffect } from 'react';

interface Props {
  value: number;
  format?: (n: number) => string;
  className?: string;
}

/** Counts smoothly up or down to `value`. */
export function AnimatedNumber({ value, format = (n) => String(Math.round(n)), className }: Props) {
  const mv = useMotionValue(value);
  const text = useTransform(mv, format);
  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.7, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [mv, value]);
  return <motion.span className={className}>{text}</motion.span>;
}
