import clsx from 'clsx';
import { useState } from 'react';
import type { Product } from '../../../shared/types';

export function ProductThumb({ product, size = 'md' }: { product: Product; size?: 'md' | 'lg' }) {
  const [broken, setBroken] = useState(false);
  const box = size === 'lg' ? 'h-14 w-14 text-3xl' : 'h-11 w-11 text-2xl';
  return (
    <div className={clsx('grid shrink-0 place-items-center overflow-hidden rounded-xl bg-white ring-1 ring-line dark:bg-surface-2', box)}>
      {product.image && !broken ? (
        <img src={product.image} alt="" loading="lazy" onError={() => setBroken(true)} className="h-full w-full object-contain p-1" />
      ) : (
        <span aria-hidden>{product.emoji ?? '🛒'}</span>
      )}
    </div>
  );
}
