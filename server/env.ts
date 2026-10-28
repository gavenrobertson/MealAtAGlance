/** Server-side configuration. Every key lives here and never reaches the browser. */
export interface Env {
  ANTHROPIC_API_KEY?: string;
  CLAUDE_MODEL?: string;
  CLAUDE_EFFORT?: 'low' | 'medium' | 'high';

  WALMART_CONSUMER_ID?: string;
  WALMART_KEY_VERSION?: string;
  /** PKCS#8 PEM. In .env you can use literal "\n" for newlines. */
  WALMART_PRIVATE_KEY?: string;
  WALMART_PUBLISHER_ID?: string;

  KROGER_CLIENT_ID?: string;
  KROGER_CLIENT_SECRET?: string;
  KROGER_LOCATION_ID?: string;
  /** Defaults to production; use https://api-ce.kroger.com/v1 for the certification sandbox. */
  KROGER_API_BASE?: string;

  INSTACART_API_KEY?: string;
  INSTACART_ENV?: 'development' | 'production';

  /** Force demo data everywhere, regardless of configured keys. */
  DEMO_MODE?: string;
}

export const isTruthy = (v?: string) => !!v && !['0', 'false', 'no', 'off'].includes(v.toLowerCase());
