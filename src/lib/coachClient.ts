/**
 * Client side of the live dealer-coach. The model call ALWAYS happens server-side —
 * the browser never holds the OpenAI key. The client POSTs the game state to the
 * HTTPS endpoint in `VITE_COACH_ENDPOINT` (the free Cloudflare Worker in `worker/`,
 * or a local `wrangler dev` server). When no endpoint is configured the coach uses
 * no AI at all.
 *
 * Degrades gracefully: returns null on ANY failure (not configured, network error,
 * timeout, bad response) so the caller falls back to the deterministic templated
 * explanation — the game's coaching always works with AI disabled or offline. Never
 * throws; never blocks longer than `timeoutMs`.
 */
import type { CoachInput } from './coach';

/** POST the game state to the HTTPS coach endpoint; returns its text or null. */
async function fetchFromEndpoint(
  url: string,
  input: CoachInput,
  timeoutMs: number,
): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input }),
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
 * Request an AI narration for a decision from the configured coach endpoint
 * (`VITE_COACH_ENDPOINT`). The payload is the structured game state plus the engine's
 * numbers and the optimal action; the server narrates, never recomputes. Returns the
 * AI text, or null to fall back to the offline explanation.
 */
export async function fetchAiCoach(input: CoachInput, timeoutMs = 6000): Promise<string | null> {
  const endpoint = import.meta.env.VITE_COACH_ENDPOINT;
  if (!endpoint) return null;
  return fetchFromEndpoint(endpoint, input, timeoutMs);
}
