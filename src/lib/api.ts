import type {
  CheckoutItem, MatchRequestItem, MatchResponse, Meal, MealRequest, PlanRequest, PlanStreamEvent, ProviderInfo,
} from '../../shared/types';

export interface ServerConfig {
  demoForced: boolean;
  ai: { live: boolean; model: string };
  providers: ProviderInfo[];
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

const q = (demo: boolean) => (demo ? '?demo=1' : '');
const post = (url: string, body: unknown, signal?: AbortSignal) =>
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal });

export const api = {
  config: (demo: boolean) => fetch(`/api/config${q(demo)}`).then((r) => json<ServerConfig>(r)),

  /** Streams NDJSON progress events from the planner. */
  async plan(req: PlanRequest, demo: boolean, onEvent: (ev: PlanStreamEvent) => void, signal?: AbortSignal) {
    const res = await post(`/api/plan${q(demo)}`, req, signal);
    if (!res.ok || !res.body) await json(res);
    const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
    let buf = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += value;
      let nl: number;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (line) onEvent(JSON.parse(line) as PlanStreamEvent);
      }
    }
  },

  meal: (req: MealRequest, demo: boolean) => post(`/api/plan/meal${q(demo)}`, req).then((r) => json<{ meal: Meal; source: 'ai' | 'demo' }>(r)),

  match: (provider: string, items: MatchRequestItem[], zipCode: string, demo: boolean) =>
    post(`/api/stores/${provider}/match${q(demo)}`, { items, zipCode: zipCode || undefined }).then((r) => json<MatchResponse>(r)),

  checkout: (provider: string, items: CheckoutItem[], zipCode: string) =>
    post(`/api/stores/${provider}/checkout`, { items, zipCode: zipCode || undefined }).then((r) => json<{ url: string }>(r)),
};
