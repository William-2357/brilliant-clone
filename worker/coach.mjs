/**
 * Cloudflare Worker — "The Long Run" AI helper (Phase 2 AI).
 *
 * This is the ONLY place that holds the OpenAI key and talks to the model; the
 * browser never sees a secret. It runs free on Cloudflare's Workers free tier —
 * NO Firebase Blaze plan required. One endpoint serves two tasks, routed by `kind`
 * in the POST body:
 *   - 'blackjack' → narrate why the Arcade engine's optimal play wins (it receives
 *     the numbers `src/lib/blackjack.ts` already computed and must never recompute
 *     or contradict them).
 *   - 'explain'   → explain a wrong lesson / Problem-of-the-Day answer, treating the
 *     app-computed correct answer as ground truth (it must never contradict it).
 *
 * The client (`src/lib/coachClient.ts`) degrades gracefully: on any failure it falls
 * back to the deterministic template / hand-written feedback, so the app works with
 * the AI off or this Worker unreachable.
 *
 * Deploy (from the repo root):
 *   npm run coach:deploy                         # wrangler deploy -c worker/wrangler.jsonc
 *   npx wrangler secret put OPENAI_API_KEY -c worker/wrangler.jsonc   # paste sk-...
 * Then point the app at the Worker URL and rebuild:
 *   # .env:  VITE_COACH_ENDPOINT=https://longrun-coach.<subdomain>.workers.dev
 *   npm run build && firebase deploy --only hosting
 *
 * Local dev:  npm run coach:dev   (uses worker/.dev.vars for OPENAI_API_KEY)
 */

const BLACKJACK_SYSTEM = [
  'You are a concise, friendly blackjack coach inside a probability-and-statistics learning app.',
  'A deterministic engine has ALREADY computed every number you are given (expected values, the',
  'optimal action, dealer bust chance, bust-if-hit chance, true count). These numbers are the',
  'source of truth. You MUST NOT recompute, change, round differently, or contradict them.',
  'Explain in 2-3 short, plain-language sentences WHY the optimal action has the best expected',
  'value, citing the relevant numbers you were given. Frame everything around long-run expected',
  'value and variance — this is for learning, not for beating a casino. Do not give betting or',
  'money-management advice. Do not mention that you are an AI or a language model.',
].join(' ');

const EXPLAIN_SYSTEM = [
  'You are a warm, encouraging probability & statistics tutor inside a learn-by-doing app.',
  'A learner just answered a practice problem incorrectly. You are given the problem, the',
  "learner's answer, the correct answer (ALREADY computed by the app — it is the source of",
  "truth), and the author's hand-written hint. In 2-4 short, plain-language sentences, explain",
  'where the learner most likely went wrong and how to think about it correctly so they can',
  'reach the given correct answer. You MUST treat the provided correct answer as ground truth:',
  'never state a different number, never say the learner was actually right, and never invent new',
  'numbers. Be specific to this problem, encouraging, and concise. Use at most one short formula.',
  'Do not mention that you are an AI or a language model.',
].join(' ');

const DEFAULT_MODEL = 'gpt-4o-mini';
const MAX_BODY_BYTES = 8192; // tiny game-state / problem-state object; reject anything larger
const OPENAI_TIMEOUT_MS = 12000;
const MAX_TOKENS = 260;
const ACTIONS = new Set(['hit', 'stand', 'double']);

/** Parse the configured origin allowlist. Empty / "*" => allow all (browser CORS). */
function parseAllowed(env) {
  const raw = (env.ALLOWED_ORIGINS ?? '').trim();
  if (!raw || raw === '*') return null;
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** CORS headers, reflecting the request origin only when it's on the allowlist. */
function corsHeaders(origin, allowed) {
  const allowOrigin = !allowed ? '*' : origin && allowed.includes(origin) ? origin : '';
  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
  if (allowOrigin) headers['Access-Control-Allow-Origin'] = allowOrigin;
  return headers;
}

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

function num(x, fallback = 0) {
  return typeof x === 'number' && Number.isFinite(x) ? x : fallback;
}

function str(x, max) {
  return String(x ?? '').slice(0, max);
}

/** Validate + clamp the untrusted blackjack payload into a known CoachInput shape. */
function sanitizeBlackjack(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (typeof raw.playerTotal !== 'number' || !Number.isFinite(raw.playerTotal)) return null;
  const ev = raw.ev && typeof raw.ev === 'object' ? raw.ev : {};
  return {
    playerCards: Array.isArray(raw.playerCards)
      ? raw.playerCards.slice(0, 12).map((c) => String(c).slice(0, 3))
      : [],
    playerTotal: num(raw.playerTotal),
    playerSoft: Boolean(raw.playerSoft),
    dealerUpcard: str(raw.dealerUpcard, 3),
    ev: {
      hit: num(ev.hit),
      stand: num(ev.stand),
      double: ev.double === null || ev.double === undefined ? null : num(ev.double),
    },
    optimalAction: ACTIONS.has(raw.optimalAction) ? raw.optimalAction : 'stand',
    chosenAction: ACTIONS.has(raw.chosenAction) ? raw.chosenAction : null,
    dealerBustChance: num(raw.dealerBustChance),
    bustChanceIfHit: num(raw.bustChanceIfHit),
    trueCount: num(raw.trueCount),
  };
}

/** Validate + clamp the untrusted wrong-answer payload into a known ExplainInput shape. */
function sanitizeExplain(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const question = str(raw.question, 800);
  const correctAnswer = str(raw.correctAnswer, 120);
  if (!question || !correctAnswer) return null;
  return {
    surface: raw.surface === 'daily' ? 'daily' : 'lesson',
    topic: str(raw.topic, 160),
    question,
    interaction: str(raw.interaction, 24),
    unit: raw.unit ? str(raw.unit, 24) : undefined,
    learnerAnswer: str(raw.learnerAnswer, 160),
    correctAnswer,
    tolerance:
      typeof raw.tolerance === 'number' && Number.isFinite(raw.tolerance) ? raw.tolerance : undefined,
    authorHint: str(raw.authorHint, 600),
  };
}

function buildBlackjackPrompt(input) {
  const doubleEv = input.ev.double === null ? 'not allowed' : input.ev.double.toFixed(3);
  return [
    `Player hand: ${input.playerCards.join(', ')} (${input.playerSoft ? 'soft' : 'hard'} ${input.playerTotal}).`,
    `Dealer upcard: ${input.dealerUpcard}.`,
    `Expected value per chip — hit: ${input.ev.hit.toFixed(3)}, stand: ${input.ev.stand.toFixed(3)}, double: ${doubleEv}.`,
    `Engine's optimal action: ${input.optimalAction}.`,
    input.chosenAction ? `Player chose: ${input.chosenAction}.` : 'Player has not chosen yet.',
    `Dealer bust chance from this upcard: ${(input.dealerBustChance * 100).toFixed(0)}%.`,
    `Player bust chance if hitting: ${(input.bustChanceIfHit * 100).toFixed(0)}%.`,
    `Hi-Lo true count: ${input.trueCount.toFixed(1)}.`,
    'Explain why the optimal action is best.',
  ].join('\n');
}

function buildExplainPrompt(input) {
  return [
    `Topic: ${input.topic}.`,
    `Problem: ${input.question}`,
    `Interaction type: ${input.interaction}${input.unit ? `, answer unit: ${input.unit}` : ''}.`,
    `The learner's answer: ${input.learnerAnswer}.`,
    `The correct answer (ground truth): ${input.correctAnswer}${
      input.tolerance != null ? ` (accepted within ±${input.tolerance})` : ''
    }.`,
    `Author's hint: ${input.authorHint}`,
    'Explain where the learner went wrong and how to reach the correct answer.',
  ].join('\n');
}

/** Read the request body, refusing anything over the byte cap (avoids memory abuse). */
async function readLimitedJson(request, maxBytes) {
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (declared && declared > maxBytes) return null;
  const text = await request.text();
  if (text.length > maxBytes) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export default {
  async fetch(request, env) {
    const allowed = parseAllowed(env);
    const origin = request.headers.get('Origin');
    const cors = corsHeaders(origin, allowed);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method === 'GET') {
      return json({ ok: true, model: env.COACH_MODEL ?? DEFAULT_MODEL }, 200, cors);
    }
    if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, cors);

    // Block browser requests from origins that aren't on the configured allowlist.
    if (allowed && origin && !allowed.includes(origin)) {
      return json({ error: 'origin not allowed' }, 403, cors);
    }

    // Validate the client request (400) before checking server config (500). One
    // endpoint, two payload shapes, selected by `kind` (default 'blackjack').
    const body = await readLimitedJson(request, MAX_BODY_BYTES);
    const kind = body?.kind === 'explain' ? 'explain' : 'blackjack';
    const input =
      kind === 'explain' ? sanitizeExplain(body?.input) : sanitizeBlackjack(body?.input);
    if (!input) return json({ error: 'missing or malformed input' }, 400, cors);

    if (!env.OPENAI_API_KEY) return json({ error: 'OPENAI_API_KEY secret not set' }, 500, cors);

    const system = kind === 'explain' ? EXPLAIN_SYSTEM : BLACKJACK_SYSTEM;
    const prompt = kind === 'explain' ? buildExplainPrompt(input) : buildBlackjackPrompt(input);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: env.COACH_MODEL ?? DEFAULT_MODEL,
          max_completion_tokens: MAX_TOKENS,
          temperature: 0.5,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: prompt },
          ],
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const detail = (await res.text()).slice(0, 500);
        return json({ error: 'openai request failed', detail }, 502, cors);
      }
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content?.trim() ?? '';
      return json({ text }, 200, cors);
    } catch (err) {
      const aborted = err && err.name === 'AbortError';
      return json({ error: aborted ? 'openai timeout' : String(err) }, aborted ? 504 : 500, cors);
    } finally {
      clearTimeout(timer);
    }
  },
};
