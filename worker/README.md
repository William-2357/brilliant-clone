# AI helper Worker (no Blaze plan)

A tiny Cloudflare Worker that holds the OpenAI key and powers the app's two AI
helpers, routed by a `kind` field: the blackjack **dealer-coach** (`'blackjack'`)
and **wrong-answer explanations** for lessons + the Problem of the Day (`'explain'`).
It runs on Cloudflare's **free tier** — no Firebase Blaze plan, no Cloud Functions.
The browser never sees the key.

This is the free analog of a Supabase Edge Function: an external origin that holds
the secret, which your Firebase-hosted site calls cross-origin (CORS) with a
graceful fallback. It only ever **narrates / explains** numbers the app already
computed (the blackjack engine's EVs and optimal action, or a problem's correct
answer) — it never recomputes or contradicts them. If the Worker is unreachable,
the app falls back to the deterministic blackjack template (`src/lib/coach.ts`) or
the author's hand-written feedback, so the app always works.

> Already deployed the coach? **Redeploy** (`npm run coach:deploy`) after pulling
> this update so the Worker handles the new `kind: 'explain'` requests.

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
a narration arrives, **offline** if it falls back. Wrong-answer explanations in the
lessons + Problem of the Day are controlled by the **AI explanations** toggle in
**Profile → Preferences** (on by default).

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

`POST { kind, input }` → `{ text }` (2-4 plain-language sentences grounded in the
app's numbers). `kind` defaults to `'blackjack'`. On any error it returns a non-200
JSON `{ error }`, and the client falls back.

- `kind: 'blackjack'`, `input`: the `CoachInput` shape from `src/lib/coach.ts`
  (player hand, dealer upcard, `ev` per action, `optimalAction`, bust chances, count).
- `kind: 'explain'`, `input`: the `ExplainInput` shape from `src/lib/explain.ts`
  (`topic`, `question`, `interaction`, `unit`, `learnerAnswer`, `correctAnswer`,
  `tolerance`, `authorHint`).
