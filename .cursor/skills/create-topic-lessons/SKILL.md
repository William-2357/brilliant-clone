---
name: create-topic-lessons
description: >-
  Author brand-new lessons on ANY topic for The Long Run by reusing the existing
  lesson template — 1 concept step (KaTeX lecture + an explorable visual) followed
  by 5 predict-then-verify problems — so the lesson automatically inherits the same
  Khan-style page layout, light/dark theme, sidebar, QuestionBar grading, lecture
  review, and confetti. Use when adding a lesson on a new subject/topic, extending
  the course beyond probability, wiring a new answers module or SimulationType, or
  asking how the lesson template/layout/theme is structured, including probability
  & statistics lessons whose answers come from probability.ts.
---

# Create Topic Lessons — The Long Run

Add a lesson on **any topic** that looks and behaves exactly like the existing
course. The page layout, theme, navigation, grading, and celebrations are **not
authored per lesson** — you get them for free by conforming to the content model
and registering the lesson. Your job is the *content* (lecture + 5 problems), the
*answers* (an owned function module), and optionally one *visual* (a Canvas sim).

**Read first:** `CLAUDE.md`, `src/types/lesson.ts`, and one built lesson in
`src/content/lessons.ts` (e.g. `l1-coin-flip`).

## What you get for free (do NOT rebuild these)

Adding a conforming `Lesson` to the `lessons` array + an icon is enough to inherit:

- **Page layout & theme** — `AppLayout` (sticky topbar + responsive sidebar +
  centered content) and the light/dark CSS-variable theme wrap every lesson. The
  sidebar lists your lesson from the `lessons` array automatically.
- **The player** — `LessonPlayer` renders the concept grid (lecture + sim) and the
  problem stage (sim + prediction panel), handles 2-attempt grading
  (green/yellow/red), resume, "Review lecture", `QuestionBar`, feedback banners,
  confetti, and mastery milestones.
- **Routing** — `/learn/<lesson-id>` resolves through `getLesson` → `LessonPage` →
  `LessonPlayer`. No router edits needed.
- **Lecture rendering** — `LectureContent` renders `body` + `lecture[]` with KaTeX.

The **only** per-lesson visual you may author is a Canvas simulation, and it must
read colors via `simPalette()` so it matches both themes (see `reference.md`).

## Non-negotiables

1. **Answers come from an owned function module — never hand-typed.** Probability
   topics extend `src/lib/probability.ts`. A genuinely new subject gets its own
   pure module (e.g. `src/lib/<topic>.ts`). The `answer` field references that
   function so the displayed truth and any sim animate toward the *same* value.
2. **Exactly 6 steps:** 1 `concept` + **5** `problem` steps. Always.
3. **Predict-then-verify.** Every problem commits a prediction *before* the truth is
   revealed. The sim (if any) runs only after the learner locks in.
4. **No AI in content.** All prose, lectures, and feedback are hand-written.
5. **Reuse before building.** Prefer an existing `SimulationType` or a no-sim
   interaction (`numeric`/`slider`/`order`/`draw`/`wheel`) before writing a new
   Canvas component.
6. **Theme via CSS variables only.** Never hard-code hex in a sim — use
   `simPalette()`. The shell is already CSS-variable driven; keep it that way.

## Topic-agnostic workflow

```
- [ ] 1. Outline:  title · sidebar tagline · 5 problem scenarios · prerequisite
- [ ] 2. Answers:  add/extend the owned function module for this topic
- [ ] 3. Verify mechanism: reuse sim · new sim · or no-sim interaction (decide below)
- [ ] 4. Concept:  body + 3–5 lecture sections (definition → intuition → formula → pitfall)
- [ ] 5. Problems: 5 escalating steps, each `answer` wired to a function
- [ ] 6. Wire:     lesson in lessons.ts · icon in LessonIcon.tsx · (optional) sim + templates
- [ ] 7. Verify:   npm run build && npm run lint ; play concept + 1 problem in light/dark
```

### Step 3 — choose the verify mechanism

| Situation | Use |
|---|---|
| Topic maps to an existing visual (coin/dice/Galton/EV wheel/…) | Reuse that `SimulationType`; just change `simConfig` |
| Topic has a stochastic/animatable process that converges to the answer | Build a new Canvas sim (see `reference.md`) |
| Answer is a deterministic value with no natural animation | Omit `simulation`; use a `numeric`/`slider` interaction (the player grades immediately) |
| Learner should rank outcomes | `interaction: 'order'` (no sim needed) |
| Learner should sketch a distribution/shape | `interaction: 'draw'` (no sim needed) |

A problem **without** a `simulation` is fully supported — `LessonPlayer` grades the
committed value against `answer`/`tolerance` and skips the sim run.

## Lesson skeleton

```typescript
{
  id: 'l10-topic-slug',          // l{N}-kebab-case, unique; steps → l10-s1 … l10-s6
  index: 10,
  title: 'Human Title',
  concept: 'Short sidebar tagline',   // noun phrase, ≤ ~6 words
  status: 'built',                    // 'coming-soon' hides it as locked
  prerequisiteId: 'l9-clt',           // previous built lesson id, or null for the first
  steps: [ conceptStep, ...fiveProblems ],
}
```

`s1` is always the concept step; `s2…s6` are the five problems.

### Concept step

```typescript
{
  id: 'l10-s1',
  type: 'concept',
  title: 'Short action title',
  body: 'Lead paragraph: what to do in the visual and what to notice. 2–3 sentences, second person, concrete.',
  simulation: 'coinFlip',            // optional — omit for a lecture-only concept
  simConfig: { flips: 100, p: 0.5 }, // explore-friendly (small counts)
  lecture: [
    { heading: 'Definition',  text: 'Formal statement. Inline math as $...$.', formula: 'a^2 + b^2 = c^2' },
    { heading: 'Intuition',   text: 'Tie the idea to what the visual does.' },
    { heading: 'The formula', text: 'One formula per major idea.', formula: '\\bar{X}_N \\to \\mu' },
    { heading: 'Common mistake', text: 'Name the pitfall learners hit here.' },
  ],
}
```

### Problem step

```typescript
{
  id: 'l10-s2',
  type: 'problem',
  title: 'Problem title',
  body: 'Setup in 1–2 sentences. State every parameter explicitly.',
  simulation: 'coinFlip',            // optional; omit for a no-sim problem
  simConfig: { flips: 1000, p: 0.5 },// verify batch — larger counts than concept
  question: 'What …? (state the format, e.g. "decimal" or "dollars")',
  answer: ownedFn(params),           // FROM your module — never a literal
  tolerance: 0.05,
  unit: 'fraction',                  // label shown by the input
  feedback: {
    correct: 'Affirm + one-line why, using the computed value.',
    incorrect: 'Redirect toward the method without giving away the retry.',
  },
  // interaction defaults to 'numeric'. For others, add the matching fields
  // (slider*, orderItems/answerOrder, drawCategories/answerShape, wheelPayouts) —
  // see reference.md.
}
```

**Problem arc (all 5):** vary parameters across problems; never repeat the same
numbers. Typical escalation: canonical case → parameter change → conceptual trap →
edge/scale change → synthesis. Place holistic `order`/`draw` problems first (later
sims would give them away).

## Worked example — a new topic (compound interest)

Shows the pattern for a subject outside probability. Answer from an owned module,
no new sim, numeric interaction.

```typescript
// src/lib/finance.ts  (new owned module — single source of truth)
/** Balance after t years of principal P at annual rate r, compounded n×/year. */
export function compoundBalance(P: number, r: number, n: number, t: number): number {
  return P * Math.pow(1 + r / n, n * t);
}
```

```typescript
// a problem step in lessons.ts
{
  id: 'l10-s2',
  type: 'problem',
  title: 'One year, monthly compounding',
  body: 'You deposit $1,000 at 6% annual interest, compounded monthly.',
  question: 'What is the balance after 1 year? (dollars)',
  answer: compoundBalance(1000, 0.06, 12, 1),   // computed, not 1061.68
  tolerance: 0.5,
  unit: 'dollars',
  feedback: {
    correct: 'Right — monthly compounding beats simple 6% slightly: ≈ $1061.68.',
    incorrect: 'Apply (1 + r/n)^{nt}: 1000·(1+0.06/12)^{12} ≈ $1061.68.',
  },
}
```

That problem renders inside the same shell, theme, and grading as every other
lesson — no layout work required.

## Wiring checklist (files to touch)

```
- [ ] src/lib/<topic>.ts (or probability.ts)  — answer functions (source of truth)
- [ ] src/content/lessons.ts                   — the Lesson object, added to `lessons`
- [ ] src/components/LessonIcon.tsx            — a 24×24 currentColor glyph keyed by lesson id
- [ ] src/types/lesson.ts                       — only if adding a new SimulationType
- [ ] src/simulations/<New>.tsx + index.ts      — only if building a new Canvas sim
- [ ] src/content/problemTemplates.ts           — optional: parameterized question pool
- [ ] npm run build && npm run lint             — both must pass clean
```

Do **not** edit `LessonPlayer`, `AppLayout`, grading, theming, or the router unless
the *content model* itself changes.

## LaTeX rules

- Display math goes in `formula` (no `$` delimiters).
- Inline math goes in `text` (and `body`) as `$...$` only.
- Escape backslashes in TS strings: `\\frac`, `\\to`, `\\sqrt`, `\\mid`.

## Voice & copy

- **Concept body:** second person, concrete — "Drag the slider and watch…".
- **Questions:** always state the expected format — "(decimal)", "(dollars)".
- **Correct feedback:** "Exactly. [restate result] — [one line of intuition]."
- **Incorrect feedback:** hint toward the method, not the number (the learner may
  see it before a second try). Avoid bullet dumps and rhetorical fluff.

## Additional resources

- Field reference, interaction cheatsheet, sim conventions, theme tokens, registration, and the optional final-test slot: [reference.md](reference.md)
- Probability & statistics specifics: the owned answer functions in `src/lib/probability.ts` and the built lessons + shared wheels in `src/content/lessons.ts`
- Styling, motion, canvas palette, confetti: `.cursor/skills/engaging-web-design/SKILL.md`
- Architecture, grading rules, hard constraints: `CLAUDE.md`
