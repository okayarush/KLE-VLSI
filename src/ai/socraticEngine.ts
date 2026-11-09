import type { EngineeringLens, QuestionCategory } from './types'

export interface SocraticGuidance {
  strategy: 'probe_missing' | 'challenge_error' | 'deepen_understanding' | 'request_evidence' | 'scaffold_concept'
  suggestedPromptDirective: string
}

/**
 * Determines the next Socratic pedagogical move based on the student's
 * current response quality, category, and historical mastery.
 */
export function determineSocraticMove(params: {
  category?: QuestionCategory
  lens?: EngineeringLens
  isPartiallyCorrect: boolean
  isIncorrect: boolean
  isStruggling: boolean
  turnsCount: number
}): SocraticGuidance {
  const { category, isPartiallyCorrect, isIncorrect, isStruggling, turnsCount } = params

  if (isIncorrect) {
    return {
      strategy: 'challenge_error',
      suggestedPromptDirective:
        'Point out the discrepancy with governing physical laws or datasheet limits respectfully. Ask how they reconcile their answer with first principles.',
    }
  }

  if (isStruggling || turnsCount >= 2) {
    return {
      strategy: 'scaffold_concept',
      suggestedPromptDirective:
        'Simplify the question. Offer a directional hint that connects input constraints to output targets. Ask them to explain the next small step.',
    }
  }

  if (isPartiallyCorrect) {
    return {
      strategy: 'probe_missing',
      suggestedPromptDirective:
        'Acknowledge what is correct in their explanation. Identify the exact missing variable, equation, or tolerance, and ask them to supply it.',
    }
  }

  if (category === 'evidence') {
    return {
      strategy: 'request_evidence',
      suggestedPromptDirective:
        'Ask how this claim was verified on the lab bench, under what instrument setup, and what measured data point supports it.',
    }
  }

  // Student is doing well -> deepen understanding with edge-case or sensitivity question
  return {
    strategy: 'deepen_understanding',
    suggestedPromptDirective:
      'The student understands the basic principle. Challenge them with an edge-case: component drift, thermal dissipation, noise floor, or supply voltage fluctuations.',
  }
}

