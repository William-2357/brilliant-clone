/**
 * Interpreting a learner's typed answer.
 *
 * Problems ask for a numeric value, and the natural way to write that value is
 * sometimes a decimal ("0.5") and sometimes a fraction ("1/2", "12/52"). Both are
 * accepted everywhere a number is typed so the learner never has to convert in
 * their head; the parsed value still flows through `isCorrect` unchanged.
 */

/** Units whose answers read just as naturally as a fraction (e.g. 1/6) as a decimal. */
const FRACTION_UNITS = new Set(['fraction', 'probability']);

/**
 * Parse a typed answer as either a decimal or a simple "a/b" fraction. Whitespace
 * around the value — and around the slash — is ignored. Returns `null` for any
 * input that isn't a finite number, so callers keep their existing "enter a
 * number" guidance for empty or malformed entries.
 */
export function parseNumericInput(raw: string): number | null {
  const s = raw.trim();
  if (s === '') return null;

  const slash = s.indexOf('/');
  if (slash !== -1) {
    // Only a single, simple a/b fraction is supported (reject e.g. "1/2/3").
    if (s.indexOf('/', slash + 1) !== -1) return null;
    const numStr = s.slice(0, slash).trim();
    const denStr = s.slice(slash + 1).trim();
    if (numStr === '' || denStr === '') return null;
    const num = Number(numStr);
    const den = Number(denStr);
    if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
    return num / den;
  }

  const value = Number(s);
  return Number.isFinite(value) ? value : null;
}

/**
 * The hint shown under a numeric input. Fraction-like units spell out that a
 * decimal or a fraction is fine (resolving the "answer as a fraction" vs.
 * "(decimal)" mismatch); other units keep their plain "Answer as a …" label.
 */
export function answerHint(unit?: string): string {
  if (!unit || FRACTION_UNITS.has(unit)) {
    return 'Enter a decimal or fraction, e.g. 0.5 or 1/2.';
  }
  return `Answer as a ${unit}.`;
}
