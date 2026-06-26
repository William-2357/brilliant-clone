/**
 * Client transport for the app's AI helpers. The model call ALWAYS happens
 * server-side (the Cloudflare Worker in `worker/`) — the browser never holds the
 * OpenAI key. The client POSTs to the HTTPS endpoint in `VITE_COACH_ENDPOINT`,
 * routed by `kind`:
 *   - 'blackjack' → Arcade dealer-coach (narrates the engine's EV numbers)
 *   - 'explain'   → wrong-answer explanations for lessons + the Problem of the Day
 *
 * Degrades gracefully: returns null on ANY failure (no endpoint configured, network
 * error, timeout, bad response) so callers fall back to the deterministic / written
 * text — the app's coaching always works with AI off or the Worker unreachable.
 * Never throws; never blocks longer than `timeoutMs`.
 */
import type { CoachInput } from './coach';
import type { ExplainInput } from './explain';

type AiKind = 'blackjack' | 'explain';

/** True when an AI endpoint is configured (so a request will actually be attempted). */
export function aiConfigured(): boolean {
  return Boolean(import.meta.env.VITE_COACH_ENDPOINT);
}

async function requestAi(
  kind: AiKind,
  input: CoachInput | ExplainInput,
  timeoutMs: number,
): Promise<string | null> {
  const endpoint = import.meta.env.VITE_COACH_ENDPOINT;
  if (!endpoint) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, input }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json().catch(() => null)) as { text?: string } | null;
    const text = data?.text;
    return typeof text === 'string' && text.trim().length > 0 ? text.trim() : null;
  } catch {
    return null;
  }
}

/**
 * Blackjack dealer-coach narration. The server narrates the engine's numbers and
 * never recomputes them. Returns the AI text, or null to fall back to the template.
 */
export function fetchAiCoach(input: CoachInput, timeoutMs = 6000): Promise<string | null> {
  return requestAi('blackjack', input, timeoutMs);
}

/**
 * Wrong-answer explanation for a lesson / Problem-of-the-Day question. The server is
 * told the app-computed correct answer is ground truth. Returns the AI text, or null
 * to fall back to the author's hand-written incorrect feedback.
 */
export function fetchAiExplanation(input: ExplainInput, timeoutMs = 6000): Promise<string | null> {
  return requestAi('explain', input, timeoutMs);
}
