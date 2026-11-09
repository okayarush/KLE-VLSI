# Student workflow redesign — audit and proposal (for review, nothing implemented)

Audited from `src/data/pages.ts` (all 16 pages, every section and field), plus `lib/progress.ts` and `lib/readiness.ts`.

## 1. What the audit found (root causes, not page-by-page symptoms)

1. **No guidance model.** A section only has a one-line `prompt` and a `placeholder`. There is no "why", no worked example, no "needs", no "feeds".
2. **Cross-page links are free text.** FR numbers are typed by hand on Pages 5, 6, 7 and 9 ("Governing FR", "Linked FR", "FR", "FR"). Block names are retyped on 5, 7 and 8. Member names are retyped on 1 and 13. Nothing checks them or connects them to the source.
3. **The same data is asked for repeatedly.** Candidate FRs (P2) → FR table (P4) → validation rows (P9) → walkthrough (P14) is one idea entered up to four times. The same goes for Predicted (P6 result → P8 → P9) and Measured (P8 → P9).
4. **Dependencies are invisible.** Page 9 is useless without Page 4 and Page 8, but nothing says so. The student finds out by being stuck.
5. **Everything is shown at once.** Page 4 has 7 fields per row, P6 has 7, P10 has 7. A beginner sees all of them on the first click.
6. **No "what next".** Progress is a percentage. It never says which section to do, and the order is implied only by the page numbers (which are not the design order: P1 Team, P2 Need, P3 Concepts, P4 FRs, P5 Architecture, P6 Design, P7 Map ...).
7. **Labels assume prior knowledge.** "Parameter", "Provenance", "Block", "Pugh", "BOM", "Traces to", "Foundation course used" are never explained.

## 2. Audit — per page

Legend: **Enter** = what the student writes. **From** = where it originates. **Used by** = who consumes it. **Auto** = what should populate itself. **Needs** = soft prerequisite (a warning with a link, never a lock). **Next** = the suggested follow-on.

| # | Page | Enter | From | Used by | Auto-populate | Needs | Next |
|---|------|-------|------|---------|---------------|-------|------|
| 0 | Home | team photo, latest update | the project as a whole | Dashboard, Submit | Team name, theme, artefact, members (from onboarding/P1); progress; last-updated date | — | Fill in P1 |
| 1 | Team and Roles | members + owned subsystem; per-review contributions | the team, themselves | member pickers on P1, P13; Team page; Home | Lead (from onboarding); members invited at onboarding appear as pre-made rows (name/email only) | — | P2 |
| 2 | Problem and Need | need statement; quantified inputs; background; 3 candidate FRs | the faculty brief, site visits, datasheets, measurements | **P3** (rationale), **P4** (candidate FRs become the first FRs), **P6** (inputs used in calculations) | Nothing inbound. It is the root of the chain | — | P3 |
| 3 | Concept Choices | ≥3 concepts, comparison, selected concept + why, scope | P2 need + inputs | P5 (selected concept frames the architecture), P7 | "Selected" prose offers the concept marked *Selected* (name + core idea) as a starting quote | P2: need + ≥1 input + candidate FRs | P4 |
| 4 | Functional Requirements | the FR table (no, statement, target, method, source, status) | **P2 candidate FRs** | **P5, P6, P7, P9, P14** (FR pickers), Submit readiness | **"Import your 3 candidate FRs from Page 2"** → rows pre-filled (statement, target, method), FR numbers auto-assigned (FR-01…), source/status left for the student | P2 candidate FRs (soft); P3 selected concept (soft) | P5 |
| 5 | Architecture | block diagram image; blocks (in/out/FR); subsystem alternatives | P3 selected concept, P4 FRs | **block list used by P7, P8, P5-alternatives, Home diagram** | "Governing FR" becomes a picker over the P4 FR table; the "Block" field in subsystem alternatives becomes a picker over the blocks above | P4 ≥1 FR; P3 selected concept | P6 |
| 6 | Design and Calculations | calculation cards, component reasons, schematic, BOM | P2 inputs, P4 FRs, P5 blocks | P7 (calc picker), **P9 predicted**, P8 predicted | "Linked FR" = FR picker; BOM "Traces to" = picker over this page's calculations; calc "Date predicted" = today | P4 FRs; P5 blocks; P2 inputs | P7 |
| 7 | Foundation Integration Map | map rows, decision cards | P5, P6 | Submit, Analysis | Block / FR / Calculation become pickers; "Measured result" is pulled from P9 once a matching FR row exists (read-only chip, student can override) | P5 blocks + P6 calc (soft) | P8 |
| 8 | Build and Verification | simulations, subsystem tests, integration, deviations | P5 blocks, P6 predicted values | **P9 measured**, P10 | Block picker (from P5); Predicted prefilled from the linked calculation result; **Deviation computed** from predicted & measured | P5 blocks; P6 calcs | P9 |
| 9 | Predicted vs Measured | one validation row per FR | P4 FRs, P6 predicted, P8 measured | Poster/P14, Submit readiness, Analysis | **One row auto-offered per FR** ("Create validation rows for all 7 FRs"): FR, target prefilled from P4; Predicted from P6; Measured from P8 if present; **Deviation and Pass/Fail computed** when numbers parse | P4 FRs; P8 tests (soft) | P10 or P14 |
| 10 | Failures and Fixes | debugging cycles | P8/P9 problems | Analysis, Submit | A "Log a failure from this failed test" shortcut on P8/P9 rows creates a cycle with the symptom prefilled | none (log as you go) | P11 |
| 11 | Engineering Notebook | dated entries | weekly work | Submit (cadence), Analysis | Date = today; Course dropdown from the courses already used on P6/P7 | none — ongoing from day one | repeat weekly |
| 12 | Review Record | review summary; responses to faculty observations | faculty reviews (read-only) | Submit, Feedback | One response row per released faculty observation, quoted text prefilled (not editable) | A faculty review must be released | edit the page you changed |
| 13 | Reflections | per-member reflections; lessons; forward links | the team | Submit | Member = picker over P1 members; Review = current review | P1 members | P14 |
| 14 | Final Demonstration | demo video, poster, FR walkthrough | all of the above | Submit | Walkthrough: **one line per FR** (FR number + statement from P4, timestamp left blank); Draft poster preview as previously agreed | P4 FRs; P9 results | P15 |
| 15 | Project Files | links | the team | Submit | Link types as suggestions | none | Submit |

### The data-flow spine (the thing that makes "enter once" possible)

```
Members (P1) ─────────────────────────────► P1 contributions, P13 reflections, Team page
Design inputs + Candidate FRs (P2) ─import─► FR table (P4)
Selected concept (P3) ───────────────────► Architecture framing (P5)
FR table (P4) ──pick──► P5 blocks, P6 calcs, P7 map, P9 validation, P14 walkthrough
Blocks (P5) ──pick──► P5 alternatives, P7 map, P8 sims/tests
Calc results (P6) ──prefill──► P8 predicted, P9 predicted
Tests (P8) ──prefill──► P9 measured          Predicted + Measured ──compute──► Deviation, Pass/Fail
```

## 3. Proposed design

### 3.1 One dependency registry (single source of truth)
A new `src/data/graph.ts` declares, per section: `needs[]` (page/section + minimum count), `feeds[]`, and `stage`. Everything below reads it: help panels, warning banners, empty states, the next-step engine, Dashboard, journey rail. If a dependency changes, it changes in one place.

### 3.2 Guidance on every section ("How to fill this in")
Each section gets a short collapsible panel, open the first time, remembered per student afterwards:
- **What goes here** (plain language, one or two sentences)
- **Why it matters** (what it unlocks: "Page 4 will import these")
- **Example** — labelled *"Example — not your data"*, never saved, never counted toward progress
- **Common mistake** (e.g. "Writing 'fast' instead of '< 10 ms'")

Every **field** gets a plain-language label and a hint, replacing bare labels. Example: `Parameter` → **What is being limited?** hint: *"A quantity your design must respect, e.g. input signal amplitude."* `Value and unit` → *"Number with unit, e.g. 2 Vpp."* `Provenance` → **How do you know this number?** (Measured / From a datasheet / Assumed, each with a one-line meaning). A small glossary tooltip covers FR, BOM, Pugh matrix, provenance, traceability.

### 3.3 Visible dependencies (never discovered by accident)
At the top of any section that has unmet `needs`, a quiet banner:
> **This works best after you've added your functional requirements.** You have 0 so far. **[Go to Page 4 → FR table]**

Soft only. Fields stay editable. The banner disappears the moment the need is met. Pickers with nothing to pick from show the same message in place ("No FRs yet — add them on Page 4").

### 3.4 Automatic population — three precisely different mechanisms
Avoids the "magic that surprises" problem:
1. **Reference (live link).** A new field kind `ref` renders a picker over another section's rows, stored by row ID, displayed by label. Rename FR-02's statement on P4 and it updates everywhere. If the source is deleted, the cell shows "FR-02 (removed)" in a warning colour instead of silently breaking. A student can still type free text via "Other…" so nothing is blocked.
2. **Import / prefill (copy once, then it's theirs).** Explicit buttons, never silent: "Import 3 candidate FRs from Page 2". Shows what will be created before doing it. Prefilled cells carry a small "from Page 2" chip; editing detaches the chip.
3. **Derived (computed, read-only).** Deviation, Pass/Fail, progress, counts, "Measured result" chip on P7. Always displays *how* (e.g. "(measured − predicted) / predicted"). If inputs aren't numeric it says "enter numbers with units to compute this".

**Rule: only the student's own entries are ever copied or computed. No sample data is inserted into a real project.**

### 3.5 Progressive disclosure
- Row editors open with **required fields only**; a "+ More details" toggle reveals optional ones (P6 calc: title, FR, working, result first; assumptions/course/date after).
- Conditional fields: P4 *Reason* only appears when status is Deferred/Under review; P2 *Source* is relabelled per provenance ("Which datasheet?", "How did you measure?", "Why assume this?").
- Sections for later stages are collapsed in the page and grouped under **"Later"** on the portfolio overview, with a one-line reason ("Do this after your build").
- Tabs for sections that have nothing to do yet show a dot rather than demanding attention.

### 3.6 Contextual empty states
Template, used for every section: **what belongs here → why it matters → tiny example → one primary action**, plus the dependency link if blocked. Replaces "No data yet". Keeps the existing line-art illustrations.

### 3.7 The student journey
Five stages, expressed as a journey rail on the Dashboard and Portfolio overview (the page order and names do **not** change):

| Stage | Plain-language goal | Pages |
|-------|---------------------|-------|
| 1 Start | "Set up your team" | P1 (and Home) |
| 2 Understand | "Define the problem with numbers" | P2 |
| 3 Decide | "Choose an idea and write requirements" | P3, P4 |
| 4 Design | "Plan and calculate the solution" | P5, P6, P7 |
| 5 Build & prove | "Build it, test it, compare to predictions" | P8, P9, P10 |
| Ongoing | "Keep a record as you go" | P11, P12, P13 |
| Finish | "Show it and package it" | P14, P15, Submit |

**Next-step engine.** A pure function over (content, graph, current review) returns the single best next action ("Add your team members — 2 min") plus 2–3 alternatives, ranked by: due-soon (page `due` vs current review) → unmet-needs satisfied → quick wins. Used by:
- Dashboard **"Start here"** card for a brand-new team: *Your first 30 minutes* — (1) add members, (2) write a rough need statement, (3) add your first design input. After that it becomes **"Continue where you left off"**.
- A thin **"Next:"** strip at the bottom of every page editor ("Done with this page? Next: Page 3 — Concept Choices").
- Section status chips: *Not started · In progress · Needs input from another page · Done · Do later*.

**Flexibility is preserved:** nothing is locked, order is a suggestion, out-of-order work is allowed with a gentle note ("You're adding measured values before predicted ones — Page 9 is clearer once Page 8 tests exist").

### 3.8 First-run
After team creation: a single **welcome sheet** (one screen, dismissible, reopenable from the Help menu) — "How this notebook works": the five stages, the "enter once" idea, and where "Next" lives. No multi-step tour.

## 4. Technical shape (small, mostly additive)

- `data/pages.ts`: add optional `guide` to sections and `hint` / `ref` / `showIf` / `advanced` to fields. Existing fields keep working untouched, so unconverted pages degrade to today's behaviour.
- `data/graph.ts`: dependency registry + stages.
- `lib/nextStep.ts`: pure next-step + section-status logic (unit-testable).
- `Sections.tsx`: `GuidePanel`, `DependencyBanner`, `RefPicker`, `ImportBar`, "More details" toggle, richer `EmptyState`.
- Real data stored by ID inside the existing `section_rows.data` jsonb — **no schema migration needed**.
- Demo mode: same features, guidance examples still labelled "not your data".

## 5. Decisions I need from you

1. **FR import:** one-click copy of P2 candidate FRs into P4 (my recommendation) vs. a live link where P2 rows *are* P4 rows. Copy is safer because P4 is frozen by faculty at Review 3.
2. **Pickers:** strict dropdown, or dropdown **plus** "Other…" free text (my recommendation, so nothing blocks a student).
3. **Example text:** I will write generic, multi-theme examples (not tied to one project). Should faculty review them, since they are handbook-adjacent?
4. **Scope/order:** I suggest delivering in four steps, each demoable — (A) graph + guidance panels + field hints on all 16 pages, (B) pickers + imports + derived values, (C) next-step engine + journey rail + Start-here card, (D) progressive disclosure + contextual empty states — then a cold-start walkthrough test as a brand-new account.

## 6. Verification once approved
A Playwright "cold start" test as a brand-new student: assert the Start-here card is the first thing seen; every section on all 16 pages shows a guide with an example labelled "not your data"; a blocked section shows a dependency banner with a working link; entering FRs on P4 makes them selectable on P5/6/7/9 with zero retyping; renaming an FR updates dependent rows; Deviation computes; deleting a source flags "(removed)"; nothing ever locks. **Note:** the open sign-in redirect bug in `KNOWN_ISSUES.md` still blocks the automated login step, so until that's resolved I'd test manually with `test@kletech.ac.in`, or seed the session in the test.
