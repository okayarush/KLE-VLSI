import type { PageDef } from '../data/pages'
import type { Content } from '../lib/progress'
import type { MentorQuestion } from '../state/store'
import type {
  EngineeringLens,
  GeneratedQuestionItem,
  QuestionCategory,
  StructuredProject,
} from './types'

/**
 * Validates whether a quoted passage exists verbatim in the student's content.
 * Checks both prose sections and table row cells.
 */
export function verifyQuoteInContent(quote: string | undefined, content: Content): boolean {
  if (!quote || !quote.trim()) return false
  const clean = quote.trim().toLowerCase()
  if (clean.length < 5) return false

  // 1. Check prose
  for (const text of Object.values(content?.prose ?? {})) {
    if (typeof text === 'string' && text.toLowerCase().includes(clean)) {
      return true
    }
  }

  // 2. Check table row values
  for (const rows of Object.values(content?.rows ?? {})) {
    if (Array.isArray(rows)) {
      for (const r of rows) {
        if (r?.v) {
          for (const cell of Object.values(r.v)) {
            if (typeof cell === 'string' && cell.toLowerCase().includes(clean)) {
              return true
            }
          }
        }
      }
    }
  }

  return false
}

/**
 * Intelligent Page-Specific Question Fallback Generator
 * Generates grounded, lens-aware questions when offline or when LLM is unavailable.
 * Always includes full rationale metadata and progressive hints.
 */
export function generateSmartFallbackQuestions(
  page: PageDef,
  _content: Content,
  project: StructuredProject,
): MentorQuestion[] {
  const qs: MentorQuestion[] = []

  // PAGE 2: Problem and Need
  if (page.id === 2) {
    const assumedInput = (project.problemNeed?.designInputs ?? []).find(
      (i) => i.provenance === 'assumed' && i.parameter,
    )
    if (assumedInput) {
      const qText = `Your design input “${assumedInput.parameter}” is marked as assumed (${assumedInput.value}). What physical laboratory measurement or datasheet boundary justifies this value, and how sensitive is your architecture to a 2× variation in it?`
      qs.push({
        id: crypto.randomUUID(),
        pageId: 2,
        type: 'Unsupported assumption',
        quote: assumedInput.parameter,
        text: qText,
        status: 'open',
        followups: 0,
        thread: [],
        lens: 'Functional Need',
        category: 'determinate',
        rationale: {
          triggerQuote: assumedInput.parameter,
          lens: 'Functional Need',
          category: 'determinate',
          conceptTested: 'Sensitivity analysis of assumed design inputs',
          expectedDemonstration: 'Demonstrate how the assumed parameter affects sizing and how it can be measured or looked up.',
          scaffoldingHints: [
            'Consider what happens to the downstream circuit if this assumed parameter is twice as large.',
            'Look at how this parameter is bounded by circuit laws or component datasheets.',
            'State a bench test method (e.g. oscilloscope capture, DMM probe) that could replace the assumption with empirical data.',
          ],
        },
      } as any)
    }

    const firstCandFr = (project.problemNeed?.candidateFRs ?? [])[0]
    if (firstCandFr && !firstCandFr.target) {
      qs.push({
        id: crypto.randomUUID(),
        pageId: 2,
        type: 'Needs context',
        quote: firstCandFr.statement,
        text: `Candidate requirement “${firstCandFr.statement}” lacks a quantified target. What numerical specification with units will define whether this requirement is satisfied?`,
        status: 'open',
        followups: 0,
        thread: [],
        lens: 'Functional Need',
        category: 'determinate',
        rationale: {
          triggerQuote: firstCandFr.statement,
          lens: 'Functional Need',
          category: 'determinate',
          conceptTested: 'Quantification of functional requirements',
          expectedDemonstration: 'Provide a target number with units and tolerance.',
          scaffoldingHints: [
            'A requirement is testable only when it specifies a measurable quantity.',
            'What unit (e.g. dB, V, Hz, %) measures performance here?',
            'State the minimum acceptable number that satisfies the user need.',
          ],
        },
      } as any)
    }
  }

  // PAGE 3: Concept Choices
  if (page.id === 3) {
    const selectedAlt = (project.conceptChoices?.alternatives ?? []).find((a) => a.fate === 'Selected')
    const rejectedAlt = (project.conceptChoices?.alternatives ?? []).find((a) => a.fate === 'Rejected')

    if (selectedAlt && rejectedAlt) {
      qs.push({
        id: crypto.randomUUID(),
        pageId: 3,
        type: 'Open design choice',
        quote: selectedAlt.name,
        text: `You selected “${selectedAlt.name}” over “${rejectedAlt.name}”. Which specific evaluation criterion drove this choice, and under what operating condition would “${rejectedAlt.name}” have been the better engineering decision?`,
        status: 'open',
        followups: 0,
        thread: [],
        lens: 'Alternatives Considered',
        category: 'tradeoff',
        rationale: {
          triggerQuote: selectedAlt.name,
          lens: 'Alternatives Considered',
          category: 'tradeoff',
          conceptTested: 'Design trade-off analysis and operating boundaries',
          expectedDemonstration: 'Identify the governing criteria weights and the trade-off envelope where the decision flips.',
          scaffoldingHints: [
            'Examine the relative strengths and weaknesses of both concepts.',
            'Consider constraints such as bandwidth, complexity, component cost, or power consumption.',
            'State which parameter would have to change (e.g. required speed or budget) for the alternative to win.',
          ],
        },
      } as any)
    }
  }

  // PAGE 4: Functional Requirements
  if (page.id === 4) {
    const tightestFr = project.requirements[0]
    if (tightestFr) {
      qs.push({
        id: crypto.randomUUID(),
        pageId: 4,
        type: 'Needs context',
        quote: tightestFr.statement,
        text: `For ${tightestFr.no} (Target: “${tightestFr.target || 'N/A'}”), how did you derive this specific target threshold rather than a looser margin, and how will your bench test setup isolate it from measurement noise?`,
        status: 'open',
        followups: 0,
        thread: [],
        lens: 'Traceability',
        category: 'evidence',
        rationale: {
          triggerQuote: tightestFr.statement,
          lens: 'Traceability',
          category: 'evidence',
          conceptTested: 'Requirement margin justification and instrument measurement limits',
          expectedDemonstration: 'Explain the technical basis for the target and the bench measurement protocol.',
          scaffoldingHints: [
            'Trace the target back to the user need or system specification.',
            'Consider instrument tolerance and loading effects when measuring this parameter.',
            'Explain what margin of error your measurement setup introduces.',
          ],
        },
      } as any)
    }
  }

  // PAGE 6: Design and Calculations
  if (page.id === 6) {
    const firstCalc = project.calculations[0]
    if (firstCalc) {
      qs.push({
        id: crypto.randomUUID(),
        pageId: 6,
        type: 'Possible error',
        quote: firstCalc.title,
        text: `In your calculation “${firstCalc.title}”, you derived “${firstCalc.result}”. Which assumption in your working would have the greatest effect on circuit operation if component parameters drifted by 10%?`,
        status: 'open',
        followups: 0,
        thread: [],
        lens: 'Mathematical Derivation',
        category: 'determinate',
        rationale: {
          triggerQuote: firstCalc.title,
          lens: 'Mathematical Derivation',
          category: 'determinate',
          conceptTested: 'Sensitivity to passive and active component variations',
          expectedDemonstration: 'Identify the governing parameter in the formula and calculate or explain drift impact.',
          scaffoldingHints: [
            'Inspect the variables in your working formula.',
            'Which component parameter (e.g. resistor tolerance, switch Ron, op-amp input offset) has the largest sensitivity factor?',
            'Substitute a 10% change into that parameter and state the resulting output change.',
          ],
        },
      } as any)
    }

    const firstBom = project.bom[0]
    if (firstBom) {
      qs.push({
        id: crypto.randomUUID(),
        pageId: 6,
        type: 'Open design choice',
        quote: firstBom.part,
        text: `You selected component “${firstBom.part}” (${firstBom.value || 'unspecified rating'}). How did you verify that its absolute maximum ratings and parasitics are compatible with your worst-case supply and signal levels?`,
        status: 'open',
        followups: 0,
        thread: [],
        lens: 'Mathematical Derivation',
        category: 'determinate',
        rationale: {
          triggerQuote: firstBom.part,
          lens: 'Mathematical Derivation',
          category: 'determinate',
          conceptTested: 'Datasheet absolute maximum ratings and electrical stress derating',
          expectedDemonstration: 'Cite datasheet voltage/current limits and compare with maximum circuit voltages.',
          scaffoldingHints: [
            'Look up the maximum pin voltages and power ratings in the datasheet.',
            'Compare those ratings against the worst-case voltages present in your schematic.',
            'State the safety derating margin your design maintains.',
          ],
        },
      } as any)
    }
  }

  // PAGE 9: Predicted vs Measured
  if (page.id === 9) {
    const valRow = project.validation[0]
    if (valRow) {
      qs.push({
        id: crypto.randomUUID(),
        pageId: 9,
        type: 'Missing evidence',
        quote: valRow.fr,
        text: `For ${valRow.fr}, you recorded predicted “${valRow.predicted}” vs measured “${valRow.measured}” (deviation: ${valRow.deviation || 'N/A'}). What physical non-idealities or parasitic elements account for this difference?`,
        status: 'open',
        followups: 0,
        thread: [],
        lens: 'Verification & Validation',
        category: 'evidence',
        rationale: {
          triggerQuote: valRow.fr,
          lens: 'Verification & Validation',
          category: 'evidence',
          conceptTested: 'Root-cause analysis of experimental discrepancies',
          expectedDemonstration: 'Explain discrepancy using parasitics (trace capacitance, resistance, loading).',
          scaffoldingHints: [
            'Consider breadboard or PCB parasitics, instrument input impedance, or thermal drift.',
            'Did the instrument load the circuit during measurement?',
            'Quantify how much of the deviation can be attributed to component tolerances.',
          ],
        },
      } as any)
    }
  }

  // PAGE 10: Failures and Fixes
  if (page.id === 10) {
    const debugRow = project.failures[0]
    if (debugRow) {
      qs.push({
        id: crypto.randomUUID(),
        pageId: 10,
        type: 'Open design choice',
        quote: debugRow.symptom,
        text: `In your debugging log for “${debugRow.symptom}”, you identified root cause: “${debugRow.cause}”. How did you experimentally distinguish this root cause from a mere symptom?`,
        status: 'open',
        followups: 0,
        thread: [],
        lens: 'Failure & Risk',
        category: 'evidence',
        rationale: {
          triggerQuote: debugRow.symptom,
          lens: 'Failure & Risk',
          category: 'evidence',
          conceptTested: 'Scientific debugging methodology and root-cause isolation',
          expectedDemonstration: 'Describe the differential diagnosis and isolation tests performed.',
          scaffoldingHints: [
            'Explain which test isolated the issue to this specific subsystem or component.',
            'What counter-hypothesis was ruled out during the debugging process?',
            'How did the re-measurement confirm that the root cause was eliminated?',
          ],
        },
      } as any)
    }
  }

  // Fallback default question if none generated
  if (qs.length === 0) {
    qs.push({
      id: crypto.randomUUID(),
      pageId: page.id,
      type: 'Open design choice',
      text: `Looking at your decisions on “${page.title}”, what is the single engineering choice you are least confident about, and what measurement or simulation would be required to validate it?`,
      status: 'open',
      followups: 0,
      thread: [],
      lens: 'Reflection & Learning',
      category: 'tradeoff',
      rationale: {
        lens: 'Reflection & Learning',
        category: 'tradeoff',
        conceptTested: 'Engineering self-reflection and risk management',
        expectedDemonstration: 'Articulate design trade-offs and suggest experimental verification.',
        scaffoldingHints: [
          'Identify where your design makes the strongest assumptions.',
          'Consider which parameter has the smallest safety margin.',
          'State what bench experiment would test that margin under stress.',
        ],
      },
    } as any)
  }

  return qs
}

/**
 * Sanitizes and validates questions returned by the Groq LLM:
 * 1. Checks that quotes exist in the student text/tables.
 * 2. Attaches default lens and rationale if missing.
 * 3. Strips unverified quotes rather than displaying hallucinations.
 */
export function processAndFilterGeneratedQuestions(
  rawQuestions: GeneratedQuestionItem[],
  page: PageDef,
  content: Content,
): MentorQuestion[] {
  return rawQuestions.map((q) => {
    // Validate quote against student content
    let validQuote = q.quote?.trim()
    if (validQuote && !verifyQuoteInContent(validQuote, content)) {
      // Quote was not found verbatim in student content; omit it to prevent hallucination!
      validQuote = undefined
    }

    const lens: EngineeringLens =
      (q.rationale?.lens as EngineeringLens) ||
      (q.type === 'Unsupported assumption' ? 'Mathematical Derivation' :
       q.type === 'Missing evidence' ? 'Verification & Validation' :
       q.type === 'Possible error' ? 'Failure & Risk' : 'Traceability')

    const category: QuestionCategory =
      (q.rationale?.category as QuestionCategory) ||
      (q.type === 'Unsupported assumption' ? 'determinate' :
       q.type === 'Missing evidence' ? 'evidence' : 'tradeoff')

    return {
      id: crypto.randomUUID(),
      pageId: page.id,
      type: q.type || 'Open design choice',
      quote: validQuote,
      text: q.text,
      status: 'open',
      followups: 0,
      thread: [],
      lens,
      category,
      rationale: q.rationale || {
        triggerQuote: validQuote,
        lens,
        category,
        conceptTested: `Engineering justification for ${page.title}`,
        expectedDemonstration: 'Quantified, technically sound justification citing formulas, datasheets, or lab tests.',
        scaffoldingHints: [
          'Consider the governing engineering principles for this topic.',
          'Identify the relevant formulas, constraints, or datasheet ratings.',
          'Substitute your design parameters and explain the working.',
        ],
      },
    } as any
  })
}
