import clsx from 'clsx';
import { X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { ALLERGENS, DIETS, MEAL_SLOTS } from '../../../shared/types';
import { SLOT_META } from '../../lib/format';
import { usePantry } from '../../store/pantry';
import { usePlan } from '../../store/plan';
import { usePrefs, type Theme } from '../../store/prefs';
import { useShop } from '../../store/shop';
import { Button } from '../ui/Button';
import { Segmented } from '../ui/Segmented';
import { Sheet } from '../ui/Sheet';
import { Stepper } from '../ui/Stepper';
import { Switch } from '../ui/Switch';
import { ToggleChip } from '../ui/ToggleChip';

const CUISINES = ['Mexican', 'Italian', 'Mediterranean', 'Chinese', 'Japanese', 'Thai', 'Indian', 'Korean', 'American', 'Middle Eastern'];

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="space-y-2.5 border-b border-line py-5 first:pt-1 last:border-0">
      <div>
        <h3 className="text-sm font-extrabold">{title}</h3>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Slider({ value, min, max, step, onChange, format }: { value: number; min: number; max: number; step: number; onChange: (n: number) => void; format: (n: number) => string }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 flex-1 cursor-pointer appearance-none rounded-full accent-tomato-500"
        style={{ background: `linear-gradient(to right, var(--color-tomato-500) ${pct}%, var(--surface-3) ${pct}%)` }}
      />
      <span className="w-20 text-right text-sm font-extrabold tabular">{format(value)}</span>
    </div>
  );
}

function TagInput({ values, onChange, placeholder }: { values: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim().toLowerCase();
    if (v && !values.includes(v)) onChange([...values, v]);
    setDraft('');
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-line bg-surface-2 p-2 focus-within:border-tomato-300">
      {values.map((v) => (
        <span key={v} className="chip bg-surface text-ink ring-1 ring-line">
          {v}
          <button onClick={() => onChange(values.filter((x) => x !== v))} aria-label={`Remove ${v}`} className="text-muted hover:text-ink">
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') (e.preventDefault(), add());
          if (e.key === 'Backspace' && !draft && values.length) onChange(values.slice(0, -1));
        }}
        onBlur={add}
        placeholder={values.length ? '' : placeholder}
        className="min-w-24 flex-1 bg-transparent px-1 py-0.5 text-sm placeholder:text-muted focus:outline-none"
      />
    </div>
  );
}

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export function PreferencesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { prefs, setPrefs, setSlot, theme, setTheme, demoData, setDemoData } = usePrefs();
  const plan = usePlan((s) => s.plan);
  const setWeekServings = usePlan((s) => s.setWeekServings);
  const config = useShop((s) => s.config);
  const configError = useShop((s) => s.configError);
  const pantryCount = usePantry((s) => Object.keys(s.entries).length);
  const clearPantry = usePantry((s) => s.clear);

  return (
    <Sheet open={open} onClose={onClose} variant="side" title="Preferences" subtitle="Used every time a plan or meal is generated. Saved on this device.">
      <Section title="Household" hint="Default servings per meal, and which meals to plan.">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Servings per meal</span>
          <Stepper value={prefs.householdServings} label="Household servings" onChange={(n) => (setPrefs({ householdServings: Math.max(1, Math.min(20, n)) }), plan && setWeekServings(n))} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {MEAL_SLOTS.map((s) => (
            <ToggleChip key={s} on={prefs.slots[s]} onClick={() => setSlot(s, !prefs.slots[s])} tone="avocado">
              {SLOT_META[s].emoji} {SLOT_META[s].label}
            </ToggleChip>
          ))}
        </div>
      </Section>

      <Section title="Diet">
        <div className="flex flex-wrap gap-1.5">
          {DIETS.map((d) => (
            <ToggleChip key={d} on={prefs.diets.includes(d)} onClick={() => setPrefs({ diets: toggle(prefs.diets, d) })} tone="avocado">
              {d}
            </ToggleChip>
          ))}
        </div>
      </Section>

      <Section title="Allergies" hint="Treated as hard rules, never included.">
        <div className="flex flex-wrap gap-1.5">
          {ALLERGENS.map((a) => (
            <ToggleChip key={a} on={prefs.allergies.includes(a)} onClick={() => setPrefs({ allergies: toggle(prefs.allergies, a) })}>
              {a}
            </ToggleChip>
          ))}
        </div>
      </Section>

      <Section title="Dislikes" hint="Ingredients to avoid. Press Enter to add.">
        <TagInput values={prefs.dislikes} onChange={(dislikes) => setPrefs({ dislikes })} placeholder="mushrooms, cilantro…" />
      </Section>

      <Section title="Favorite cuisines">
        <div className="flex flex-wrap gap-1.5">
          {CUISINES.map((c) => (
            <ToggleChip key={c} on={prefs.cuisines.includes(c)} onClick={() => setPrefs({ cuisines: toggle(prefs.cuisines, c) })} tone="avocado">
              {c}
            </ToggleChip>
          ))}
        </div>
      </Section>

      <Section title="Budget & time">
        <div className="space-y-3">
          <div>
            <div className="mb-1 text-xs font-semibold text-muted">Weekly grocery budget</div>
            <Slider value={prefs.weeklyBudget} min={40} max={400} step={5} onChange={(weeklyBudget) => setPrefs({ weeklyBudget })} format={(n) => `$${n}`} />
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold text-muted">Max time for dinners (prep + cook)</div>
            <Slider value={prefs.maxCookMinutes} min={10} max={120} step={5} onChange={(maxCookMinutes) => setPrefs({ maxCookMinutes })} format={(n) => `${n} min`} />
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold text-muted">Quick meals (breakfast & lunch)</div>
            <Slider value={prefs.quickMealMinutes} min={5} max={60} step={5} onChange={(quickMealMinutes) => setPrefs({ quickMealMinutes })} format={(n) => `${n} min`} />
          </div>
        </div>
      </Section>

      <Section title="Shopping" hint="ZIP picks your nearest store for store-specific prices (Kroger).">
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={prefs.zipCode}
            inputMode="numeric"
            maxLength={5}
            onChange={(e) => setPrefs({ zipCode: e.target.value.replace(/\D/g, '').slice(0, 5) })}
            placeholder="ZIP code"
            className="h-10 w-32 rounded-full border border-line bg-surface-2 px-4 text-sm font-semibold tabular focus:border-tomato-300 focus:outline-none"
          />
          <Segmented size="sm" label="Units" value={prefs.units} onChange={(units) => setPrefs({ units })} options={[{ value: 'us', label: 'US units' }, { value: 'metric', label: 'Metric' }]} />
        </div>
        {pantryCount > 0 && (
          <div className="flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-2.5 text-sm">
            <span>Pantry remembers <b>{pantryCount}</b> item{pantryCount > 1 ? 's' : ''}</span>
            <Button size="sm" variant="danger" onClick={clearPantry}>Forget all</Button>
          </div>
        )}
      </Section>

      <Section title="Data" hint="Demo data uses mock prices and the built-in recipe library, so you can try everything without API keys.">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Use demo data</span>
          <Switch checked={demoData} onChange={setDemoData} label="Use demo data" />
        </div>
        {configError ? (
          <p className="rounded-2xl bg-tomato-50 p-3 text-xs text-tomato-700 dark:bg-tomato-500/10 dark:text-tomato-300">API server unreachable: {configError}. Is <code>npm run dev</code> running?</p>
        ) : (
          config && (
            <ul className="divide-y divide-line rounded-2xl border border-line text-sm">
              <StatusRow label="Meal AI" live={config.ai.live} detail={config.ai.model} />
              {config.providers.map((p) => (
                <StatusRow key={p.id} label={p.name} live={p.live} detail={p.live ? 'Live prices' : p.capabilities.livePrices ? 'Demo prices' : 'Estimated prices'} />
              ))}
            </ul>
          )
        )}
        <p className="text-xs text-muted">Keys live in the server's <code className="rounded bg-surface-2 px-1">.env</code>. See the README for how to get each one.</p>
      </Section>

      <Section title="Appearance">
        <Segmented<Theme> size="sm" label="Theme" value={theme} onChange={setTheme} options={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
      </Section>
    </Sheet>
  );
}

function StatusRow({ label, live, detail }: { label: string; live: boolean; detail: string }) {
  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <span className={clsx('h-2 w-2 rounded-full', live ? 'bg-avocado-500' : 'bg-butter-400')} />
      <span className="font-semibold">{label}</span>
      <span className="ml-auto text-xs text-muted">{detail}</span>
    </li>
  );
}
