# Lesson authoring reference

Quick lookup when implementing lessons. Source of truth remains the live files.

## probability.ts exports

| Function | Use for |
|---|---|
| `longRunFrequency(p)` | Coin long-run fraction → `p` |
| `diceSumDistribution()` | Full sum 2..12 PMF (record) |
| `mostLikelyDiceSumProbability()` | P(sum = 7) = 6/36 |
| `binomialPmf(n, k, p)` | Single binomial probability |
| `galtonCenterFraction(rows, centerBins?)` | Fraction in center bin(s) |
| `birthdayProb(n)` | P(shared birthday) in room of n |
| `expectedValue(segments)` | Wheel EV (in `probability.ts`) |
| `wheelEV(wheel)` / `wheelConfig(segments)` | EV + sim encoding (in `simData.ts`) |
| `montyHallSwitchWin(doors)` | P(win \| switch) = (doors-1)/doors |
| `isCorrect(guess, answer, tol)` | Grading (don't call from content) |

Add new topics here first. Import in `lessons.ts`.

## simConfig keys by simulation

### coinFlip
| Key | Meaning |
|---|---|
| `flips` | Number of trials |
| `p` | P(heads) per flip |

### diceRoll
| Key | Meaning |
|---|---|
| `rolls` | Number of two-dice rolls |

### galtonBoard
| Key | Meaning |
|---|---|
| `rows` | Peg rows (bins = rows + 1) |
| `balls` | Balls to drop |

### birthday
| Key | Meaning |
|---|---|
| `people` | Room size |
| `trials` | Simulated rooms (problems: ~3000) |

### expectedValue
Wheel encoded via `wheelConfig([{ value, p }, ...])` from `simData.ts`.
Keys: `n`, `v0..vk`, `p0..pk`.

### conditional
| Key | Meaning |
|---|---|
| `metric` | 0–4 (see SKILL.md) |
| `scaleMax` | Bar full-scale (match expected prob order of magnitude) |
| `trials` | Number of draws (problems: 6000–8000) |

Suggested `scaleMax`: 0.15 for ~1/13 events, 0.02 for ~1/221, 0.4 for face cards.

### montyHall
| Key | Meaning |
|---|---|
| `doors` | Door count |
| `strategy` | `1` = switch, `0` = stay |
| `trials` | Games played (~1500) |

## Units & typical tolerances

| unit | When | tolerance |
|---|---|---|
| `fraction` | Long-run freq, win rates | 0.03–0.05 |
| `probability` | Exact probabilities | 0.03–0.04 |
| `dollars` | Expected value | 0.3–1.0 (scale with EV) |
| `count` | Integer answers (rare) | 0 or 0.5 |

Problem verify runs use **large trial counts** so the sim visibly converges; concept
explore uses **small counts** for interactivity.

## Lecture section checklist (concept step)

Typical 4–5 sections:

1. **Definition** — formal statement + display formula
2. **Intuition / mechanism** — connect to simulation behavior
3. **Quantitative detail** — variance, speed of convergence, linearity, etc.
4. **Common mistake** — gambler's fallacy, independence confusion, etc.
5. *(Optional)* **Application** — fair game, house edge, real-world hook

## Lesson metadata conventions

| Field | Pattern | Example |
|---|---|---|
| `id` | `l{N}-{topic-slug}` | `l3-galton-board` |
| `index` | 1-based course order | `3` |
| `concept` | Noun phrase, sidebar | `Combining independent outcomes` |
| `prerequisiteId` | Prior lesson `id` or `null` | `'l2-dice-roll'` |
| `status` | `'built'` when playable | |

## Icon (LessonIcon.tsx)

Add an entry keyed by lesson `id`. Glyphs use `stroke: currentColor` — color comes
from CSS (`.lesson-glyph`), not per-lesson hex. Keep SVG simple, 24×24 viewBox.

## When to extend a simulation

Extend existing sim when:
- New problem needs different `simConfig` params (already supported)
- New `metric` for conditional, new wheel for EV, new `p`/`flips` for coin

New simulation component only when:
- Entirely new interaction model
- Register in `simulations/index.ts` + add to `SimulationType` in `types/lesson.ts`

## Grading (for authors)

- 2 attempts per problem: green / yellow / red
- Lesson **cleared** = all green or yellow; **mastered** = all green
- Yellow counts as not mastered but unlocks next lesson

Write feedback assuming the learner may see it twice.
