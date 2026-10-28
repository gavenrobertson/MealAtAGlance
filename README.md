# 🥗 Meal at a Glance

An AI weekly meal-prep planner that turns a plan into a priced grocery list from real store APIs.

Describe your week ("high-protein, no seafood, quick lunches, ~$120 budget"). Claude plans 7 days of meals. Every ingredient is merged into one shopping list with normalized units. You check off what's already in your pantry, and the rest is matched to real products at Walmart, Kroger or Instacart and totaled side by side.

**It works out of the box with no API keys.** Demo-data mode uses a built-in recipe library and realistic mock prices. Add keys one at a time and each part switches to live data.

---

## Quick start

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:5173. That's it, demo mode.

To go live, copy the env template and fill in whichever keys you have (see [API keys](#api-keys-what-you-need-and-how-to-get-them)):

```bash
cp .env.example .env
```

Restart `npm run dev`. On startup the API prints which integrations are live:

```
🍽️  Meal at a Glance API on http://localhost:8787
   AI: live · Walmart: live · Kroger: demo · Instacart: demo
```

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite frontend (5173) + API server (8787) with hot reload. Vite proxies `/api` to the server. |
| `npm run build` | Typecheck and build the frontend into `dist/` |
| `npm start` | Production: one Node process serves the API and `dist/` on `PORT` (default 8787) |
| `npm test` | Unit tests: unit math, list merging, pricing, planners, Walmart/Kroger adapters with mocked APIs |
| `npm run typecheck` | `tsc --noEmit` across frontend, server and shared code |
| `npm run keys:walmart` | Generate the RSA key pair Walmart's API requires |

---

## Features

- **Planner.** Free-text request plus a preferences panel: diets, allergies (hard rules), dislikes, cuisines, weekly budget, dinner time limit, a quick-meal limit for breakfast and lunch, ZIP, and US or metric units.
- **Portion controls at three levels.** Week servings, a per-day override and a per-meal override. Overrides are highlighted and can be reset.
- **Meals per day.** Breakfast, lunch, dinner and snack can each be toggled on or off. Turning a slot off removes it from the list instantly.
- **Lock or swap any meal.** "Regenerate this one" accepts an optional nudge ("something lighter"). "Regenerate week" keeps locked meals and plans around them.
- **Shopping list.** Ingredients are canonicalized ("2 Large Onions, diced" → `yellow onion`) and units normalized, then merged. `2 lb chicken + 12 oz chicken = 2.75 lb`. Three recipes needing onions become one line. Counts convert to weight where it makes sense (2 onions + 200 g onion → ~1.1 lb).
- **Pantry check.** Every line has an "I have this" toggle and a "have some?" partial-quantity input. Owned items slide into an "Already in your pantry" section, struck through and excluded from totals. The pantry is remembered across sessions and plans.
- **Store pricing.** Each remaining item is matched to a real product with price, size and image. Package math buys enough packs to cover what you need (`2 × 2.5 lb`), and sold-by-weight items are prorated. **Swap** opens every candidate, sorted by cost for what you need.
- **Store switcher and comparison.** A segmented control with each store's total, a "Cheapest" badge, the difference from the cheapest, and a budget over/under indicator.
- **Hand-off.** Walmart affiliate add-to-cart link, Instacart shopping-list link, copy-to-clipboard and print.
- **Saved weeks.** Save, load and delete plans. Preferences, pantry, product swaps and the current plan persist in `localStorage`.
- **Design.** Soft rounded cards, a tomato accent with avocado, butter and berry secondaries, and light and dark mode. Micro-animations include checkbox pops, rows sliding out, totals counting up and down, and spring-swapped meal cards. A 7-column week grid on desktop becomes swipeable, snap-scrolling day cards on mobile. A sticky summary bar shows meals, items to buy, items owned and the estimated total.

---

## Architecture

```
Browser (React)                     Server (Hono — Node or Cloudflare Worker)
┌───────────────────────────┐       ┌──────────────────────────────────────────────┐
│ zustand stores            │       │ POST /api/plan          → Claude (streamed)  │
│  prefs · plan · pantry ·  │ /api  │ POST /api/plan/meal     → Claude / demo lib  │
│  shop (persisted locally) │──────▶│ POST /api/stores/:id/match → provider adapter│
│                           │       │ POST /api/stores/:id/checkout                │
│ shared/ list math runs    │       │ GET  /api/config        → what's live        │
│ client-side (instant)     │       │                                              │
└───────────────────────────┘       │ keys live here only · TTL cache · retries    │
                                    └──────────────────────────────────────────────┘
```

Some design choices:

- **Keys never reach the browser.** All third-party calls go through the API server, which also removes any CORS problems. The same Hono app runs on Node (`server/node.ts`) or as a Cloudflare Worker (`server/worker.ts` + `wrangler.toml`). The Walmart request signing uses WebCrypto, so it runs on both.
- **List math is deterministic code, not AI.** Claude returns **structured JSON** constrained by a JSON Schema (`server/ai/schema.ts`): units come from a fixed enum, ingredient names are canonical, quantities are numbers. Code in `shared/` then does all the merging, unit conversion, pantry subtraction and package math. That code is shared by client and server and covered by tests.
- **Prices are fetched per item and cached, then chosen on the client.** The server returns candidate products for each ingredient (cached 6 hours to respect rate limits). The browser picks the best one for the needed quantity, so servings changes, pantry toggles and swaps re-total instantly with no new API calls.
- **Graceful degradation.** A store without keys, an item with no live match, or a rate-limited request each fall back to an estimate for that item only, flagged in the UI. Totals never silently drop items.

### Folder structure

```
shared/                 Types + pure logic used by both sides
  types.ts              Domain + API payload types
  units.ts              Unit conversion, name canonicalization, retail size parsing, formatting
  list.ts               Plan → merged shopping list; pantry subtraction
  pricing.ts            Package math, relevance, best-product choice
server/
  app.ts                Hono routes (validated with zod)
  node.ts | worker.ts   Runtime entries
  env.ts                Every server-side setting
  ai/                   Claude planner (claude.ts, prompt.ts, schema.ts) + offline demo planner
  providers/            Store adapter layer
    types.ts            StoreProvider interface
    index.ts            Registry + matching/caching/fallback logic
    walmart.ts kroger.ts instacart.ts
    demo.ts             Realistic mock pricing used when a store has no keys
  data/                 Demo recipe library + demo product catalog
src/
  store/                zustand stores (persisted)
  hooks/                useGroceries (derived list + totals), usePricing (fetching), useTheme
  components/
    plan/               Planner panel, week grid, meal cards, meal detail, preferences
    groceries/          Store switcher, list rows, swap sheet, pantry
    layout/ ui/         Header, sticky summary bar, primitives (Sheet, Stepper, PopCheck…)
scripts/walmart-keygen.ts
```

### Adding a store

Write one file in `server/providers/` that exports a `StoreProvider`, then add it to the `PROVIDERS` array in `server/providers/index.ts`. The UI picks it up automatically: switcher, comparison, pricing and checkout.

```ts
export const target: StoreProvider = {
  id: 'target', name: 'Target', color: '#cc0000',
  capabilities: { livePrices: true, checkout: false, storeSpecific: true },
  demo: { priceFactor: 1.08, storeBrand: 'Good & Gather', organicBrand: 'Good & Gather Organic' },
  searchUrl: (q) => `https://www.target.com/s?searchTerm=${encodeURIComponent(q)}`,
  isConfigured: (env) => !!env.TARGET_API_KEY,
  async searchProducts(query, ctx) { /* call API, map to Product[] */ },
  async getPrice(productId, ctx) { /* optional */ },
  async checkout(items, ctx) { /* optional: return { url } */ },
};
```

---

## Store APIs: what's realistically available to an individual developer

| Store | Official API? | What you get | Access |
| --- | --- | --- | --- |
| **Walmart** (default) | ✅ Walmart Affiliate API (walmart.io) | Search, item lookup, price, size, images, affiliate links, add-to-cart link | Requires approval into the Walmart affiliate program. Free. |
| **Kroger** (+ Ralphs, Fred Meyer, King Soopers, Harris Teeter, Smith's, Fry's, QFC…) | ✅ Kroger Public API | Search with **store-specific** prices and promos, store locator. A Cart API exists but needs per-user OAuth (not wired yet). | Self-serve and free. The easiest live integration. |
| **Instacart** | ⚠️ Instacart Developer Platform | **No search or prices.** Creates a shopping-list link where the user picks a retailer and checks out. | Self-serve dev key; production keys need review. |
| Target, Costco, Aldi, Safeway/Albertsons, Whole Foods | ❌ No public pricing APIs | Only via paid third-party data/scraping services (e.g. SerpApi, RedCircle) | Paid; terms-of-service risk. Not included. |
| Amazon Fresh / Whole Foods | ⚠️ Product Advertising API | General catalog; grocery prices are spotty | Requires an Associates account with qualifying sales. |

**Recommendation:** Walmart and Kroger for real prices, plus Instacart as the "send my list somewhere" hand-off. That covers most US shoppers. Instacart reaches Aldi, Costco, Safeway and others through its own retailer picker.

### Limitations to know about

- **Walmart prices are national online prices,** not your local store's shelf price. Kroger's are store-specific.
- **Totals are estimates.** Product matching is a best guess (you can swap). Some package sizes can't be parsed, in which case one pack is assumed and flagged "size?". Sold-by-weight items are prorated.
- **Instacart prices are always estimated** (in-store prices plus a typical markup), because the API doesn't expose prices.
- **Rate limits.** Search results are cached server-side for 6 hours, and requests run at most 4 at a time per store. A cold 60-item list is about 60 search calls per live store.
- **The Walmart add-to-cart link** uses the affiliate `addToCart?items=ID|QTY` format. Walmart has changed cart-link formats before, so verify it with your account.
- **Persistence is per-browser** (`localStorage`). Moving to a database means swapping the zustand `persist` storage for an API. The store shapes are already serializable.
- **Demo planner** picks from about 45 built-in recipes and rotates breakfasts and lunches for batch prep. Claude produces fully custom plans.

---

## API keys: what you need and how to get them

Everything below goes in `.env` (server-side only). Each one is optional.

### Claude (meal generation) · `ANTHROPIC_API_KEY`

1. Create an account at https://console.anthropic.com and add billing.
2. **Settings → API keys → Create key**, then paste it as `ANTHROPIC_API_KEY`.

Defaults: model `claude-opus-5-5`, streamed, with structured outputs (JSON Schema). Server-side refusal fallbacks are enabled (`fallbacks: "default"`), so a rare false-positive safety decline is retried on another model instead of failing the request. You can override the model with `CLAUDE_MODEL` and the effort with `CLAUDE_EFFORT` (`low`, `medium` or `high`). A full week is one request and usually takes 30–90 seconds. The UI shows day-by-day progress.

### Walmart · `WALMART_CONSUMER_ID`, `WALMART_KEY_VERSION`, `WALMART_PRIVATE_KEY_PATH`

1. **Join the Walmart affiliate program** through Impact (https://affiliates.walmart.com → apply). Approval is manual and can take a few days.
2. **Register at https://walmart.io** with the same email and request Affiliate API access for an application.
3. **Generate a key pair** locally:
   ```bash
   npm run keys:walmart
   ```
   This writes `keys/walmart_private_key.pem` (gitignored, keep it secret) and `keys/walmart_public_key.pem`.
4. **Upload the public key** in your walmart.io application. Walmart then shows a **Consumer ID** and **key version**.
5. Set `WALMART_CONSUMER_ID`, `WALMART_KEY_VERSION` and `WALMART_PRIVATE_KEY_PATH=keys/walmart_private_key.pem`. On serverless hosts you can paste the PEM into `WALMART_PRIVATE_KEY` instead, with `\n` for newlines.
6. Optional: `WALMART_PUBLISHER_ID` (your Impact publisher id) so product links earn affiliate credit.

How it works: each request is signed. The server signs `consumerId\ntimestamp\nkeyVersion\n` with your private key (RSA-SHA256) and sends the result as the `WM_SEC.AUTH_SIGNATURE` header. Search uses `/api-proxy/service/affil/product/v2/search`, filtered to the Food department, with a fallback to all departments. If you generated a key with OpenSSL and it starts with `BEGIN RSA PRIVATE KEY`, convert it first:

```bash
openssl pkcs8 -topk8 -inform PEM -in key.pem -out key.pk8.pem -nocrypt
```

### Kroger · `KROGER_CLIENT_ID`, `KROGER_CLIENT_SECRET`

1. Sign up at https://developer.kroger.com and **Create an application**.
2. Enable the **Products** API (scope `product.compact`) and copy the **Client ID** and **Client Secret**.
3. Put your **ZIP code** in the app's Preferences. The server finds the nearest Kroger-family store and prices from it. Or pin a store with `KROGER_LOCATION_ID`.
4. New apps sometimes start in the certification sandbox. If production credentials are rejected, set `KROGER_API_BASE=https://api-ce.kroger.com/v1`.

### Instacart · `INSTACART_API_KEY`

1. Sign up for the Instacart Developer Platform (docs: https://docs.instacart.com/developer_platform_api/).
2. Create a **development** API key. It works against `connect.dev.instacart.tools` (`INSTACART_ENV=development`).
3. Request production access when ready and switch to `INSTACART_ENV=production`.

This enables the **Send to Instacart** button, which builds a shopping-list link from your remaining items. Prices for Instacart stay estimated.

---

## Deploying

**Single Node server:**

```bash
npm run build
```

```bash
npm start
```

**Cloudflare Workers:** `wrangler.toml` is included and serves `dist/` as static assets and `/api/*` from `server/worker.ts`.

```bash
npm run build
```

```bash
npx wrangler secret put ANTHROPIC_API_KEY
```

Repeat for each key, using `WALMART_PRIVATE_KEY` with the PEM contents instead of a file path. Then deploy:

```bash
npx wrangler deploy
```

> Search caches are in-memory per instance. On Workers, swap `TTLCache` in `server/cache.ts` for KV if you need a cache shared across instances.
