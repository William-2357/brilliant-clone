# SOURCES — scenario attribution

This file documents where the **scenario archetypes** in
`src/content/problemTemplates.ts` come from, and under what license.

**Important:** No prose was copied. Every narrative `body`, `question`, and
`feedback` string in `problemTemplates.ts` is **original, hand-written** text. We
harvested only the *archetype* — the kind of real-world situation a topic is
classically taught with (a quality-control pass rate, a drunkard's walk, drawing
aces without replacement) — and then **re-derived the answer through this app's
own engine**: each problem maps to an existing `SimulationType` and recomputes its
answer from a function in `src/lib/probability.ts`. Nothing is memorized or
hand-typed.

Because the text is original, the source licenses below are not strictly required
for redistribution; they are recorded for honest attribution of inspiration, per
the project's sourcing rules (Tier 1 = text reuse OK with attribution; everything
else = inspiration only, never copied).

## Source licenses

| Source | License | Use here |
|---|---|---|
| OpenStax *Introductory Statistics* / *Statistics* | CC BY 4.0 | Archetypes: Bernoulli trials, expected value, conditional probability, sampling distributions |
| Grinstead & Snell, *Introduction to Probability* | GNU FDL (free) | Archetypes: coin/dice, binomial, gambler's fallacy, cards w/o replacement, random walks, EV |
| LibreTexts *Statistics* | CC BY-NC-SA 4.0 (varies by page) | Cross-check of standard problem framings |
| MIT OCW 18.05 *Introduction to Probability and Statistics* | CC BY-NC-SA 4.0 | Archetypes: gambler's fallacy, CLT / standard error |
| NIST/SEMATECH *e-Handbook of Statistical Methods* | Public domain (US Gov) | Archetypes: process/defect rates, CLT, standard error |
| Wikipedia / Wikiversity / Wikibooks | CC BY-SA | Monty Hall (incl. n-door generalization), quincunx history |
| Stack Exchange (math.SE / Cross Validated) | CC BY-SA | Sanity-checking standard derivations only |

> Brilliant, Khan Academy, AoPS/AMC, and Project Euler were treated as
> **inspiration only** and were **not** copied (prose or problems).

## Per-family scenario map

Each family already binds to one simulation and one `probability.ts` primitive
(see the table in the task / `CLAUDE.md`). The contexts added per family:

### Coin flip → `coinFlip` · `longRunFrequency(p)` (fraction) / `p·n` (count)
Independent identical Bernoulli(p) trials.

| Context (original prose) | Archetype origin | License |
|---|---|---|
| Weighted novelty coin | Grinstead & Snell Ch. 1 | GNU FDL |
| Assembly-line inspection pass rate | NIST e-Handbook (process control); OpenStax | Public domain; CC BY 4.0 |
| Seed germination rate | OpenStax (binomial examples) | CC BY 4.0 |
| Free-throw shooting % | OpenStax (Bernoulli examples) | CC BY 4.0 |
| Polling: proportion who support | OpenStax Ch. 7–8 | CC BY 4.0 |
| Insurance: per-policy claim rate | OpenStax / NIST | CC BY 4.0 / Public domain |
| Vaccine efficacy per exposure | OpenStax (proportions) | CC BY 4.0 |
| Solar-cell spec pass rate | NIST e-Handbook | Public domain |
| Spam-filter catch rate | OpenStax (classification/proportions) | CC BY 4.0 |
| Daily rain probability (idealized independent) | Grinstead & Snell | GNU FDL |
| Salmon survival rate | OpenStax (ecology proportions) | CC BY 4.0 |
| Web-request success rate | NIST (reliability) | Public domain |
| Penalty-kick conversion % | OpenStax (Bernoulli) | CC BY 4.0 |

**Gambler's-fallacy bank** (memoryless devices only — coin, spinner, roulette,
slot, dice game, lottery balls): MIT OCW 18.05; Grinstead & Snell. License: CC
BY-NC-SA 4.0 / GNU FDL. Answer is still `longRunFrequency(p)` — independence.

### Dice → `diceRoll` · `diceSumDistribution()` / `sumsByLikelihood`
Mechanic fixed at **two fair six-sided dice, summed** (the sim is hard-wired to
this). Only the framing varies.

| Context | Archetype origin | License |
|---|---|---|
| Board-game movement total | Grinstead & Snell Ch. 1 | GNU FDL |
| Backgammon opening roll | Grinstead & Snell | GNU FDL |
| Craps come-out total | OpenStax (dice examples) | CC BY 4.0 |
| Settlers-style resource roll (the "7") | inspiration only (generic) | — |
| Tabletop RPG dice tower | inspiration only (generic) | — |
| Stats-class two-dice lab | OpenStax | CC BY 4.0 |
| Casino dice pair | Grinstead & Snell | GNU FDL |

### Galton board → `galtonBoard` · `galtonCenterFraction` / `binomialPmf(·,·,0.5)`
Mechanic fixed at a **symmetric (50/50) bouncer with `rows` rows** → Binomial(n, ½).

| Context | Archetype origin | License |
|---|---|---|
| Galton's bean machine / quincunx | Galton 1889 (public domain); Wikipedia | Public domain / CC BY-SA |
| Plinko board | inspiration only (generic) | — |
| Pachinko pins | inspiration only (generic) | — |
| Museum peg-board exhibit | Grinstead & Snell (binomial) | GNU FDL |
| Pollen-grain 1-D diffusion into channels | Grinstead & Snell Ch. 12 (random walk → binomial) | GNU FDL |
| Notched-roof raindrops into gutters | inspiration only (generic) | — |
| Pin-drop toy | inspiration only (generic) | — |

### Expected value → `expectedValue` · `expectedValue(segments)`
Payout wheels with **non-negative** values (so the sim's average bar reads
cleanly). Insurance is framed as *gross payout* (≥ 0), not net loss.

| Context | Archetype origin | License |
|---|---|---|
| Carnival wheel of fortune | Grinstead & Snell Ch. 6 (EV) | GNU FDL |
| Charity raffle ticket | OpenStax Ch. 4 (EV of a ticket) | CC BY 4.0 |
| Scratch-off card | OpenStax | CC BY 4.0 |
| Video-game loot box | inspiration only (generic) | — |
| Claw-machine promo | inspiration only (generic) | — |
| Booth game round | OpenStax (fair game / house edge) | CC BY 4.0 |
| Micro-insurance expected payout | OpenStax / NIST (actuarial EV) | CC BY 4.0 / Public domain |
| Vending-machine bonus | inspiration only (generic) | — |

### Conditional → `conditional` · `drawProbability` / `drawMatchesNoReplacement`
Mechanic fixed at a **standard 52-card deck**, aces/face cards (the five sim
metrics). Only the framing varies (dealer, poker night, magician, lab, etc.).
Archetype: Grinstead & Snell Ch. 4; OpenStax Ch. 3. License: GNU FDL / CC BY 4.0.

### Monty Hall → `montyHall` · `montyHallSwitchWin(doors)` / `1/doors`
Mechanic fixed: a **knowing host** opens all-but-one losing option, then you
switch/stay; generalized to `n` containers. Framings: doors, shells, cups, boxes,
lockers, chests, briefcases. Archetype: Wikipedia/Wikiversity (Monty Hall and its
n-door generalization); Grinstead & Snell. License: CC BY-SA / GNU FDL.

### Random walk → `randomWalk` · `randomWalkDrift` / `randomWalkRMS` / `randomWalkEndDistribution`
±1 steps, +1 with probability `p`. Fair (`p = ½`) and biased (`p ≠ ½`) contexts;
the sim is configured with the matching `p`.

| Context | Archetype origin | License |
|---|---|---|
| Drunkard's walk on a sidewalk | Grinstead & Snell Ch. 12 | GNU FDL |
| Dye-molecule diffusion | Grinstead & Snell Ch. 12; NIST | GNU FDL / Public domain |
| Ant on a tightrope | inspiration only (generic) | — |
| Board-game token on a track | inspiration only (generic) | — |
| Fair-coin $1 gambler | Grinstead & Snell (fair game) | GNU FDL |
| Toy stock ±1 cent | inspiration only (generic) | — |
| Biased: tilted $1 game / trending stock / molecular motor / foraging drift | Grinstead & Snell; NIST | GNU FDL / Public domain |

> Note: the *gambler's-ruin* absorbing-barrier version (P(reach $N$ before $0$)) is
> **not** modeled here — it needs a new primitive + sim. See `BACKLOG.md`.

### CLT → `clt` · `dieMean()` / `standardError(dieSD(), m)` / `diceSampleMeanDistribution`
The sim's verify parent is the **fair die** (μ = 3.5, σ = √(35/12) ≈ 1.71), so
every context genuinely averages `m` fair-die rolls (board-game designer, stats
class, casino auditor, RPG table, fairness study, …) and varies `m`. Archetype:
NIST e-Handbook (sampling distribution of the mean); OpenStax Ch. 7; MIT OCW
18.05. License: Public domain / CC BY 4.0 / CC BY-NC-SA 4.0.

> Note: averaging a **general** population with an arbitrary σ (e.g. real
> measurement data, polling margin of error with a chosen σ) needs the CLT sim to
> expose σ via `simConfig`. See `BACKLOG.md`.
