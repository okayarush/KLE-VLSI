import type { StructuredProject } from './types'

export type DecisionStatus =
  | 'correct_supported'        // Correct decision with clear calculation / datasheet evidence
  | 'valid_unjustified'       // Valid choice but lacking mathematical or empirical justification
  | 'incorrect'               // Defective or physically inconsistent design decision
  | 'cannot_verify'           // Lacks sufficient external context / datasheets to verify confidently

export interface EvaluatedDecision {
  subject: string
  pageId: number
  sectionId: string
  claim: string
  status: DecisionStatus
  rationale: string
  recommendedQuestion: string
}

/**
 * Builds an engineering understanding of the student's submission,
 * categorizing decisions into:
 * 1. Correct decision supported by evidence.
 * 2. Valid decision with insufficient justification.
 * 3. Incorrect engineering decision.
 * 4. Decision that cannot currently be verified.
 */
export function evaluateProjectDecisions(project: StructuredProject): EvaluatedDecision[] {
  const evaluated: EvaluatedDecision[] = []

  // 1. Evaluate Concept Choices (Page 3)
  for (const alt of project.conceptChoices?.alternatives ?? []) {
    if (alt.fate === 'Selected') {
      const hasNumbers = /\d/.test(alt.idea + (alt.pros ?? ''))
      if (!hasNumbers) {
        evaluated.push({
          subject: `Concept Choice: ${alt.name}`,
          pageId: 3,
          sectionId: 'alts',
          claim: alt.idea,
          status: 'valid_unjustified',
          rationale: 'Concept selected without quantitative metrics or comparison scores in the description.',
          recommendedQuestion: `What specific quantitative performance figures or constraints justified selecting "${alt.name}" over the rejected alternatives?`,
        })
      }
    }
  }

  // 2. Evaluate Design Calculations (Page 6)
  for (const cl of project.calculations ?? []) {
    const hasWorking = cl.working && cl.working.length > 20
    const hasResult = Boolean(cl.result && /\d/.test(cl.result))
    const hasAssumptions = Boolean(cl.assumptions && cl.assumptions.trim().length > 5)

    if (hasWorking && hasResult && hasAssumptions) {
      evaluated.push({
        subject: `Design Calculation: ${cl.title}`,
        pageId: 6,
        sectionId: 'calcs',
        claim: `${cl.working} => ${cl.result}`,
        status: 'correct_supported',
        rationale: 'Calculation card presents assumptions, mathematical derivation, and quantified result.',
        recommendedQuestion: `How would your derived result of "${cl.result}" change under worst-case component tolerances or temperature extremes?`,
      })
    } else if (hasResult && !hasWorking) {
      evaluated.push({
        subject: `Design Calculation: ${cl.title}`,
        pageId: 6,
        sectionId: 'calcs',
        claim: `Result: ${cl.result} without working`,
        status: 'valid_unjustified',
        rationale: 'Result is stated without first-principles mathematical working.',
        recommendedQuestion: `What governing equation or circuit law yielded "${cl.result}", and what intermediate values were substituted?`,
      })
    }
  }

  // 3. Evaluate BOM Components (Page 6)
  for (const b of project.bom ?? []) {
    const hasTrace = Boolean(b.trace && b.trace.trim().length > 5)
    if (!hasTrace) {
      evaluated.push({
        subject: `Component Selection: ${b.part}`,
        pageId: 6,
        sectionId: 'bom',
        claim: `Part "${b.part}" (${b.value || 'no value stated'})`,
        status: 'valid_unjustified',
        rationale: 'Component listed without a traceable link to an engineering calculation or design requirement.',
        recommendedQuestion: `Which specific functional requirement or sizing calculation established the rating and tolerance for "${b.part}"?`,
      })
    }
  }

  // 4. Evaluate Validation Claims (Page 9)
  for (const v of project.validation ?? []) {
    if (v.result === 'Pass' && (!v.measured || !/\d/.test(v.measured))) {
      evaluated.push({
        subject: `Validation Claim: ${v.fr}`,
        pageId: 9,
        sectionId: 'validation',
        claim: `Marked Pass without quantified bench measurement`,
        status: 'cannot_verify',
        rationale: 'Validation row claims Pass but contains no bench-measured data points.',
        recommendedQuestion: `Under what test conditions and instrument setup was this requirement verified, and what was the numerical measurement?`,
      })
    }
  }

  return evaluated
}

