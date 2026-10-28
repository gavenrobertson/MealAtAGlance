import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Header, type Tab } from './components/layout/Header';
import { SummaryBar } from './components/layout/SummaryBar';
import { PlanView } from './components/plan/PlanView';
import { GroceriesView } from './components/groceries/GroceriesView';
import { PreferencesSheet } from './components/plan/PreferencesSheet';
import { Toaster } from './components/ui/Toaster';
import { useGroceries } from './hooks/useGroceries';
import { usePricing } from './hooks/usePricing';
import { useTheme } from './hooks/useTheme';
import { api } from './lib/api';
import { usePrefs } from './store/prefs';
import { useShop } from './store/shop';

const tabFromHash = (): Tab => (location.hash === '#groceries' ? 'groceries' : 'plan');

export default function App() {
  const [tab, setTabState] = useState<Tab>(tabFromHash);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const demoData = usePrefs((s) => s.demoData);
  const groceries = useGroceries();
  useTheme();
  usePricing(groceries.rows.map((r) => r.item));

  const setTab = (t: Tab) => {
    setTabState(t);
    history.replaceState(null, '', t === 'groceries' ? '#groceries' : '#');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const onHash = () => setTabState(tabFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    api
      .config(demoData)
      .then((c) => useShop.getState().setConfig(c))
      .catch((err) => useShop.getState().setConfig(null, (err as Error).message));
  }, [demoData]);

  return (
    <div className="min-h-dvh">
      <Header tab={tab} onTab={setTab} onOpenPrefs={() => setPrefsOpen(true)} />
      <main className="mx-auto max-w-[1520px] px-4 pb-40 pt-4 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {tab === 'plan' ? (
              <PlanView onOpenPrefs={() => setPrefsOpen(true)} onGoToGroceries={() => setTab('groceries')} />
            ) : (
              <GroceriesView groceries={groceries} onGoToPlan={() => setTab('plan')} onOpenPrefs={() => setPrefsOpen(true)} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
      <SummaryBar groceries={groceries} tab={tab} onTab={setTab} />
      <PreferencesSheet open={prefsOpen} onClose={() => setPrefsOpen(false)} />
      <Toaster />
    </div>
  );
}
