import { ProviderError, type StoreProvider } from './types';

/**
 * Instacart Developer Platform (docs.instacart.com/developer_platform_api).
 * The public API does not expose product search or prices. It turns a list into an
 * Instacart "shopping list" page where the shopper picks a retailer and checks out.
 * So prices here are always estimates (typical Instacart markup over in-store), and
 * the live part is the hand-off link.
 */
const HOSTS = { development: 'https://connect.dev.instacart.tools', production: 'https://connect.instacart.com' };

// Instacart accepts a fixed set of unit names on line items.
const UNIT_MAP: Record<string, string> = {
  each: 'each', ct: 'each', lb: 'pound', oz: 'ounce', g: 'gram', kg: 'kilogram', gal: 'gallon',
  cup: 'cup', cups: 'cup', tbsp: 'tablespoon', tsp: 'teaspoon', 'fl oz': 'fl oz', ml: 'milliliter', l: 'liter',
  can: 'can', cans: 'can', bunch: 'bunch', bunches: 'bunch', head: 'head', heads: 'head', clove: 'each', cloves: 'each',
  package: 'package',
};

export const instacart: StoreProvider = {
  id: 'instacart',
  name: 'Instacart',
  color: '#0aad0a',
  note: 'Estimated prices (Instacart has no public pricing API). Sends your list to Instacart to check out.',
  capabilities: { livePrices: false, checkout: true, storeSpecific: false },
  demo: { priceFactor: 1.17, storeBrand: 'Signature Select', organicBrand: 'O Organics', promoRate: 0.12 },
  searchUrl: (q) => `https://www.instacart.com/store/s?k=${encodeURIComponent(q)}`,

  isConfigured: (env) => !!env.INSTACART_API_KEY,

  async searchProducts() {
    // No search API: the registry serves estimates for providers without livePrices.
    return [];
  },

  async checkout(items, { env }) {
    const host = HOSTS[env.INSTACART_ENV === 'production' ? 'production' : 'development'];
    const res = await fetch(`${host}/idp/v1/products/products_link`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.INSTACART_API_KEY}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        title: 'Meal at a Glance — weekly groceries',
        link_type: 'shopping_list',
        line_items: items.map((i) => ({
          name: i.name,
          quantity: Math.round(i.quantity * 100) / 100,
          unit: UNIT_MAP[i.unit.toLowerCase()] ?? 'each',
          display_text: i.name,
        })),
      }),
    });
    if (!res.ok) throw new ProviderError(`Instacart API ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
    const data = (await res.json()) as { products_link_url: string };
    return { url: data.products_link_url };
  },
};
