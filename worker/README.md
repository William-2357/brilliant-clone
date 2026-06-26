# Dealer-coach Worker (no Blaze plan)

A tiny Cloudflare Worker that holds the OpenAI key and narrates the blackjack
engine's numbers. It runs on Cloudflare's **free tier** — no Firebase Blaze plan,
no Cloud Functions. The browser never sees the key.

This is the free analog of a Supabase Edge Function: an external origin that holds
the secret, which your Firebase-hosted site calls cross-origin (CORS) with a
graceful fallback. It only ever **narrates** the numbers `src/lib/blackjack.ts`
already computed (EV per action, the optimal action, bust chances, the true
count) — it never recomputes or contradicts them. If the Worker is unreachable,
the app falls back to the deterministic explanation in `src/lib/coach.ts`, so
coaching always works.

## One-time deploy

From the repo root:

```bash
# 1) Install + log in to Cloudflare (free account)
npm install                 # installs wrangler (dev dependency)
npx wrangler login

# 2) Deploy the Worker
npm run coach:deploy        # = wrangler deploy -c worker/wrangler.jsonc

# 3) Store the OpenAI key as a Worker secret (never in the client bundle)
npx wrangler secret put OPENAI_API_KEY -c worker/wrangler.jsonc   # paste sk-...
```

Wrangler prints the Worker URL, e.g. `https://longrun-coach.<subdomain>.workers.dev`.

## Point the app at it

Add the URL to the app's `.env`, then rebuild + redeploy hosting:

```bash
# .env
VITE_COACH_ENDPOINT=https://longrun-coach.<subdomain>.workers.dev

npm run build && firebase deploy --only hosting
```

Turn the **AI dealer-coach** toggle on in the Arcade — the badge shows **AI** when
a narration arrives, **offline** if it falls back.

## Local development

```bash
cp worker/.dev.vars.example worker/.dev.vars   # paste your key into worker/.dev.vars
npm run coach:dev                              # wrangler dev on http://localhost:8787
# .env:  VITE_COACH_ENDPOINT=http://localhost:8787   (then restart `npm run dev`)
```

## Configuration (`worker/wrangler.jsonc`)

- `COACH_MODEL` — OpenAI model (default `gpt-4o-mini`).
- `ALLOWED_ORIGINS` — comma-separated browser origins allowed to call the Worker.
  Leave blank during setup; **tighten to your site origin(s) once deployed** to
  stop other sites from spending your quota, e.g.
  `https://brilliant-clone-69be8.web.app,http://localhost:5173`.

For stronger protection (against non-browser callers) add a Cloudflare WAF
rate-limiting rule or Turnstile in front of the Worker.

## Contract

`POST { input }` where `input` is the `CoachInput` shape from `src/lib/coach.ts`.
Returns `{ text }` — 2-3 plain-language sentences grounded in the engine's numbers.
On any error it returns a non-200 JSON `{ error }`, and the client falls back.
