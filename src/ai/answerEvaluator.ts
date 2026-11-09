import type { MentorQuestion } from '../state/store'
import { checkDeterministicCalculation } from './engineeringKnowledge'
import { checkContradictionWithMemory } from './sessionMemory'
import { analyzeTechnicalClaims } from './technicalClaims'
import type { EvaluationState, SessionMemory, VivaTurnVerdict } from './types'

// Regex patterns to detect evasions, non-answers, and refusal
const EVASION_PATTERNS = [
  /^(idk|i\s*don'?t\s*know|dont\s*know|no\s*idea|dunno|not\s*sure|skip|pass|who\s*knows|have\s*no\s*idea|clueless|no\s*clue)\b/i,
  /^(i\s*am\s*not\s*sure|can'?t\s*answer|nothing|none|no|na|n\/a)\b/i,
]

// Common filler/fluff phrases that don't add technical substance
const FILLER_ONLY = /^(it\s*is\s*good|because\s*it\s*works|we\s*just\s*chose\s*it|faculty\s*told\s*us|found\s*it\s*online|it\s*is\s*standard)\.?$/i

/**
 * Checks if a student reply is a non-answer (evasion, refusal, gibberish, or empty).
 */
export function isNonAnswer(text: string): boolean {
  if (!text || !text.trim()) return true
  const trimmed = text.trim()

  // Too short to be an engineering answer (less than 4 characters unless a pure number)
  if (trimmed.length < 3 && !/\d/.test(trimmed)) return true

  // Direct match against evasion phrases
  for (const pattern of EVASION_PATTERNS) {
    if (pattern.test(trimmed)) return true
  }

  // Pure filler
  if (FILLER_ONLY.test(trimmed)) return true

  // Repetitive character or pattern keyboard mash (e.g. "aaaaaa", "asdasdasd", "hahaha")
  if (/^(.)\1{4,}$/.test(trimmed)) return true
  if (/^([a-z]{1,4})\1{2,}$/i.test(trimmed)) return true
  if (!/[aeiouy]/i.test(trimmed) && trimmed.length > 4) return true

  return false
}

/**
 * Evaluates student answers in offline / simulated fallback mode.
 * 
 * CRITICAL RULE: Offline mode NEVER falsely awards 'resolved'.
 * It provides honest structural feedback, detects non-answers, runs deterministic
 * math checks, verifies technical claims, and preserves question state as open.
 */
export function evaluateAnswerOffline(
  text: string,
  question: MentorQuestion,
  _followupsCount: number,
  sessionMemory?: SessionMemory,
): VivaTurnVerdict {
  const trimmed = text.trim()

  // 1. Evasion / Non-Answer Check
  if (isNonAnswer(trimmed)) {
    return {
      verdict: 'non_answer',
      reply: 'That does not address the question. In an engineering viva, say what you know or describe the first principle you would use to find the answer.',
      justificationEvaluation: 'Student offered a non-answer, evasion, or refusal.',
      suggestedHint: 'Consider what physical principle connects the parameters in this question.',
    }
  }

  // 2. Memory Contradiction Check
  const memoryConflict = checkContradictionWithMemory(trimmed, sessionMemory)
  if (memoryConflict) {
    return {
      verdict: 'incorrect',
      reply: `Notice the inconsistency: ${memoryConflict} How do you reconcile these two conflicting claims?`,
      justificationEvaluation: 'Student contradicted a fact established earlier in this viva session.',
      isDeterminateError: true,
    }
  }

  // 3. Deterministic Engineering Calculation Check
  const calcCheck = checkDeterministicCalculation(trimmed, {
    pageId: question.pageId,
    questionText: question.text,
  })

  if (calcCheck.supported) {
    if (!calcCheck.isMathematicallyValid) {
      return {
        verdict: 'incorrect',
        reply: `${calcCheck.explanation} Re-check your algebraic working and units.`,
        justificationEvaluation: `Determinate calculation error in ${calcCheck.domain}. Discrepancy: ${calcCheck.discrepancyPercent?.toFixed(1)}%.`,
        isDeterminateError: true,
        calculationCheck: {
          isCorrect: false,
          discrepancyNote: calcCheck.explanation,
          expectedValue: calcCheck.expectedValue,
          studentValue: calcCheck.studentCalculatedValue,
        },
      }
    } else {
      // Mathematically valid calculation demonstrated!
      return {
        verdict: 'resolved',
        reply: `Your calculation (${calcCheck.studentCalculatedValue}) is mathematically correct (${calcCheck.explanation}). Make sure this derivation appears in your page documentation.`,
        justificationEvaluation: `Valid deterministic calculation verified in ${calcCheck.domain}.`,
        isDeterminateError: false,
        calculationCheck: {
          isCorrect: true,
          expectedValue: calcCheck.expectedValue,
          studentValue: calcCheck.studentCalculatedValue,
        },
      }
    }
  }

  // 4. Technical Claims & Evidence Verification Check
  const claimAnalysis = analyzeTechnicalClaims(trimmed, {
    pageId: question.pageId,
    questionText: question.text,
  })

  if (!claimAnalysis.isAcceptable) {
    if (claimAnalysis.hasCategoryError || claimAnalysis.hasDimensionalMismatch) {
      return {
        verdict: 'incorrect',
        reply: claimAnalysis.feedbackReply,
        justificationEvaluation: `Determinate technical error: ${claimAnalysis.justificationEvaluation}`,
        isDeterminateError: true,
        suggestedHint: 'Check whether the compared parts belong to the same physical category and share compatible units.',
      }
    }

    if (claimAnalysis.hasImplausibleValue) {
      return {
        verdict: 'incorrect',
        reply: claimAnalysis.feedbackReply,
        justificationEvaluation: `Physically implausible claim: ${claimAnalysis.justificationEvaluation}`,
        isDeterminateError: true,
        suggestedHint: 'Check standard reference conditions and physical bounds for this parameter.',
      }
    }

    if (claimAnalysis.hasUnverifiedDatasheetClaim || claimAnalysis.verdict === 'unverified') {
      return {
        verdict: 'needs_verification',
        reply: claimAnalysis.feedbackReply,
        justificationEvaluation: `Unverified technical claim: ${claimAnalysis.justificationEvaluation}`,
        isDeterminateError: false,
        suggestedHint: 'Specify the exact manufacturer, component part number, and datasheet test conditions.',
      }
    }
  }

  // 5. Structural / Qualitative Heuristics
  const wordCount = trimmed.split(/\s+/).length
  const hasNumbers = /\d/.test(trimmed)
  const hasUnits = /(?:\d\s*(?:v|mv|uv|a|ma|ua|hz|khz|mhz|ghz|ohm|kohm|kω|ω|w|mw|%|db|v\/v)|(?:volts?|amps?|amperes?|ohms?|hertz|watts?))\b/i.test(trimmed)
  const hasKeywords = /\b(datasheet|measured|calculated|tolerance|bandwidth|gain|derivation|trade-off|criterion|schematic)\b/i.test(trimmed)

  if (wordCount < 10) {
    return {
      verdict: 'needs_clarification',
      reply: 'Your answer is very brief. What specific values, units, or governing equations support this?',
      justificationEvaluation: 'Answer is too concise to demonstrate technical justification.',
      suggestedHint: 'State the numbers, units, and the governing formula.',
    }
  }

  // Purely qualitative description without numerical basis
  if (!hasNumbers || (!hasUnits && !hasKeywords)) {
    return {
      verdict: 'needs_clarification',
      reply: 'You have given a qualitative description. In engineering, choices must be quantified. What numbers, tolerances, or datasheet limits support this decision?',
      justificationEvaluation: 'Answer lacks quantitative metrics and engineering terminology.',
      suggestedHint: 'Quote specific numerical values and manufacturer ratings.',
    }
  }

  // If detailed with numbers and units, acknowledge requirement for independent verification
  return {
    verdict: 'needs_verification',
    reply: 'You have provided quantified parameters. In offline preparation mode, ensure the exact manufacturer datasheet, part number, and bench measurement records are attached to your portfolio for faculty verification.',
    justificationEvaluation: 'Quantified explanation provided; offline mode requires external faculty/datasheet verification.',
    suggestedHint: 'Cite the exact component model and testbench conditions.',
  }
}

/**
 * Validates and normalizes the parsed verdict from the Groq LLM API.
 * Ensures the response strictly adheres to the 6 evaluation states and prevents
 * malformed or unauthorized model outputs.
 */
export function validateAndNormalizeVerdict(raw: any, studentText: string): VivaTurnVerdict {
  // Defensive check 1: if the student provided a non-answer, override any incorrect model verdict
  if (isNonAnswer(studentText)) {
    return {
      verdict: 'non_answer',
      reply: 'That does not address the question. In an engineering viva, say what you know or describe the first principle you would use to find the answer.',
      justificationEvaluation: 'Filtered non-answer (evasion/refusal) before trusting model verdict.',
    }
  }

  // Defensive check 2: Check deterministic calculation locally to verify model's math
  const calcCheck = checkDeterministicCalculation(studentText)
  if (calcCheck.supported && !calcCheck.isMathematicallyValid) {
    return {
      verdict: 'incorrect',
      reply: `${calcCheck.explanation} Re-check your algebraic working.`,
      justificationEvaluation: `Local deterministic engine detected calculation error in ${calcCheck.domain}.`,
      isDeterminateError: true,
      calculationCheck: {
        isCorrect: false,
        discrepancyNote: calcCheck.explanation,
        expectedValue: calcCheck.expectedValue,
        studentValue: calcCheck.studentCalculatedValue,
      },
    }
  }

  // Defensive check 3: Technical Claims & Plausibility Gate
  const claimAnalysis = analyzeTechnicalClaims(studentText)
  if (!claimAnalysis.isAcceptable) {
    if (claimAnalysis.hasCategoryError || claimAnalysis.hasDimensionalMismatch || claimAnalysis.hasImplausibleValue) {
      return {
        verdict: 'incorrect',
        reply: claimAnalysis.feedbackReply,
        justificationEvaluation: `Technical claim verification failed: ${claimAnalysis.justificationEvaluation}`,
        isDeterminateError: true,
        suggestedHint: 'Ensure that the compared components share the same physical function and valid units.',
      }
    }

    if (claimAnalysis.hasUnverifiedDatasheetClaim && raw?.verdict === 'resolved') {
      return {
        verdict: 'needs_verification',
        reply: claimAnalysis.feedbackReply,
        justificationEvaluation: `Unverified claim cannot be resolved without exact component and datasheet references: ${claimAnalysis.justificationEvaluation}`,
        isDeterminateError: false,
        suggestedHint: 'Provide the manufacturer, part number, and datasheet test conditions.',
      }
    }
  }

  const validVerdicts: EvaluationState[] = [
    'resolved',
    'needs_clarification',
    'incorrect',
    'non_answer',
    'needs_verification',
    'unresolved',
  ]

  let verdict: EvaluationState = 'needs_clarification'
  if (validVerdicts.includes(raw?.verdict)) {
    verdict = raw.verdict
  } else if (raw?.verdict === 'followup') {
    verdict = 'needs_clarification'
  } else if (raw?.verdict === 'gap') {
    verdict = 'unresolved'
  }

  const reply = typeof raw?.reply === 'string' && raw.reply.trim()
    ? raw.reply.trim()
    : 'Could you clarify the specific engineering basis and calculations for this decision?'

  const justificationEvaluation = typeof raw?.justificationEvaluation === 'string'
    ? raw.justificationEvaluation.trim()
    : 'Evaluation performed by AI Mentor.'

  return {
    verdict,
    reply,
    justificationEvaluation,
    isDeterminateError: Boolean(raw?.isDeterminateError),
    identifiedGap: raw?.identifiedGap,
    suggestedHint: raw?.suggestedHint,
    memoryPatch: raw?.memoryPatch,
  }
}
