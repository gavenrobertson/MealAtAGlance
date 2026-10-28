import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MatchResponse, Product } from '../../shared/types';
import type { ServerConfig } from '../lib/api';

export interface ProviderMeta {
  mode: MatchResponse['mode'];
  warning?: string;
  store?: MatchResponse['store'];
  errors: Record<string, string>;
}

interface ShopState {
  provider: string;
  config: ServerConfig | null;
  configError: string | null;
  /** User-chosen product per provider per ingredient key. Persisted. */
  overrides: Record<string, Record<string, string>>;
  /** Candidate products per provider per ingredient key. Session-only. */
  products: Record<string, Record<string, Product[]>>;
  meta: Record<string, ProviderMeta>;
  loading: Record<string, boolean>;
  /** Identifies what the cached products were fetched for (demo flag + ZIP). */
  cacheSig: string;
  setProvider: (id: string) => void;
  setConfig: (config: ServerConfig | null, error?: string) => void;
  setOverride: (provider: string, key: string, productId: string | null) => void;
  mergeProducts: (provider: string, res: MatchResponse) => void;
  setLoading: (provider: string, on: boolean) => void;
  resetProducts: (sig: string) => void;
}

export const useShop = create<ShopState>()(
  persist(
    (set) => ({
      provider: 'walmart',
      config: null,
      configError: null,
      overrides: {},
      products: {},
      meta: {},
      loading: {},
      cacheSig: '',
      setProvider: (provider) => set({ provider }),
      setConfig: (config, error) => set({ config, configError: error ?? null }),
      setOverride: (provider, key, productId) =>
        set((s) => {
          const forProvider = { ...s.overrides[provider] };
          if (productId) forProvider[key] = productId;
          else delete forProvider[key];
          return { overrides: { ...s.overrides, [provider]: forProvider } };
        }),
      mergeProducts: (provider, res) =>
        set((s) => {
          const prev = s.meta[provider];
          return {
            products: { ...s.products, [provider]: { ...s.products[provider], ...res.results } },
            meta: {
              ...s.meta,
              [provider]: {
                mode: res.mode,
                warning: res.warning,
                store: res.store ?? prev?.store,
                errors: { ...prev?.errors, ...res.errors },
              },
            },
          };
        }),
      setLoading: (provider, on) => set((s) => ({ loading: { ...s.loading, [provider]: on } })),
      resetProducts: (cacheSig) => set({ products: {}, meta: {}, cacheSig }),
    }),
    { name: 'maag:shop', version: 1, partialize: (s) => ({ provider: s.provider, overrides: s.overrides }) },
  ),
);
