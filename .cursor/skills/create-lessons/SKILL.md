---
name: create-lessons
description: >-
  Author new Probability & Statistics lessons for The Long Run in the same style
  as the existing seven: 1 concept step + 5 gradable problems, KaTeX lectures,
  predict-then-verify sims, answers from probability.ts, and Khan-style UI tokens.
  Use when adding a lesson, writing lecture content, creating problems, extending
  simConfig, or asking how lesson content is structured in this repo.
---

# Create Lessons — The Long Run

Author lessons that match the existing course in **structure, voice, math rigor,
and wiring**. Read `src/content/lessons.ts` and `CLAUDE.md` before writing.

## Non-negotiables

1. **Answers come from `src/lib/probability.ts`.** Never hand-type a derived numeric
   answer. Add a function there first, then reference it in `lessons.ts`.
2. **Exactly 6 steps per lesson:** 1 `concept` + **5** `problem` steps.
3. **Predict-then-verify:** every problem has a numeric `answer`, `tolerance`, and
   `unit`. The simulation runs *after* the learner commits a guess.
4. **No AI in content.** All prose and feedback are hand-written.
5. **Phase 1 sim reuse.** Prefer an existing `SimulationType`; extend `simConfig`
   before building a new Canvas component (see [reference.md](reference.md)).

## Lesson skeleton

```typescript
{
  id: 'l8-short-slug',           // l{N}-kebab-case, unique
  index: 8,
  title: 'Human Title',
  concept: 'Short sidebar tagline',  // ≤ ~6 words
  status: 'built',               // or 'coming-soon'
  prerequisiteId: 'l7-monty-hall', // previous built lesson, or null for L1
  steps: [ conceptStep, ...fiveProblems ],
}
```

**IDs:** lesson `l8-foo-bar` → steps `l8-s1` … `l8-s6` (`s1` = concept).

## Step templates

### Concept step (`type: 'concept'`)

Free exploration — learner uses sliders/controls; sim does **not** auto-run on
problem-style verify.

```typescript
{
  id: 'l8-s1',
  type: 'concept',
  title: 'Short action title',          // e.g. "Flip until it clicks"
  body: 'Lead paragraph: what to do in the sim and what to notice. 2–3 sentences, second person, concrete.',
  simulation: 'coinFlip',               // SimulationType
  simConfig: { flips: 100, p: 0.5 },    // explore-friendly params (smaller counts)
  lecture: [
    {
      heading: 'Section title',
      text: 'Rigorous explanation. Inline math with $...$ spans.',
      formula: 'E[X] = \\sum_i x_i P(X = x_i)',  // optional display KaTeX
    },
    // 3–5 sections total: definition → intuition → formula → common mistake
  ],
}
```

**Lecture voice:** Frequentist, precise, warm. Define terms, give one formula per
major idea, include one “pitfall” section (gambler’s fallacy, EV ≠ typical outcome,
Monty Hall symmetry trap, etc.).

**LaTeX rules:**
- Display math in `formula` (no `$` delimiters).
- Inline math in `text` as `$...$` only.
- Escape backslashes in TS strings: `\\frac`, `\\to`, `\\mid`.

### Problem step (`type: 'problem'`)

```typescript
{
  id: 'l8-s2',
  type: 'problem',
  title: 'Problem title',
  body: 'Setup in 1–2 sentences. State parameters clearly (e.g. "1000 flips", "23 people").',
  simulation: 'coinFlip',
  simConfig: { flips: 1000, p: 0.5 },   // verify batch — larger counts
  question: 'What fraction …? (enter a decimal, e.g. 0.5)',
  answer: longRunFrequency(0.5),        // FROM probability.ts — never a literal
  tolerance: 0.05,
  unit: 'fraction',                    // shown in UI; pick from reference
  feedback: {
    correct: 'Affirm + one-sentence why. Use the computed value.',
    incorrect: 'Redirect without giving away next attempt. Show the reasoning path.',
  },
}
```

**Problem arc (all 5):** vary parameters across problems — don’t repeat the same
numbers. Typical mix:
1. Canonical case (fair/default)
2. Parameter change (biased coin, different n)
3. Conceptual trap (gambler’s fallacy, independence, stay vs switch)
4. Edge or scale change (large n, small p)
5. Synthesis / harder variant

**Tolerance & units:** see [reference.md](reference.md).

## Simulation pairing

| Lesson topic | `simulation` | Concept `simConfig` | Problem `simConfig` |
|---|---|---|---|
| Long-run frequency | `coinFlip` | `{ flips: 100, p: 0.5 }` | `{ flips: 1000, p }` |
| Dice / independence | `diceRoll` | `{ rolls: 100 }` | `{ rolls: 2000 }` |
| Binomial / CLT | `galtonBoard` | `{ rows: 12, balls: 200 }` | `{ rows: 12, balls: 1000 }` |
| Birthday | `birthday` | `{ people: 23 }` | `{ people: n, trials: 3000 }` |
| Expected value | `expectedValue` | `wheelConfig(wheel)` | same wheel as in body |
| Conditional prob. | `conditional` | `{ metric, scaleMax }` | + `{ trials: 6000–8000 }` |
| Monty Hall | `montyHall` | explore toggles (no verify run) | `{ doors, strategy, trials: 1500 }` |

Expected-value wheels: define segments at top of `lessons.ts`, encode with
`wheelConfig()` / `wheelEV()` from `simData.ts`.

Conditional `metric` values: `0` ace first, `1` both aces, `2` ace second | ace first,
`3` face first, `4` ace second | not ace first.

## Files to touch (checklist)

```
- [ ] src/lib/probability.ts     — new/changed answer functions
- [ ] src/content/lessons.ts     — lesson object + shared wheels/constants
- [ ] src/content/simData.ts     — only if new wheel helpers needed
- [ ] src/components/LessonIcon.tsx — SVG glyph for new lesson id (monochrome via CSS)
- [ ] src/simulations/*.tsx      — only if simConfig can't express the problem
- [ ] npm run build && npm run lint
```

Do **not** edit `LessonPlayer`, grading, or progress unless the content model changes.

## UI & visual consistency

When styling sims or previewing the lesson, also read
`.cursor/skills/engaging-web-design/SKILL.md`:

- Canvas colors via `simPalette()` / CSS variables — **no neon hex, no shadowBlur**.
- App shell: flat lists, hairline dividers, `--accent` teal, light default theme.
- Concept body + lecture render in `LectureContent`; problems use `QuestionBar` grading.

## Authoring workflow

1. **Outline** — title, concept tagline, sim type, 5 problem scenarios, prerequisite.
2. **Math** — add/verify functions in `probability.ts`; sanity-check edge cases.
3. **Concept** — write `body` + 3–5 `lecture` sections with formulas.
4. **Problems** — 5 steps, escalating difficulty; each `answer` wired to a function.
5. **Wire** — lesson entry in `lessons.ts`; icon in `LessonIcon.tsx`.
6. **Verify** — build, lint, manually play concept + one problem in light/dark.

## Voice & copy patterns

**Lead body (concept):** “Probability is what happens in the long run. Drag the slider…”

**Questions:** Always state format — “(enter a decimal, e.g. 0.5)” or “(dollars)”.

**Correct feedback:** “Exactly. [Restate result] — [one line of intuition].”

**Incorrect feedback:** “Close, but… [hint toward method, not just the number].”

Avoid: bullet dumps in lectures, rhetorical fluff, uncomputable “about” answers when
an exact value exists.

## Minimal example (problem only)

```typescript
{
  id: 'l8-s2',
  type: 'problem',
  title: 'Predict the long run',
  body: 'You flip a fair coin 1000 times.',
  simulation: 'coinFlip',
  simConfig: { flips: 1000, p: 0.5 },
  question: 'What fraction will be heads? (decimal)',
  answer: longRunFrequency(0.5),
  tolerance: 0.05,
  unit: 'fraction',
  feedback: {
    correct: 'Exactly. Over many flips the fraction converges to 0.5.',
    incorrect: 'A fair coin converges to 0.5 — each flip is 50/50.',
  },
}
```

## Additional resources

- Sim keys, tolerances, metric table: [reference.md](reference.md)
- Product intent: `PRD.md`
- Architecture & grading: `CLAUDE.md`
