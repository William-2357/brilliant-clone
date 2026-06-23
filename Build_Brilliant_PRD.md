# Product Requirements Document

**Product:** Build Brilliant
**Type:** Learn-by-Doing Educational App
**Last Updated:** June 2026
**Status:** Active Development

---

## Table of Contents

1. [Overview](#overview)
2. [Problem Statement](#problem-statement)
3. [Goals & Success Metrics](#goals--success-metrics)
4. [User Personas](#user-personas)
5. [Scope & Phasing](#scope--phasing)
6. [Functional Requirements](#functional-requirements)
   - [Phase 1 – MVP](#phase-1--mvp-due-wednesday)
   - [Phase 2 – AI Features](#phase-2--ai-features-due-friday)
   - [Phase 3 – Learning Science](#phase-3--learning-science-due-sunday)
7. [Non-Functional Requirements](#non-functional-requirements)
8. [Technical Architecture](#technical-architecture)
9. [Tech Stack](#tech-stack)
10. [Out of Scope](#out-of-scope)
11. [Submission & Delivery](#submission--delivery)

---

## Overview

Build Brilliant is a learn-by-doing educational app modeled on Brilliant.org, focused on a **single subject domain** taught with depth rather than breadth. Instead of handing users a video and a quiz, Build Brilliant drops learners into interactive problems, gives instant feedback, and only then surfaces the underlying concept. The learner plays with an idea until it clicks.

The product must be built in three ordered phases: a hand-crafted MVP, AI-powered enhancements, and evidence-based learning science layered on top. Each phase must stand on its own before the next begins.

---

## Problem Statement

Most learning apps deliver passive content — videos, slides, multiple-choice quizzes. Passive content does not produce durable understanding. Active problem-solving does.

There is no lightweight, subject-specific app that:
- Puts learners inside a problem before explaining the concept
- Gives immediate, specific, and instructive feedback on every interaction
- Tracks mastery at a granular level within a single domain
- Brings learners back daily through habit-forming mechanics
- Adapts the learning path based on what each learner actually struggles with

Build Brilliant fills this gap for one chosen subject, built deeply and intentionally.

---

## Goals & Success Metrics

### Product Goals

| Goal | Description |
|---|---|
| Teach by doing | Every lesson centers on a hands-on problem, not a video or text wall |
| Depth over breadth | One subject, taught well, with a real learning path through it |
| Mastery tracking | The app knows what a learner has mastered and what comes next |
| Habit formation | Streaks and milestones bring learners back daily |
| AI-augmented, not AI-dependent | The app teaches fully without AI; AI enhances, never replaces |

### Success Metrics (MVP)

| Metric | Target |
|---|---|
| Time to first interaction | < 2 seconds |
| Feedback latency | < 100ms |
| Visual frame rate | 60 FPS during manipulation |
| Mobile compatibility | Full functionality on phone-sized screens |
| Concurrency | No degradation under multiple simultaneous learners |
| Progress persistence | 100% — resume exactly where left off, any device |

---

## User Personas

### Primary: The Curious Learner
A self-motivated adult or student who wants to genuinely understand a subject, not just pass a test. They have limited time, learn on their phone, and need something that hooks them and brings them back.

**Needs:**
- Short, completable lessons that feel satisfying to finish
- Feedback that explains, not just grades
- A clear sense of progress and what comes next
- Something that works on mobile during commutes or breaks

### Secondary: The Returning Learner
Someone who tried to learn this subject before and gave up. They need an experience that meets them where they are, fills gaps, and builds confidence through small wins.

**Needs:**
- Mastery-gated progression (not allowed to skip past gaps)
- Targeted review when they struggle
- Momentum mechanics (streaks, milestones) that reward consistency

---

## Scope & Phasing

The product is built in three strict phases. **No phase may begin until the prior phase is complete and functional.**

| Phase | Deadline | Description |
|---|---|---|
| Phase 1 – MVP | Wednesday | Core learn-by-doing app. No AI whatsoever. |
| Phase 2 – AI Features | Friday | AI enhancements chosen deliberately and grounded in lesson state. |
| Phase 3 – Learning Science | Sunday | Evidence-based techniques layered on the working app. |

### Domain Selection

Before any code is written, a single subject domain must be committed to. The entire platform is built for that domain. Domain selection is the highest-leverage decision in the project.

**Approved domains (or equivalent):**

| Domain | Primary Interaction Type |
|---|---|
| Algebra | Drag terms across equations, balance both sides, plot lines |
| Probability & Statistics | Run simulations, drag distributions, sample from dice or decks |
| Physics | Sliders on projectiles, circuits, or pendulums with live response |
| Python / Programming | Code and logic puzzles with instant run-and-check feedback |
| Geometry | Drag points, measure angles, build and transform shapes |
| Logic & Puzzles | Deduction grids, truth tables, step-by-step reasoning |

**Acceptance criteria for domain selection:**
- Teachable through hands-on interaction and visuals (not text alone)
- At least several real lessons can be built within the project timeline
- Domain is stated clearly at the top of the README

---

## Functional Requirements

### Phase 1 – MVP (Due Wednesday)

> **Hard rule: zero AI features in the MVP.** No model calls, no generated content, no chatbot. The core experience must stand entirely on its own.

#### FR-1: Domain & Persona

| ID | Requirement |
|---|---|
| FR-1.1 | One subject domain is selected and stated clearly in the app and README |
| FR-1.2 | The entire app — content, interactions, visuals, feedback — is built for that domain |
| FR-1.3 | A specific user persona is defined and the experience is designed for them |

#### FR-2: Interactive Lessons

| ID | Requirement |
|---|---|
| FR-2.1 | At least one complete interactive lesson is built on a real concept in the chosen domain |
| FR-2.2 | The lesson is structured as a short sequence of interactive steps, not a video or wall of text |
| FR-2.3 | Each step introduces an idea and requires the learner to do something with it (solve, manipulate, predict, sort) |
| FR-2.4 | At least one problem type goes beyond multiple choice: drag, tap, slider, plot, reorder, or code input |
| FR-2.5 | The interaction must teach the concept, not merely decorate it |
| FR-2.6 | Lessons are short — completable in a few minutes each |

#### FR-3: Visual & Hands-On Elements

| ID | Requirement |
|---|---|
| FR-3.1 | At least one visual element (diagram, simulation, or chart) responds to learner input in real time |
| FR-3.2 | The learner can experiment with the visual and observe cause-and-effect |
| FR-3.3 | The visual is appropriate to the domain and the concept being taught |

#### FR-4: Feedback System

| ID | Requirement |
|---|---|
| FR-4.1 | Every answer — correct or incorrect — receives instant, specific feedback |
| FR-4.2 | Wrong answers receive a hint or explanation, not just a red X |
| FR-4.3 | All feedback text is hand-written by the builder, not AI-generated |
| FR-4.4 | Feedback latency is under 100ms |

#### FR-5: Content Model

| ID | Requirement |
|---|---|
| FR-5.1 | Lessons are described by a structured content model (JSON or equivalent), not hard-coded HTML blobs |
| FR-5.2 | Each lesson is a sequence of steps: concept → problem → feedback |
| FR-5.3 | The content model allows new lessons to be added without rewriting rendering code |
| FR-5.4 | The content model is structured so AI can generate into it later (Phase 2) |

#### FR-6: Course Path & Mastery

| ID | Requirement |
|---|---|
| FR-6.1 | Lessons are grouped into a course with a clear, ordered path through the domain |
| FR-6.2 | The app tracks what the learner has mastered |
| FR-6.3 | Completed or mastered lessons unlock or recommend what comes next |
| FR-6.4 | When a learner repeatedly gets something wrong, the app surfaces a review or easier step before advancing |
| FR-6.5 | The course path communicates where the learner is in the domain |

#### FR-7: Habit Loop

| ID | Requirement |
|---|---|
| FR-7.1 | The app tracks and displays a daily streak |
| FR-7.2 | Milestones are surfaced when the learner completes meaningful progress |
| FR-7.3 | The app shows how far the learner has come and what is next |
| FR-7.4 | Finishing a lesson produces a satisfying completion state |

#### FR-8: Persistence & Auth

| ID | Requirement |
|---|---|
| FR-8.1 | User accounts with authentication (name and login) |
| FR-8.2 | Progress, streaks, and lesson history persist across sessions |
| FR-8.3 | Progress persists across devices — leave on desktop, resume on phone |
| FR-8.4 | Returning mid-lesson resumes at the exact point of departure |

#### FR-9: Mobile & Deployment

| ID | Requirement |
|---|---|
| FR-9.1 | The app is fully functional on phone-sized screens |
| FR-9.2 | All interactions work with touch input |
| FR-9.3 | The app is publicly deployed and accessible via URL |
| FR-9.4 | Multiple concurrent learners are supported with no performance degradation |

---

### Phase 2 – AI Features (Due Friday)

> Only begin Phase 2 once the MVP teaches well without any AI. AI features are **additions**, never replacements. The MVP must continue to function with AI turned off.

#### FR-10: AI Feature Selection

| ID | Requirement |
|---|---|
| FR-10.1 | Builder documents which AI features were considered, which were chosen, and which were deliberately skipped |
| FR-10.2 | AI features are chosen because they genuinely improve the learning experience, not for novelty |
| FR-10.3 | Decision rationale is recorded in the Brainlift |

#### FR-11: Eligible AI Features (choose applicable)

| ID | Feature | Description |
|---|---|---|
| FR-11.1 | Problem generation | AI generates new practice problems at appropriate difficulty so the course never runs dry |
| FR-11.2 | Targeted hints | AI provides a hint when a learner is stuck, without giving away the answer |
| FR-11.3 | Adaptive path | AI recommends the next lesson based on the learner's individual struggle patterns |
| FR-11.4 | Wrong-answer explanation | AI explains a wrong answer in plain language, tuned to what the learner actually did |

#### FR-12: AI Implementation Standards

| ID | Requirement |
|---|---|
| FR-12.1 | Every AI feature is grounded in structured lesson state, not raw freeform text |
| FR-12.2 | For domains with verifiable correctness (e.g. math), a logic engine (SymPy, math.js) is used to validate AI output — the AI must never give a wrong answer |
| FR-12.3 | The full MVP experience remains functional when all AI features are disabled |
| FR-12.4 | AI features are implemented as additions to the existing content model, not replacements for it |

---

### Phase 3 – Learning Science (Due Sunday)

> Layer evidence-based learning techniques onto the working app. Choose techniques that genuinely fit the domain and implement them meaningfully — not as buzzwords.

#### FR-13: Learning Science Techniques (choose applicable)

| ID | Technique | Implementation Requirement |
|---|---|---|
| FR-13.1 | Retrieval practice | Problems require learners to recall from memory, not recognize from options |
| FR-13.2 | Spaced repetition | Concepts return at growing intervals; concepts answered wrong resurface sooner |
| FR-13.3 | Interleaving | Problem types are mixed within a session, not blocked by type |
| FR-13.4 | Mastery learning | A concept must be demonstrably mastered before the next unlocks; mastery signal is clearly defined |
| FR-13.5 | Scaffolding & desirable difficulty | Problems begin with support that fades over time; difficulty stays at a productive challenge level |
| FR-13.6 | Immediate, explanatory feedback | Wrong answers teach — feedback is sharpened beyond Phase 1 to be more instructive |

#### FR-14: Learning Science Documentation

| ID | Requirement |
|---|---|
| FR-14.1 | Builder documents which principles were implemented and why they fit the chosen domain |
| FR-14.2 | Effect or impact of each technique is measured or visibly demonstrated |
| FR-14.3 | Documentation is included in the Brainlift |

---

## Non-Functional Requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-1 | Performance | Feedback appears in < 100ms |
| NFR-2 | Performance | Interactive visuals run at 60 FPS during learner manipulation |
| NFR-3 | Performance | Lessons load in < 2 seconds to first interaction |
| NFR-4 | Scalability | App handles multiple concurrent learners with no degradation |
| NFR-5 | Accessibility | Works on mobile screen sizes with touch input |
| NFR-6 | Reliability | Progress persists 100% across sessions and devices |
| NFR-7 | Resilience | Full app functionality is maintained with AI features disabled |
| NFR-8 | Deployment | App is publicly deployed and accessible without setup |

---

## Technical Architecture

The following layers are required at minimum:

### 1. Content Model
A structured format (JSON or equivalent) that describes each lesson as an ordered sequence of steps. Each step contains: concept, problem definition, interaction type, expected answer(s), and feedback strings. This layer enables new lessons to be added without touching rendering code, and enables AI generation in Phase 2.

### 2. Frontend / Rendering Layer
Renders lesson steps from the content model. Captures learner interactions (drag, tap, slider, input). Fires instant feedback based on content model logic. Handles visual simulations and interactive elements specific to the domain.

### 3. Progress & Mastery Layer
Records per-learner state: lessons completed, problems answered, mastery status per concept, streak history. Drives next-step recommendations. Surfaces review steps when repeated failures are detected.

### 4. Persistence Layer
Stores all learner state server-side. Syncs across sessions and devices. Maintains streak and history data between logins.

---

## Tech Stack

*Recommended, not required. Use whatever ships the best product.*

| Layer | Recommended Options |
|---|---|
| Backend / Auth / DB | Firebase, Supabase, or custom server |
| Frontend Framework | React, Vue, or Svelte |
| Interactive Visuals | HTML5 Canvas, SVG, D3.js, or Konva.js |
| Content Format | JSON (structured lesson schema) |
| Phase 2 AI | OpenAI API or Anthropic Claude API |
| Math Verification | SymPy (Python) or math.js (JavaScript) |
| Deployment | Vercel, Firebase Hosting, or Render |

---

## Out of Scope

The following are explicitly excluded from this product:

- **Multi-subject coverage** — one domain only; breadth is penalized
- **Video content** — no video-based lessons at any phase
- **AI in the MVP** — zero model calls, generated content, or chatbot features before Phase 2
- **Multiple choice as the primary interaction** — at least one richer interaction type is required
- **Passive review** — the learning path must require active recall and manipulation, not re-reading
- **AI as a replacement** — AI features are additions; removing them must not break the app

---

## Submission & Delivery

**Final deadline: Sunday, 10:59 PM CT**

| Deliverable | Requirements |
|---|---|
| GitHub Repository | Chosen domain stated up front; setup guide; architecture overview; deployed link |
| Demo Video (3–5 min) | Full lesson walkthrough; interactive and visual elements; feedback; course path; AI features; learning science; architecture overview |
| Brainlift (1 page) | Tools & workflow; prompting strategies (3–5 examples); phase decisions; AI vs hand-written code split; key learnings and opinions |
| Deployed App | Public URL; auth enabled; mobile-functional; multi-user; works with AI off |

### Brainlift Required Sections

1. **Tools & workflow** — which AI coding tools were used and how
2. **Prompting strategies** — 3–5 prompts that worked, including prompts for building interactive lessons
3. **Phase decisions** — AI features chosen/skipped in Phase 2; learning science techniques chosen/skipped in Phase 3, with rationale
4. **Code analysis** — approximate split of AI-generated vs hand-written code
5. **Key learnings** — specific, opinionated insights from the build process

---

## MVP Test Scenarios

The following scenarios will be used to evaluate the MVP:

| # | Scenario | Pass Criteria |
|---|---|---|
| 1 | Learner completes one lesson end to end, getting some problems wrong | Feedback helps learner recover and complete the lesson |
| 2 | Learner manipulates the interactive visual element | Visual responds in real time to learner input |
| 3 | Learner leaves mid-lesson and returns | Progress and streak are exactly preserved |
| 4 | Learner finishes a lesson | App recommends a sensible next lesson in the domain |
| 5 | Full experience on a phone-sized screen | All interactions are usable with touch; layout is not broken |

---

*One subject taught deeply, by an app that works before the AI is even turned on, beats a feature-rich app that covers everything and teaches nothing.*
