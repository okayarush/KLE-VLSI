# Integration Portfolio — student frontend (prototype)

Student-first frontend for the KLE Technological University Foundation Integration Mini Project portfolio platform.
**Prototype only:** mock data in the browser (localStorage), a prototype sign-in, and *simulated* AI. See
[`../FRONTEND_IMPLEMENTATION_PLAN.md`](../FRONTEND_IMPLEMENTATION_PLAN.md) for direction and
[`../OPEN_ISSUES_AND_DECISIONS.md`](../OPEN_ISSUES_AND_DECISIONS.md) for unresolved academic/product questions
(nothing here resolves them).

## Run
```
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
npm run lint
```
Sign in with any `@kletech.ac.in` address, or "Explore with a demo student". "Reset demo data" is in the avatar menu.

## Structure
```
src/
  app/            router (lazy routes) and student route guard
  brand/          BrandMark — university logo slot + typographic lockup; product glyph
  design-system/  primitives and the 16-step DesignChain (signature element)
  data/           handbook-derived data: steps, reviews, themes/artefacts, the 16 page definitions, demo team
  state/          zustand store (persisted) + demo seed — stands in for the backend
  lib/            progress, review-readiness (advisory) helpers
  ai/             MOCK AI: engine.ts (rules), AIPanel, shared AI UI parts
  features/       landing, auth, student/* (dashboard, team, portfolio editor, evidence, submit, mentor, analysis, feedback)
  roles/          /faculty /hod /admin placeholders — intentionally empty until their phases
```
The 16-page editor is config-driven from `src/data/pages.ts` (names, numbers and order are fixed).

## KLE Tech logo
The official logo is not in the repo and is never recreated. Place it at `public/brand/kle-tech-logo.svg`
(or `.png`) and it appears automatically in the lockups.

## Replacing the mock AI
All simulated behaviour lives in `src/ai/engine.ts` (`insightsForPage`, `analysePortfolio`, `mentorQuestionsFor`,
`evaluateReply`). UI components depend only on its types. Rules to keep: no marks or grades, AI never edits the
portfolio, AI output stays visually separate from faculty feedback.

## Known limits
Evidence files stay in the browser tab (only metadata is stored); no real auth; no backend; review dates, upload
limits and several handbook definitions are pending decisions and are labelled as such in the UI.
