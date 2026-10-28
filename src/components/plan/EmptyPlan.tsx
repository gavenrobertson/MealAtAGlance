const STEPS = [
  { emoji: '💬', title: 'Describe your week', body: 'Diet, budget, how much time you have. Plain words are fine.' },
  { emoji: '🗓️', title: 'Tweak the plan', body: 'Lock favorites, swap any meal, scale servings by week, day or meal.' },
  { emoji: '🛒', title: 'Shop it', body: 'One merged list, pantry items checked off, priced at real stores.' },
];

export function EmptyPlan({ onBrowseIdeas }: { onBrowseIdeas: () => void }) {
  return (
    <div className="space-y-3">
    <button
      onClick={onBrowseIdeas}
      className="card flex w-full items-center gap-4 p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lift"
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-butter-100 text-2xl dark:bg-butter-400/15">💡</span>
      <span className="flex-1">
        <span className="block font-bold">Rather choose for yourself?</span>
        <span className="block text-sm text-muted">Browse meal ideas (low cost, high protein, meal prep…), pick the ones you like, and we'll build the week from them.</span>
      </span>
      <span className="hidden text-sm font-bold text-tomato-600 sm:block dark:text-tomato-400">Browse ideas →</span>
    </button>
    <div className="grid gap-3 sm:grid-cols-3">
      {STEPS.map((s, i) => (
        <div key={s.title} className="card flex gap-4 p-5">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-surface-2 text-2xl">{s.emoji}</div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-tomato-500">Step {i + 1}</div>
            <div className="font-bold">{s.title}</div>
            <p className="mt-0.5 text-sm text-muted">{s.body}</p>
          </div>
        </div>
      ))}
    </div>
    </div>
  );
}
