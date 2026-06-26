/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  /**
   * HTTPS endpoint for the AI dealer-coach — the Cloudflare Worker in `worker/`
   * (or a local `wrangler dev` server) that holds the OpenAI key. When set, the
   * client POSTs the game state here; when unset, the coach uses no AI and falls
   * back to the offline templated explanation.
   */
  readonly VITE_COACH_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
