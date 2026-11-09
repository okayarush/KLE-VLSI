# AI Mentor Engineering Viva Examiner Upgrade Report

**Document Status:** Complete & Verified  
**Date:** 09 November 2026  
**Target Repository:** Mini Project Portfolio Platform (`web/`)  
**Scope:** Complete AI System (Engine, Grounding, Multi-Page Context, Question Generation, Answer Evaluation, UI, Tests)

---

## 1. Executive Summary & Architecture Comparison

The AI Mentor has been fundamentally upgraded from a naive, single-page heuristic chatbot into a **rigorous, context-aware engineering faculty examiner**. The system now reads and synthesizes the student's entire multi-page submission (Pages 0–15), detects cross-page contradictions, verifies quotes against source text, enforces a 6-tier evaluation state machine, performs deterministic calculation checking, delivers 3-tier progressive pedagogical scaffolding, and maintains persistent session memory.

### Previous vs. New Architecture

| Dimension | Previous Architecture | Upgraded Architecture |
|---|---|---|
| **Context Scope** | Single active page only; raw text concatenation; stripped tables | **Full-project structured model** (Pages 0–15); schema-aware dynamic builder; targeted cross-page context injection. |
| **Cross-Page Awareness** | None during viva; Page 6 calculation unaware of Page 4 FR or Page 2 Inputs | **Evidence-based cross-page analyzer**; traces FRs through blocks, calcs, and validation; detects contradictions with source citations. |
| **Question Grounding** | Prompts requested quotes, but quotes were **never verified** (hallucinated quotes rendered) | **Quote Verification Gate**: Every quote is checked against student text/tables; non-matching quotes are stripped to prevent hallucination. |
| **Evaluation Model** | Binary `resolved \| followup \| gap`; naive 20-word + `"because"` auto-resolution bug | **6-Tier Evaluation State Machine**: `resolved`, `needs_clarification`, `incorrect`, `non_answer`, `needs_verification`, `unresolved`. |
| **Calculations & Math** | Completely relied on LLM intuition; fallback checked only word counts | **Deterministic engineering knowledge layer**: validates Ohm's law, op-amp gain, GBW, ADC resolution, regulator dissipation. |
| **Scaffolding & Hints** | None; fixed 3-turn limit forced premature closure to `gap` | **Progressive 3-Tier Scaffolding Engine** (Concept $\to$ Formula $\to$ Substitution) + dedicated interactive hint controls. |
| **Multi-Turn Memory** | Empty `thread: []` on each issue; zero memory of prior answers or admissions | **Persistent Session Memory Manager**: tracks mastered concepts, misconceptions, established facts, and detects contradictions across turns. |
| **Progression Agency** | UI auto-advanced on `gap` or `resolved`, abruptly swapping screens | **Student-governed progression**: clickable topic pips, explicit "Next issue →" action, and student-confirmed skip. |
| **Offline Reliability** | Silent fallback to naive regex that falsely resolved issues | **Honest offline mode**: runs structural checks, detects non-answers, verifies math, surfaces clear offline banner; never falsely resolves. |

---

## 2. Improvements & New Capabilities

### 2.1 Full-Project Dynamic Context Builder (`projectContext.ts`)
- **Schema-Aware & Dynamic:** Gracefully handles incomplete, partial, or empty submissions without throwing errors.
- **Hierarchical Extraction:** Slices need statements, quantified design inputs (with provenance), candidate FRs, Pugh matrix comparison criteria, functional requirements table, architectural blocks, design calculations, BOM, validation sheet, debugging logs, notebook entries, and evidence attachments.
- **Compact Project Digest:** Generates a high-density, token-efficient digest for LLM injection, avoiding context window bloat and reducing inference latency.

### 2.2 Evidence-Based Cross-Page Consistency Analyzer (`crossPageAnalyzer.ts`)
- **Traceability Chains:** Traces Page 04 Functional Requirements to Page 05 Blocks, Page 06 Calculations, and Page 09 Validation rows.
- **Contradiction Detection with Dual Citations:** Identifies genuine engineering contradictions (e.g. Page 2 specifies 5V supply while Page 6 BOM lists a 12V motor driver without conversion) and cites both Page A and Page B with exact section IDs.
- **Distinguishes Missing Info from Contradictions:** Crucially avoids flagging incomplete or unvalidated requirements as contradictions.

### 2.3 Deterministic Engineering Knowledge Layer (`engineeringKnowledge.ts`)
- **Strict Mathematical Verification:** Evaluates formulas with algebraic tolerance checks:
  - Op-Amp Gain: $A_v = 1 + \frac{R_f}{R_g}$ (non-inverting) and $A_v = -\frac{R_f}{R_{in}}$ (inverting).
  - Gain-Bandwidth Product: $f_{-3dB} = \frac{GBW}{A_v}$.
  - Linear Regulator Power Dissipation: $P_D = (V_{in} - V_{out}) \cdot I_{load}$.
  - ADC Voltage Resolution: $\Delta V = \frac{V_{ref}}{2^N}$.
- **Unit Normalization:** Parses metric prefixes (p, n, $\mu$, m, k, M, G) and units (V, A, Hz, $\Omega$, W, dB, %).
- **Transparent Boundaries:** Explicitly flags when an engineering decision is outside the supported deterministic suite and defers to qualitative model evaluation rather than making unverified claims.

### 2.4 Grounded Socratic Questioning Engine across Seven Lenses (`questionEngine.ts`)
- Questions test actual project weaknesses rather than mechanical checklists across:
  1. Functional Need
  2. Alternatives Considered
  3. Mathematical Derivation
  4. Verification & Validation
  5. Failure & Risk
  6. Traceability
  7. Reflection & Learning
- **Internal Question Metadata:** Attaches question category (`determinate`, `tradeoff`, `evidence`), concept tested, expected demonstration, and 3 pre-computed hints.
- **Quote Verification Gate:** Strictly validates every candidate quote against `content.prose` and `content.rows`. Hallucinations are prevented before reaching the student.

### 2.5 6-State Student Answer Evaluator (`answerEvaluator.ts`)
- Replaces naive word-count matching with a structured state machine:
  - `resolved`: Validated engineering reasoning with quantified grounding.
  - `needs_clarification`: Plausible answer missing calculations, tolerances, or specific parameters.
  - `incorrect`: Technical misconception or calculation error (flags `isDeterminateError`).
  - `non_answer`: Evasion ("idk", "dunno", "skip"), repetitive filler, or gibberish.
  - `needs_verification`: Claim cannot be established with available context/datasheets.
  - `unresolved`: Topic closed without required understanding.
- **Accepts Multiple Valid Approaches:** Evaluates open-ended design trade-offs on the merits of constraints, power, cost, and reliability rather than comparing against a rigid string.

### 2.6 Progressive Scaffolding & Hint Engine (`scaffoldingEngine.ts`)
- Provides 3-tier scaffolding:
  - **Tier 1 (Core Concept):** Identifies the governing physical mechanism.
  - **Tier 2 (Governing Relationship):** States the mathematical formula or datasheet parameter.
  - **Tier 3 (Working Steps):** Prompts substitution of specific design parameters.
- Prompts student synthesis: requires the student to articulate the final reasoning in their own words.

### 2.7 Persistent Session Memory Manager (`sessionMemory.ts`)
- Maintains a compact, cumulative memory across viva issues:
  - Mastered concepts.
  - Identified misconceptions.
  - Established numerical facts (e.g. supply voltages, gain targets).
  - Previous questions and outcomes.
- Detects contradictions with earlier viva turns (e.g. claiming 12V supply after previously establishing $\pm 5\text{V}$).

### 2.8 Enhanced Student Viva UI (`Mentor.tsx` & `ai.css`)
- **Clickable Topic Pips:** Allows students to switch between questions and review past threads.
- **Evaluation Badges:** Inline badges render evaluation outcomes (`✓ Reasoning Verified`, `Clarification Requested`, `⚠ Technical Discrepancy Detected`, `Non-Answer / Evasion`, `Datasheet Needed`).
- **Interactive Scaffolding Button:** "💡 Hint (X/3)" button delivers pedagogical hints on demand.
- **Stale Closure Bug Resolved:** Employs functional store reads to prevent concurrent message clobbering.
- **Active Session Persistence:** Session ID tracked via URL query parameter so page reloads do not reset the viva view.

---

## 3. Files Created and Modified

```
web/
├── package.json                          Added "test:mentor" script
├── vite-plugin-groq.ts                   Added max_tokens (3000) for structured JSON responses
├── src/
│   ├── ai/
│   │   ├── types.ts                      NEW: 6 evaluation states, QuestionRationale, StructuredProject, SessionMemory
│   │   ├── projectContext.ts             NEW: Schema-aware dynamic project builder & digest generator
│   │   ├── crossPageAnalyzer.ts          NEW: Evidence-based cross-page contradiction & traceability engine
│   │   ├── submissionUnderstanding.ts    NEW: Engineering decision classifier & mental model builder
│   │   ├── engineeringKnowledge.ts       NEW: Deterministic calculation checks & unit normalizer
│   │   ├── scaffoldingEngine.ts          NEW: 3-tier progressive hint engine
│   │   ├── sessionMemory.ts              NEW: Multi-issue persistent viva memory & contradiction detector
│   │   ├── questionEngine.ts             NEW: Seven Lenses question generator & quote verification gate
│   │   ├── answerEvaluator.ts            NEW: 6-state student evaluator & evasion filter
│   │   ├── prompts.ts                    MODIFIED: System prompt, viva evaluation prompt, project injection
│   │   ├── groq.ts                       MODIFIED: Full pipeline integration, error recovery, offline routing
│   │   └── engine.ts                     MODIFIED: Fixed root cause bug (deleted naive 20-word rule)
│   ├── features/
│   │   └── student/
│   │       └── Mentor.tsx                MODIFIED: Pips navigation, hint button, evaluation badges, safe updates
│   ├── state/
│   │   └── store.ts                      MODIFIED: ThreadMsg, MentorQuestion, MentorSession schema extensions
│   └── styles/
│       └── ai.css                        MODIFIED: Styles for .msg-hint, .eval-badge, and interactive .pip
└── tests/
    ├── loader.mjs                        NEW: Node ESM loader for extensionless TypeScript imports
    └── mentor-evaluator.test.mjs         NEW: Automated test suite covering 17 critical viva scenarios
```

---

## 4. Test Verification & Results

An automated test suite was constructed in `web/tests/mentor-evaluator.test.mjs` and executed via `npm run test:mentor`. All 17 scenarios passed with zero failures:

```
✔ 1. Non-answers and evasions must be detected and never resolve (1.48ms)
✔ 2. Long answers with filler and "because" must NOT auto-resolve (0.85ms)
✔ 3. Irrelevant text must not resolve (0.39ms)
✔ 4. Incorrect mathematical calculations must be flagged as determinate errors (0.40ms)
✔ 5. Correct mathematical calculations must verify accurately (0.14ms)
✔ 6. Deterministic formula checks for Op-Amp Gain and Power Dissipation (0.50ms)
✔ 7. Quote Verification Gate must reject hallucinated quotes (1.70ms)
✔ 8. Cross-page consistency must identify true contradictions without mistaking missing data for conflicts (0.65ms)
✔ 9. Progressive scaffolding delivers 3 contextual tiers without giving away answers (0.24ms)
✔ 10. Session memory preserves established facts and detects contradictions across questions (0.34ms)
✔ 11. Dynamic context builder handles sparse or missing portfolio content gracefully (0.52ms)
✔ 12. Normalizer protects against invalid or malformed model responses (0.22ms)
✔ 13. Unit parsing and normalization for engineering values (0.27ms)
✔ 14. Smart fallback questions are grounded and tag engineering lenses (0.48ms)
✔ 15. Valid alternative design approaches are accepted with sound trade-off rationale (0.38ms)
✔ 16. Claims that cannot be verified from available context return needs_verification (0.18ms)
✔ 17. End-to-end multi-turn viva conversation progression with progressive hints (0.28ms)

Total: 17 passed, 0 failed, 0 skipped
Duration: 14.5ms
```

### Production Build & Lint Status
- `npm run build`: **Passed** (0 errors, clean TypeScript build in 1.17s).
- `npm run lint`: **Passed** (0 errors, oxlint completed across 71 files).

---

## 5. Working Features vs. Incomplete Features & Known Limitations

### Fully Working Features
1. **Zero-Quote-Hallucination Gate:** Questions cannot present quotes that do not exist verbatim in student text or tables.
2. **Deterministic Calculation Verification:** Op-amp gain, GBW cutoff, linear regulator dissipation, and ADC resolution are checked deterministically before LLM evaluation.
3. **Evasion Defense:** "idk", filler, and empty answers are flagged as `non_answer` and never resolve issues.
4. **Long Filler Defense:** Word count $\ge 20$ with `"because"` no longer auto-resolves.
5. **Cross-Page Contradiction Detection:** True physical/electrical contradictions are detected with dual page citations.
6. **Progressive Hints:** Students can click "Hint" to receive Tier 1, 2, or 3 scaffolding.
7. **Session Memory Continuity:** AI remembers facts established in earlier questions within the same viva session.
8. **Student-Controlled Progression:** Pips allow revisiting past questions; issues stay open until resolved or explicitly skipped.

### Incomplete Features & Known Limitations
1. **Deterministic Calculation Suite Breadth:** Deterministic calculation checking is currently active for analog op-amps, linear regulators, ADC quantization, and sampling. Complex DSP, high-speed digital timing, or RF impedance calculations fall back to confidence-aware LLM reasoning with `needs_verification`.
2. **Faculty Supervisory UI:** The database schema for faculty annotations (`ai_faculty_annotations`) and student disputes (`ai_student_disputes`) is live with RLS policies, but the faculty-facing web UI route `/faculty/*` currently renders a placeholder.
3. **Third-Party Datasheet Database Access:** The AI Mentor does not have live internet search access during viva turns to fetch external PDF datasheets. It grounds itself on the student's submitted text, attached evidence captions, and handbook specifications. Claims relying on unsubmitted datasheets are safely flagged as `needs_verification`.

---

## 6. Conclusion

The AI Mentor now functions as an authentic, context-aware engineering viva examiner. It challenges student decisions with grounded questions, verifies mathematics against circuit theory, guides struggling students with progressive scaffolding, and strictly refuses to mark issues resolved until genuine engineering understanding is demonstrated.

