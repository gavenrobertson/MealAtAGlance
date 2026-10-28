import type { CheckoutItem, Product } from '../../shared/types';
import type { Env } from '../env';

export interface ProviderContext {
  env: Env;
  zipCode?: string;
  /** Store/location chosen by the user (Kroger needs one for prices). */
  locationId?: string;
}

/** How this store's prices look in demo mode, so totals differ realistically between stores. */
export interface DemoProfile {
  priceFactor: number;
  storeBrand: string;
  organicBrand: string;
  /** Share of products that show a sale price (0..1). */
  promoRate?: number;
}

/**
 * One grocery store. Adding a store = writing one file that exports one of these
 * and listing it in ./index.ts.
 */
export interface StoreProvider {
  id: string;
  name: string;
  /** Accent color for the provider chip in the UI. */
  color: string;
  note?: string;
  capabilities: { livePrices: boolean; checkout: boolean; storeSpecific: boolean };
  demo: DemoProfile;
  /** Public search page, used for demo product links. */
  searchUrl(query: string): string;
  /** True when the keys this provider needs are present. */
  isConfigured(env: Env): boolean;
  /** Live product search. Return products in the store's own relevance order. */
  searchProducts(query: string, ctx: ProviderContext): Promise<Product[]>;
  /** Fresh price for one product (used to re-check a swapped product). */
  getPrice?(productId: string, ctx: ProviderContext): Promise<Product | null>;
  /** Resolve the physical store prices come from, if prices are store-specific. */
  resolveStore?(ctx: ProviderContext): Promise<{ id: string; name: string }>;
  /** Hand the list off to the store: a cart or shopping-list URL. */
  checkout?(items: CheckoutItem[], ctx: ProviderContext): Promise<{ url: string }>;
}

export class ProviderError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message);
  }
}
