import { FR_SOURCES, FR_STATUSES } from './handbook'

/**
 * The 16 portfolio pages (Home + 15) — names, numbers and order are FIXED (Proposal §3,
 * DESIGN_GUIDELINES principle 3). Section lists follow the "Required content" column of
 * PROJECT_REQUIREMENTS §4.1. Page → design-step links are [DERIVED] (PR §4.3) and advisory.
 */

export type FieldKind = 'text' | 'long' | 'select' | 'date'
export interface FieldDef {
  id: string; label: string; kind: FieldKind; options?: string[]; placeholder?: string; required?: boolean; wide?: boolean; chip?: boolean
  /** Plain-language help, shown in an ⓘ tooltip beside the label. */
  help?: string
  /** Short visible tag beside the label that says who fills this field in, e.g. "Entered by you". */
  note?: string
  /** 'fr': suggest (and check against) the FR numbers from the Page 04 table. Free text is still accepted. */
  suggest?: 'fr'
}

interface Base { id: string; title: string; prompt: string; wantsEvidence?: boolean }
export interface ProseSection extends Base { type: 'prose'; placeholder: string; minWords?: number; quantitative?: boolean }
export interface RowsSection extends Base { type: 'rows'; itemLabel: string; fields: FieldDef[]; titleField: string; minRows?: number; display: 'table' | 'cards' }
export interface EvidenceSection extends Base { type: 'evidence'; hint: string }
export type SectionDef = ProseSection | RowsSection | EvidenceSection

export interface PageDef {
  id: number
  slug: string
  title: string
  tagline: string
  due: string
  steps: number[]          // [DERIVED] design steps this page supports
  sections: SectionDef[]
  note?: string            // page-level handbook note shown under the header
}

const f = (id: string, label: string, kind: FieldKind = 'text', extra: Partial<FieldDef> = {}): FieldDef => ({ id, label, kind, ...extra })

export const PAGES: PageDef[] = [
  {
    id: 0, slug: 'home', title: 'Home', tagline: 'Your project at a glance', due: 'Review 1', steps: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    sections: [
      { id: 'photo', type: 'evidence', title: 'Team photo', prompt: 'A photo of the team with the project.', hint: 'Add a team photo with a caption.' },
      { id: 'update', type: 'prose', title: 'Latest dated update', prompt: 'What changed most recently? One short paragraph — it is dated automatically.', placeholder: 'This week we selected…', minWords: 15 },
    ],
  },
  {
    id: 1, slug: 'team-and-roles', title: 'Team and Roles', tagline: 'Who owns what', due: 'Review 1', steps: [],
    sections: [
      { id: 'members', type: 'rows', title: 'Members and owned subsystems', prompt: 'Each member, the subsystem they own, and how to reach them.', itemLabel: 'Member', titleField: 'name', display: 'cards', minRows: 1,
        fields: [f('name', 'Name', 'text', { required: true }), f('subsystem', 'Owned subsystem', 'text', { required: true }), f('contact', 'Contact', 'text')] },
      { id: 'contrib', type: 'rows', title: 'Contribution table', prompt: 'Updated at each review: what each member contributed since the last one.', itemLabel: 'Contribution', titleField: 'member', display: 'table', minRows: 1,
        fields: [f('review', 'Review', 'select', { options: ['Review 1', 'Review 2', 'Review 3', 'Review 4', 'Review 5', 'Final Review'] }), f('member', 'Member', 'text', { required: true }), f('contribution', 'Contribution', 'long', { required: true, wide: true })] },
    ],
  },
  {
    id: 2, slug: 'problem-and-need', title: 'Problem and Need', tagline: 'Why this project matters', due: 'Review 1', steps: [1],
    sections: [
      { id: 'need', type: 'prose', title: 'Need statement', prompt: 'Who needs what, why, and how you know. Say what is wrong today, in measurable terms.', placeholder: 'Today, …  The need is for …', minWords: 40, quantitative: true, wantsEvidence: true },
      { id: 'inputs', type: 'rows', title: 'Quantified design inputs', prompt: 'Numbers that constrain the design — with where each number came from.', itemLabel: 'Design input', titleField: 'parameter', display: 'table', minRows: 3, wantsEvidence: true,
        fields: [
          f('parameter', 'Parameter', 'text', { required: true, help: 'The quantity your design has to respect, for example input signal amplitude, supply voltage or bandwidth.' }),
          f('value', 'Value and unit', 'text', { required: true, placeholder: 'e.g. 2 Vpp', help: 'A number with its unit, for example 2 Vpp. A range such as “10 mV – 2 V” also draws a span bar in the chart on the overview.' }),
          f('provenance', 'Provenance', 'select', { options: ['measured', 'datasheet', 'assumed'], chip: true, required: true, help: 'How you know this number. Measured: you took it on the bench. Datasheet: it comes from a manufacturer’s datasheet. Assumed: it is your own estimate, so say what it is based on in the next field.' }),
          f('source', 'Source / how obtained', 'text', { wide: true, help: 'Where the number came from: your measurement notes, the datasheet and page, or the reasoning behind an assumption. An assumed value with no source is flagged on the overview.' }),
        ] },
      { id: 'background', type: 'prose', title: 'Background study', prompt: 'What already exists, what you read, and what you learned from it.', placeholder: 'Existing solutions include…', minWords: 40, wantsEvidence: true },
      { id: 'candfr', type: 'rows', title: 'Three candidate functional requirements', prompt: 'Draft at least three FRs with numbers. Vague wording is fine to start — then make it measurable.', itemLabel: 'Candidate FR', titleField: 'statement', display: 'cards', minRows: 3,
        fields: [
          f('statement', 'Statement', 'long', { required: true, wide: true, placeholder: 'The system must…', help: 'What the system must do, in plain words. Vague is fine for now; the target below is what makes it measurable.' }),
          f('target', 'Target (with unit)', 'text', { required: true, help: 'A number with a unit that makes the statement testable, for example ≥ 40 dB. Without it the card is shown as “Not yet quantified”.' }),
          f('method', 'How it will be measured', 'text', { help: 'How you would check it on the bench, for example an oscilloscope reading at 1 kHz.' }),
        ] },
    ],
  },
  {
    id: 3, slug: 'concept-choices', title: 'Concept Choices', tagline: 'Alternatives you weighed', due: 'Review 2', steps: [2],
    sections: [
      { id: 'alts', type: 'rows', title: 'Alternatives (at least three)', prompt: 'Each concept you seriously considered, including the ones you rejected.', itemLabel: 'Concept', titleField: 'name', display: 'cards', minRows: 3, wantsEvidence: true,
        fields: [f('name', 'Concept', 'text', { required: true }), f('idea', 'Core idea', 'long', { required: true, wide: true }), f('pros', 'Strengths', 'long'), f('cons', 'Weaknesses', 'long'), f('fate', 'Outcome', 'select', { options: ['Selected', 'Rejected'] })] },
      { id: 'compare', type: 'prose', title: 'Comparison (Pugh / weighted criteria)', prompt: 'How you compared the concepts: criteria, weights, and what you found. Attach the matrix as evidence.', placeholder: 'Criteria and weights: …', minWords: 30, wantsEvidence: true },
      { id: 'selected', type: 'prose', title: 'Selected concept and rationale', prompt: 'Which concept, and the engineering reasons it won.', placeholder: 'We selected … because …', minWords: 40, quantitative: true },
      { id: 'scope', type: 'prose', title: 'Scope: in and out', prompt: 'What this project will deliver, and what it deliberately will not.', placeholder: 'In scope: …  Out of scope: …', minWords: 20 },
    ],
  },
  {
    id: 4, slug: 'functional-requirements', title: 'Functional Requirements', tagline: 'The live requirements table', due: 'Review 3', steps: [3],
    note: 'Faculty freeze this table at Review 3. After that, changes need a documented reason and the history is retained. The freeze is applied by faculty — it is not simulated in this prototype.',
    sections: [
      { id: 'frtable', type: 'rows', title: 'Functional Requirements Table', prompt: 'Quantified statements of what the system must do. Each has a target, a measurement method, a source and a status — nothing blank.', itemLabel: 'FR', titleField: 'no', display: 'table', minRows: 3,
        fields: [
          f('no', 'FR No.', 'text', { required: true, placeholder: 'FR-01', note: 'Suggested · editable', help: 'The requirement’s number. New rows get the next number for you; you can change it. Pages 05, 06 and 09 refer to it, so keep each number unique.' }),
          f('statement', 'Statement', 'long', { required: true, wide: true, placeholder: 'The system must…', help: 'What the system must do, written so that it can be tested.' }),
          f('target', 'Target', 'text', { required: true, help: 'A number with a unit that shows whether the requirement is met, for example ≥ 40 dB or 880 kHz ± 2 %.' }),
          f('method', 'Measurement method', 'text', { required: true, help: 'How you will measure it on the bench, for example an oscilloscope sweep at 1 kHz.' }),
          f('source', 'Source', 'select', { options: FR_SOURCES, required: true, help: 'Where the requirement came from: a user need, the theme specification, a device datasheet, or a design standard.' }),
          f('status', 'Status', 'select', { options: FR_STATUSES, required: true, wide: true, help: 'Target confirmed: you can size a calculation from it. Under review: you cannot size it yet. Deferred: postponed. The last two need a reason.' }),
          f('reason', 'Reason (if deferred / under review)', 'text', { wide: true, help: 'Needed when the status is Under review or Deferred. The overview shows “Reason missing” until you fill it in.' }),
        ] },
    ],
  },
  {
    id: 5, slug: 'architecture-and-subsystems', title: 'Architecture and Subsystems', tagline: 'Blocks, interfaces, and why', due: 'Review 3', steps: [4, 5],
    sections: [
      { id: 'diagram', type: 'evidence', title: 'Block diagram', prompt: 'The functional architecture, with inputs and outputs of each block.', hint: 'Add the block diagram with a caption naming each block.' },
      { id: 'blocks', type: 'rows', title: 'Blocks and governing requirements', prompt: 'For each block: what goes in, what comes out, and which FR governs it.', itemLabel: 'Block', titleField: 'block', display: 'table', minRows: 3,
        fields: [
          f('block', 'Block', 'text', { required: true, help: 'One functional part of the system, for example Input buffer or Gain stage.' }),
          f('inputs', 'Inputs', 'text', { help: 'The signal or data that enters this block.' }),
          f('outputs', 'Outputs', 'text', { help: 'The signal or data that leaves this block.' }),
          f('fr', 'Governing FR', 'text', { required: true, placeholder: 'FR-01', suggest: 'fr', help: 'The requirement that sets this block’s targets. Start typing to pick one from the table on Page 04.' }),
        ] },
      { id: 'subalts', type: 'rows', title: 'Subsystem alternatives and selections', prompt: 'At least one alternative per block, and why you chose what you chose.', itemLabel: 'Subsystem decision', titleField: 'block', display: 'cards', minRows: 1,
        fields: [
          f('block', 'Block', 'text', { required: true, help: 'Use the same name as in the blocks table above. Blocks without a decision here are listed on the overview.' }),
          f('alt', 'Alternative(s) considered', 'long', { required: true, wide: true }),
          f('choice', 'Selected and why', 'long', { required: true, wide: true }),
        ] },
    ],
  },
  {
    id: 6, slug: 'design-and-calculations', title: 'Design and Calculations', tagline: 'Show the working', due: 'Review 4', steps: [6, 7, 8, 9],
    sections: [
      { id: 'calcs', type: 'rows', title: 'Calculation cards', prompt: 'Each calculation linked to an FR, with assumptions stated and the result dated before measurement.', itemLabel: 'Calculation', titleField: 'title', display: 'cards', minRows: 1, wantsEvidence: true,
        fields: [f('title', 'What is being sized', 'text', { required: true }), f('fr', 'Linked FR', 'text', { required: true, placeholder: 'FR-01' }), f('assumptions', 'Assumptions', 'long', { wide: true }), f('working', 'Working', 'long', { required: true, wide: true, placeholder: 'Gain = 1 + Rf/Rg = …' }), f('result', 'Result (with unit)', 'text', { required: true }), f('course', 'Foundation course used', 'text'), f('date', 'Date predicted', 'date')] },
      { id: 'reasons', type: 'prose', title: 'Component reasons', prompt: 'Why each key component or device was chosen, in engineering terms.', placeholder: 'We chose … because …', minWords: 30, quantitative: true },
      { id: 'schematic', type: 'evidence', title: 'Schematic and constraints', prompt: 'Schematic, layout and constraint files.', hint: 'Add the schematic / constraints with a caption.' },
      { id: 'bom', type: 'rows', title: 'Bill of materials', prompt: 'Each part traces back to a calculation or a stated assumption.', itemLabel: 'Part', titleField: 'part', display: 'table', minRows: 1,
        fields: [f('part', 'Part', 'text', { required: true }), f('value', 'Value / rating', 'text'), f('qty', 'Qty', 'text'), f('trace', 'Traces to (calculation / assumption)', 'text', { required: true, wide: true })] },
    ],
  },
  {
    id: 7, slug: 'foundation-integration-map', title: 'Foundation Integration Map', tagline: 'Decisions mapped to courses', due: 'Reviews 3–5', steps: [],
    note: 'The Measured Result column is meant to be filled after Step 13 (Performance Validation). Entries made earlier count as retrospective documentation.',
    sections: [
      { id: 'map', type: 'rows', title: 'Integration map', prompt: 'Decision · Block · FR · Calculation · Course · Measured result.', itemLabel: 'Map row', titleField: 'decision', display: 'table', minRows: 1,
        fields: [f('decision', 'Decision', 'text', { required: true }), f('block', 'Block', 'text'), f('fr', 'FR', 'text', { placeholder: 'FR-01' }), f('calc', 'Calculation', 'text'), f('course', 'Course', 'text'), f('measured', 'Measured result', 'text')] },
      { id: 'cards', type: 'rows', title: 'Decision cards', prompt: 'One card for each significant decision.', itemLabel: 'Decision card', titleField: 'decision', display: 'cards', minRows: 1, wantsEvidence: true,
        fields: [f('decision', 'Decision', 'text', { required: true }), f('level', 'Level', 'select', { options: ['Applied', 'Verified'] }), f('why', 'Why this, and not the alternative?', 'long', { required: true, wide: true }), f('fr', 'Related FR', 'text')] },
    ],
  },
  {
    id: 8, slug: 'build-and-verification', title: 'Build and Verification', tagline: 'From simulation to hardware', due: 'Review 5', steps: [10, 11, 12],
    sections: [
      { id: 'sim', type: 'rows', title: 'Simulation / testbench results', prompt: 'What you simulated, with what stimulus, and what happened.', itemLabel: 'Simulation', titleField: 'block', display: 'cards', minRows: 1, wantsEvidence: true,
        fields: [f('block', 'Block / testbench', 'text', { required: true }), f('setup', 'Stimulus and setup', 'long', { wide: true }), f('result', 'Result', 'long', { required: true, wide: true })] },
      { id: 'tests', type: 'rows', title: 'Subsystem test records', prompt: 'Parameter · Instrument · Predicted · Measured · Deviation · Remarks.', itemLabel: 'Test', titleField: 'parameter', display: 'table', minRows: 1, wantsEvidence: true,
        fields: [f('parameter', 'Parameter', 'text', { required: true }), f('instrument', 'Instrument', 'text'), f('predicted', 'Predicted', 'text', { required: true }), f('measured', 'Measured', 'text'), f('deviation', 'Deviation', 'text'), f('remarks', 'Remarks', 'text', { wide: true })] },
      { id: 'integration', type: 'prose', title: 'Integration evidence', prompt: 'How the subsystems were brought together and checked as a system.', placeholder: 'We integrated … by …', minWords: 30, wantsEvidence: true },
      { id: 'deviations', type: 'rows', title: 'Deviations from the plan', prompt: 'Where the build differs from the schematic or the design, and why.', itemLabel: 'Deviation', titleField: 'what', display: 'cards', minRows: 0,
        fields: [f('what', 'Deviation', 'text', { required: true }), f('why', 'Reason', 'long', { required: true, wide: true })] },
    ],
  },
  {
    id: 9, slug: 'predicted-vs-measured', title: 'Predicted vs Measured', tagline: 'One row for every requirement', due: 'Final Review', steps: [13],
    sections: [
      { id: 'validation', type: 'rows', title: 'Validation sheet', prompt: 'One row per functional requirement: the prediction, the measurement, the deviation and the explanation.', itemLabel: 'Validation row', titleField: 'fr', display: 'table', minRows: 1, wantsEvidence: true,
        fields: [
          f('fr', 'FR', 'text', { required: true, placeholder: 'FR-01', suggest: 'fr', help: 'Which requirement this row validates. Start typing to pick one from the table on Page 04.' }),
          f('target', 'Target', 'text', { help: 'The target for this requirement, as written on Page 04.' }),
          f('predicted', 'Predicted', 'text', { required: true, help: 'What you calculated before measuring (see your calculations on Page 06). Include the unit.' }),
          f('measured', 'Measured', 'text', { required: true, help: 'What you read on the bench (see your test records on Page 08). Include the unit.' }),
          f('deviation', 'Deviation', 'text', { note: 'Entered by you', help: 'Type the difference between predicted and measured, for example −1.6 %. It is not calculated for you here; the chart on the overview works out its own figures from Predicted and Measured.' }),
          f('explain', 'Explanation of any discrepancy', 'long', { wide: true, help: 'Why the measured value differs from the prediction, for example loading, component tolerance or noise.' }),
          f('result', 'Result', 'select', { options: ['Pass', 'Fail'], note: 'Entered by you', help: 'Your judgement of whether the measured value meets the target.' }),
        ] },
    ],
  },
  {
    id: 10, slug: 'failures-and-fixes', title: 'Failures and Fixes', tagline: 'The debugging log', due: 'Review 5', steps: [14],
    sections: [
      { id: 'debug', type: 'rows', title: 'Debugging log', prompt: 'Symptom → test → root cause → correction → re-measurement → learning.', itemLabel: 'Failure cycle', titleField: 'symptom', display: 'cards', minRows: 2, wantsEvidence: true,
        fields: [f('symptom', 'Symptom', 'text', { required: true }), f('test', 'Test that isolated it', 'long', { wide: true }), f('cause', 'Root cause', 'long', { required: true, wide: true }), f('fix', 'Correction', 'long', { wide: true }), f('remeasure', 'Re-measurement', 'text'), f('learning', 'What you learned', 'long', { wide: true }), f('state', 'State', 'select', { options: ['Open', 'Closed'] })] },
    ],
  },
  {
    id: 11, slug: 'engineering-notebook', title: 'Engineering Notebook', tagline: 'Dated, honest, weekly', due: 'Weekly', steps: [],
    note: 'Entries are dated by the server when saved. Back-dated entries are flagged, not hidden.',
    sections: [
      { id: 'entries', type: 'rows', title: 'Notebook entries', prompt: 'Objective · decision or calculation · course used · learning · next action.', itemLabel: 'Entry', titleField: 'objective', display: 'cards', minRows: 1, wantsEvidence: true,
        fields: [f('date', 'Date', 'date', { required: true }), f('objective', 'Objective', 'text', { required: true, wide: true }), f('decision', 'Decision / calculation', 'long', { wide: true }), f('course', 'Course used', 'text'), f('learning', 'Learning', 'long', { wide: true }), f('next', 'Next action', 'text', { wide: true })] },
    ],
  },
  {
    id: 12, slug: 'review-record', title: 'Review Record', tagline: 'What was said, and what you did', due: 'After each review', steps: [],
    note: 'Faculty observations appear here verbatim and read-only after a review. You record your response and what you changed.',
    sections: [
      { id: 'summary', type: 'prose', title: 'Review summary (team)', prompt: 'Your own summary of the review in a few lines.', placeholder: 'At the review we presented… The main points raised were…', minWords: 15 },
      { id: 'responses', type: 'rows', title: 'Team responses', prompt: 'For each observation: your response and the page you changed.', itemLabel: 'Response', titleField: 'observation', display: 'cards', minRows: 0,
        fields: [f('observation', 'Observation (quoted)', 'long', { required: true, wide: true }), f('response', 'Team response', 'long', { required: true, wide: true }), f('changed', 'Page changed', 'text')] },
    ],
  },
  {
    id: 13, slug: 'reflections-and-forward-links', title: 'Reflections and Forward Links', tagline: 'What changed in how you think', due: 'Each review · finalised at Final', steps: [],
    sections: [
      { id: 'reflect', type: 'rows', title: 'Individual reflections', prompt: 'Each member reflects after every review — in their own words.', itemLabel: 'Reflection', titleField: 'member', display: 'cards', minRows: 1,
        fields: [f('member', 'Member', 'text', { required: true }), f('review', 'Review', 'select', { options: ['Review 1', 'Review 2', 'Review 3', 'Review 4', 'Review 5', 'Final Review'] }), f('text', 'Reflection', 'long', { required: true, wide: true })] },
      { id: 'lessons', type: 'prose', title: 'Lessons for the next cohort', prompt: 'What would you tell the team starting this project next year?', placeholder: 'If we did this again…', minWords: 30 },
      { id: 'forward', type: 'rows', title: 'Forward links', prompt: 'Later courses or the Minor Project this work connects to, and how.', itemLabel: 'Link', titleField: 'course', display: 'table', minRows: 0,
        fields: [f('course', 'Course / project', 'text', { required: true }), f('how', 'How this work prepares for it', 'text', { required: true, wide: true })] },
    ],
  },
  {
    id: 14, slug: 'final-demonstration', title: 'Final Demonstration', tagline: 'Show it working', due: 'Final Review', steps: [16],
    sections: [
      { id: 'video', type: 'evidence', title: 'Demo video (3–5 minutes)', prompt: 'A walkthrough of every functional requirement.', hint: 'Upload the video or note where it is hosted, with a caption.' },
      { id: 'poster', type: 'evidence', title: 'Summary poster', prompt: 'One-page summary poster.', hint: 'Add the poster with a caption.' },
      { id: 'walk', type: 'prose', title: 'FR walkthrough notes', prompt: 'For each FR, the timestamp in the video where it is demonstrated.', placeholder: 'FR-01 — 0:35 …', minWords: 15 },
    ],
  },
  {
    id: 15, slug: 'project-files', title: 'Project Files', tagline: 'Where everything lives', due: 'Final Review', steps: [15],
    note: 'The portfolio links to the formal report; it does not copy it. This is the only repository-style page.',
    sections: [
      { id: 'links', type: 'rows', title: 'Links', prompt: 'Formal report, RTL / firmware repository, schematic and simulation files.', itemLabel: 'Link', titleField: 'title', display: 'table', minRows: 1,
        fields: [f('kind', 'Type', 'select', { options: ['Formal report', 'RTL / firmware repository', 'Schematic', 'Simulation files', 'Other'], required: true }), f('title', 'Title', 'text', { required: true }), f('url', 'URL', 'text', { required: true, wide: true, placeholder: 'https://…' }), f('notes', 'Notes', 'text', { wide: true })] },
    ],
  },
]

export const pageById = (id: number) => PAGES[id]
export const pageBySlug = (slug?: string) => PAGES.find((p) => p.slug === slug)
export const pageLabel = (p: PageDef) => (p.id === 0 ? 'Home' : `Page ${p.id} — ${p.title}`)
