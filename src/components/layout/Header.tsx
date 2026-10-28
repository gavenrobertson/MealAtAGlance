import clsx from 'clsx';
import { Monitor, Moon, SlidersHorizontal, Sun } from 'lucide-react';
import { Button } from '../ui/Button';
import { Segmented } from '../ui/Segmented';
import { usePrefs, type Theme } from '../../store/prefs';
import { useShop } from '../../store/shop';

export type Tab = 'plan' | 'groceries';

const NEXT_THEME: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' };
const THEME_ICON = { system: Monitor, light: Sun, dark: Moon };

export function Header({ tab, onTab, onOpenPrefs }: { tab: Tab; onTab: (t: Tab) => void; onOpenPrefs: () => void }) {
  const { theme, setTheme, demoData, setDemoData } = usePrefs();
  const config = useShop((s) => s.config);
  const anyLive = !!config && (config.ai.live || config.providers.some((p) => p.live));
  const ThemeIcon = THEME_ICON[theme];
  // "Demo data" is on when forced by the user/server, or when nothing has keys yet.
  const demoActive = demoData || !!config?.demoForced || (!!config && !anyLive);

  return (
    <header className="no-print sticky top-0 z-40 border-b border-line/70 bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1520px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <a href="#" onClick={(e) => (e.preventDefault(), onTab('plan'))} className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-tomato-500 text-lg shadow-[0_6px_16px_-6px_rgb(255_90_54/0.8)]">🥗</span>
          <span className="hidden text-[17px] font-extrabold tracking-tight sm:block">
            Meal <span className="text-tomato-500">at a</span> Glance
          </span>
        </a>

        <div className="mx-auto">
          <Segmented<Tab>
            label="Section"
            value={tab}
            onChange={onTab}
            options={[
              { value: 'plan', label: 'Plan' },
              { value: 'groceries', label: 'Groceries' },
            ]}
          />
        </div>

        <button
          onClick={() => setDemoData(!demoData)}
          disabled={!anyLive && !demoData}
          title={anyLive ? 'Toggle mock data' : 'No API keys configured yet. Everything runs on demo data.'}
          className={clsx(
            'hidden items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition md:inline-flex',
            demoActive
              ? 'border-butter-400 bg-butter-100 text-butter-800 dark:border-butter-400/40 dark:bg-butter-400/15 dark:text-butter-300'
              : 'border-avocado-400 bg-avocado-100 text-avocado-800 dark:border-avocado-400/40 dark:bg-avocado-400/15 dark:text-avocado-300',
          )}
        >
          <span className={clsx('h-2 w-2 rounded-full', demoActive ? 'bg-butter-500' : 'animate-pulse bg-avocado-500')} />
          {demoActive ? 'Demo data' : 'Live data'}
        </button>

        <Button size="icon" variant="ghost" onClick={() => setTheme(NEXT_THEME[theme])} aria-label={`Theme: ${theme}`} title={`Theme: ${theme}`}>
          <ThemeIcon size={18} />
        </Button>
        <Button size="icon" variant="ghost" onClick={onOpenPrefs} aria-label="Preferences" title="Preferences">
          <SlidersHorizontal size={18} />
        </Button>
      </div>
    </header>
  );
}
