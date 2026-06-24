---
name: engaging-web-design
description: >-
  Design and polish engaging, on-brand UI for The Long Run (this Vite + React +
  TypeScript app): a calm, confident Khan Academy–style look driven entirely by
  CSS variables, with restrained, functional motion. Covers the design-token
  vocabulary (color/type/spacing/elevation in src/index.css), light+dark theming,
  the project's transition timing scale, hover/press/focus/toggle/progress recipes,
  canvas + rAF animation conventions, and confetti celebrations. Use when styling
  or restyling pages and components, adding animations, transitions, hover/scroll
  effects, or micro-interactions, or when asked to make the UI more beautiful,
  modern, polished, or engaging.
---

# Engaging Web Design — The Long Run

The house style is **calm, confident, and content-first** (Khan Academy–style): a
light theme by default, a soft neutral canvas, crisp cards, one teal accent, and
motion that **confirms an action rather than decorating it**. Engagement here comes
from clarity + responsiveness + a few earned moments of delight (confetti on a
correct answer), not from flashy effects.

Two non-negotiables in this repo:

1. **Everything is CSS-variable-driven.** Never hardcode a hex color in CSS or JSX.
   Use the tokens in `src/index.css` so light/dark both work and the Canvas sims
   stay in sync. (The only place literal colors live is `confetti.ts`'s `COLORS`.)
2. **Motion is transition-driven, not library-driven.** There are no keyframe
   animations and no animation libraries (framer-motion, GSAP, etc.). Rich/physics
   motion is done on `<canvas>` with `requestAnimationFrame`. Do not introduce a
   motion library.

Before non-trivial work, skim the live source of truth:
`src/index.css` (tokens + themes), `src/App.css` (component styles),
`src/lib/confetti.ts` (celebration), `src/simulations/canvasUtils.ts` (canvas
helpers), and the Canvas section of `CLAUDE.md`.

---

## 1. Visual craft

### Color — use tokens, never raw hex

| Role | Tokens |
|------|--------|
| Page / inset surfaces | `--bg`, `--bg-2`, `--surface`, `--surface-2`, `--surface-3` |
| Text | `--text-h` (headings/values), `--text` (body), `--muted` (secondary/labels) |
| Borders | `--border`, `--border-strong` |
| Primary accent (teal) | `--accent`, `--accent-strong`, `--accent-bg` |
| Secondary accent (blue) | `--accent-2`, `--cyan` |
| Semantic | `--good`/`--good-bg`, `--warn`/`--warn-bg`, `--bad`/`--bad-bg` |
| Special | `--grad` (teal→blue), `--ring-track`, shadows, radii |

Rules of thumb:

- Surfaces stack by elevation: `--bg` (page) < `--surface` (cards) < `--surface-2`/`--surface-3` (insets, tracks, segmented controls).
- `--accent` is for interactive/brand only. `--accent-2` is a secondary state (e.g. "cleared"). `--good/--warn/--bad` are **semantic only** (success/partial/error), never decorative.
- Derive tints with `color-mix(in srgb, var(--accent) 30%, transparent)` instead of inventing a new hex. This is the established pattern for soft borders and state fills.
- `--grad` is used sparingly — hero emblem and progress fills only. Don't gradient everything.
- Adding a color? Add it as a variable in **both** `:root` and `:root[data-theme='dark']` in `src/index.css`.

### Typography

- **Eyebrow** (the signature motif): tiny uppercase kicker above a title — `11–12px`, `font-weight: 700–800`, `letter-spacing: 0.08–0.18em`, `text-transform: uppercase`, colored `--accent` (or `--muted` for section labels).
- **Titles**: `--text-h`, `letter-spacing: -0.01em`, `line-height: 1.2`. Scale: page ≈ `30px`, step/section ≈ `26px`.
- **Body**: `15–16px`, `line-height: 1.55–1.65`, color `--text`, capped at `60–70ch` for readability.
- **Stat values**: big and tight — `18–30px`, `font-weight: 800`, `--text-h`.
- Font is the system stack (`system-ui, 'Segoe UI', Roboto, sans-serif`), antialiased. Don't add web fonts.

### Spacing, radius, elevation

- Spacing rhythm uses small multiples: `4 / 6 / 8 / 10 / 12 / 14 / 16 / 22 / 24px`. Prefer `gap` on flex/grid over margins.
- Radii: `--radius` (12px) cards/panels, `--radius-sm` (9px) buttons/inputs, `999px` pills, `50%` avatars/dots.
- Elevation: `--shadow-sm` (resting cards), `--shadow` (raised), `--shadow-lg` (popovers/modals/drawer). Keep shadows soft; lean on borders for definition.
- Content column max-width `1120px`, centered.

### Recurring motifs (reuse, don't reinvent)

- **Eyebrow + title** header block.
- **3px accent left-stripe** on highlighted blocks: `border-left: 3px solid var(--accent)` (see `.resume-card`, `.player-question`, `.lecture-formula`).
- **Card**: `background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow-sm)` → hover `background: var(--surface-2)`.
- **Pill / status badge**: `999px` radius, `color-mix` border, tinted `*-bg` fill.
- **Segmented control**: track on `--surface-3`, active option raised to `--surface` + `--shadow-sm` (see `.theme-seg`, `.auth-tabs`).

---

## 2. Motion & micro-interactions

Motion confirms an interaction. Keep it short, use `ease`, and only animate
`transform`, `opacity`, `background`, `border-color`, `box-shadow`, and `width`
(for progress). Avoid animating layout-affecting properties.

### Timing scale (match what already ships)

| Intent | Duration | Used for |
|--------|----------|----------|
| Press feedback | `0.06s` | `transform` on `:active` |
| Hover / state | `0.14–0.20s` | background, border, color, theme swap |
| Layout / drawer | `0.25s` | mobile sidebar `transform` |
| Progress fill | `0.35–0.40s` | progress/segment `width` |

Easing is plain `ease` throughout — don't reach for custom cubic-béziers unless asked.

### Core recipes

Press (every button):

```css
.btn {
  transition: transform 0.06s ease, box-shadow 0.18s ease, border-color 0.18s ease,
    background 0.18s ease;
  -webkit-tap-highlight-color: transparent;
}
.btn:hover { border-color: var(--accent); }
.btn:active { transform: scale(0.98); }
```

Focus ring (inputs, avatars — the project's signature focus affordance):

```css
.field:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-bg);
}
```

Toggle switch (track + sliding knob):

```css
.unlock-track { transition: background 0.18s ease; }
.unlock-track::after { transition: transform 0.18s ease; }
input:checked + .unlock-track { background: var(--accent); }
input:checked + .unlock-track::after { transform: translateX(18px); }
```

Animated progress: animate `width` with `transition: width 0.4s ease` on the fill.
Prefer the **segmented** `QuestionBar` (one segment per item, green/yellow/red) over
a single continuous bar — it carries more meaning per pixel.

Theme transition: the body cross-fades `background-color`/`color` at `0.2s`. New
themable surfaces should follow suit so dark-mode toggling stays smooth.

### Hover that adds meaning, not noise

Good hovers in this app **reveal hierarchy**: a row lifts to `--surface-2`, an icon
goes from `--muted` to `--text-h`, a border picks up `--accent`. Avoid scale-up
zooms, big shadows on hover, or color flashes.

---

## 3. Rich motion: canvas + celebration

For anything beyond a state transition (physics, particles, data viz), use
`<canvas>` + `requestAnimationFrame`, following the conventions in `CLAUDE.md`:

- Use `setupCanvas` (handles devicePixelRatio) and `cssVar` from `canvasUtils.ts`; repaint on theme change.
- **Never auto-run on mount** — guard with a `lastRunRef`. **Never call `setupCanvas` inside the draw loop.** Avoid per-frame `shadowBlur`.
- Animate-small / batch-large: animate individual items at low counts; at high counts compute in chunks and animate only the aggregate to hold ~60 FPS.

Celebration: `fireConfetti()` from `src/lib/confetti.ts` for genuine wins (correct
answer, mastery). Reserve it for earned moments — it loses meaning if it fires for
everything.

---

## 4. Accessibility = engagement

- **Always respect `prefers-reduced-motion: reduce`.** `confetti.ts` no-ops under it; any new non-essential motion (especially `@keyframes`, if you ever add one) must be gated the same way.
- Touch targets ≥ `46–48px` (see `.btn` / `.field` min-heights).
- Keep visible focus states (the `0 0 0 3px var(--accent-bg)` ring). Never `outline: none` without a replacement.
- Don't encode state with color alone — pair it with an icon, label, or shape (the grading pills/dots do this).
- Maintain contrast in **both** themes after any color change.

---

## 5. Workflow

When asked to design or polish UI:

```
- [ ] Read the relevant existing styles in src/App.css + tokens in src/index.css
- [ ] Reuse an existing motif/class before writing new CSS
- [ ] Build with tokens only (no raw hex); add new tokens to BOTH themes
- [ ] Add micro-interactions from the timing scale (press, hover, focus)
- [ ] Verify light AND dark themes
- [ ] Verify with prefers-reduced-motion enabled
- [ ] Check mobile (≤900px: sidebar→drawer) and touch target sizes
- [ ] npm run build && npm run lint  (both must pass clean)
```

### Quick polish pass (when something "feels flat")

1. Add an eyebrow + tighten title `letter-spacing`.
2. Establish elevation: page on `--bg`, content in `--surface` cards with `--shadow-sm`.
3. Give interactive elements a press (`scale(0.98)`) and a meaningful hover.
4. Replace instant state changes with a `0.15–0.2s ease` transition.
5. Use a `3px` accent left-stripe to draw the eye to the primary block.
6. Add an animated progress/segment bar if there's progress to show.

---

## Guardrails

- **No raw hex** in CSS/JSX — tokens only (except `confetti.ts` `COLORS`).
- **Don't rename or drop** sim-critical tokens (`--accent`, `--accent-2`, `--cyan`, `--text`, `--text-h`, `--border`, `--warn`); the Canvas sims read them.
- **No motion libraries**; transitions for micro-interactions, canvas + rAF for the rest.
- **Both themes, every change.** Test light and dark.
- **Reduced-motion always honored.**
- Keep it restrained — this is a learning tool. Delight is earned (confetti on a win), not constant.
