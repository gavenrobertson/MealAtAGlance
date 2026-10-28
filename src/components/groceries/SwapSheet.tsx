import clsx from 'clsx';
import { Check, ExternalLink, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { pickBestProduct, priceLine, relevance } from '../../../shared/pricing';
import { formatQuantity } from '../../../shared/units';
import type { GroceryRow } from '../../hooks/useGroceries';
import { money, titleCase } from '../../lib/format';
import { usePrefs } from '../../store/prefs';
import { useShop } from '../../store/shop';
import { Button } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import { ProductThumb } from './ProductThumb';

type Sort = 'price' | 'relevance';

export function SwapSheet({ row, provider, onClose }: { row: GroceryRow | undefined; provider: string; onClose: () => void }) {
  const units = usePrefs((s) => s.prefs.units);
  const setOverride = useShop((s) => s.setOverride);
  const storeName = useShop((s) => s.config?.providers.find((p) => p.id === provider)?.name);
  const [sort, setSort] = useState<Sort>('price');

  const options = useMemo(() => {
    if (!row) return [];
    const qty = row.need.need ?? row.item.total;
    const candidates = row.candidates[provider] ?? [];
    const best = pickBestProduct(row.item.key, qty, candidates)?.product.id;
    const list = candidates.map((p, i) => ({ line: priceLine(row.item.key, qty, p), rank: i, rel: relevance(row.item.key, p.name), best: p.id === best }));
    return list.sort((a, b) => (sort === 'price' ? a.line.cost - b.line.cost : b.rel - a.rel || a.rank - b.rank));
  }, [row, provider, sort]);

  const current = row?.lines[provider]?.product.id;

  return (
    <Sheet
      open={!!row}
      onClose={onClose}
      wide
      title={row ? `Swap ${titleCase(row.item.name)}` : ''}
      subtitle={row && <>Need {formatQuantity(row.need.need ?? row.item.total, units)} · {options.length} options at {storeName}</>}
      footer={
        row?.overridden[provider] && (
          <Button size="sm" variant="ghost" onClick={() => (setOverride(provider, row.item.key, null), onClose())}>
            <Sparkles size={14} /> Go back to the best match
          </Button>
        )
      }
    >
      <div className="mb-3 flex gap-1.5">
        {(['price', 'relevance'] as const).map((s) => (
          <button key={s} onClick={() => setSort(s)} className={clsx('rounded-full px-3 py-1 text-xs font-bold', sort === s ? 'bg-ink text-bg' : 'bg-surface-2 text-ink-soft')}>
            {s === 'price' ? 'Cheapest for what you need' : 'Best match'}
          </button>
        ))}
      </div>
      <ul className="space-y-2">
        {options.map(({ line, best }) => {
          const p = line.product;
          const selected = p.id === current;
          return (
            <li key={p.id}>
              <button
                onClick={() => row && (setOverride(provider, row.item.key, best ? null : p.id), onClose())}
                className={clsx(
                  'flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition hover:border-tomato-300 hover:bg-surface-2/60',
                  selected ? 'border-tomato-500 bg-tomato-50/60 dark:bg-tomato-500/10' : 'border-line',
                )}
              >
                <ProductThumb product={p} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-2 text-sm font-semibold">{p.name}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                    <span>{p.sizeText}</span>
                    <span className="tabular">{money(p.price)}{p.soldByWeight ? '/lb' : ' each'}</span>
                    {p.regularPrice && <span className="line-through">{money(p.regularPrice)}</span>}
                    {best && <span className="chip !py-0 bg-avocado-100 text-avocado-800 dark:bg-avocado-400/15 dark:text-avocado-300">Best value</span>}
                    {line.sizeUnknown && <span title="Couldn't read the package size, assuming one">size?</span>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-extrabold tabular">{money(line.cost)}</div>
                  <div className="text-xs text-muted tabular">{p.soldByWeight ? `${line.packs.toFixed(2)} lb` : `× ${line.packs}`}</div>
                </div>
                <span className="w-5">{selected && <Check size={18} className="text-tomato-500" strokeWidth={3} />}</span>
              </button>
              {p.url && (
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="ml-[76px] mt-1 inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink">
                  View at store <ExternalLink size={11} />
                </a>
              )}
            </li>
          );
        })}
        {!options.length && <li className="rounded-2xl bg-surface-2 p-6 text-center text-sm text-muted">No products found for this item.</li>}
      </ul>
    </Sheet>
  );
}
