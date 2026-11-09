import type { EvaluationState, SessionMemory } from './types'

export function createInitialMemory(): SessionMemory {
  return {
    conceptsMastered: [],
    identifiedMisconceptions: [],
    establishedFacts: {},
    questionHistory: [],
    notedContradictions: [],
    scaffoldingLevel: 0,
  }
}

/**
 * Updates session memory with results of a completed or updated question turn.
 */
export function updateSessionMemory(
  memory: SessionMemory | undefined,
  patch: {
    questionText?: string
    lens?: any
    status?: EvaluationState
    turnsCount?: number
    conceptMastered?: string
    misconception?: string
    establishedFact?: { key: string; val: string }
    contradiction?: string
  },
): SessionMemory {
  const m = memory ?? createInitialMemory()
  const next: SessionMemory = {
    ...m,
    conceptsMastered: [...m.conceptsMastered],
    identifiedMisconceptions: [...m.identifiedMisconceptions],
    establishedFacts: { ...m.establishedFacts },
    questionHistory: [...m.questionHistory],
    notedContradictions: [...m.notedContradictions],
    scaffoldingLevel: m.scaffoldingLevel,
  }

  if (patch.conceptMastered && !next.conceptsMastered.includes(patch.conceptMastered)) {
    next.conceptsMastered.push(patch.conceptMastered)
  }

  if (patch.misconception && !next.identifiedMisconceptions.includes(patch.misconception)) {
    next.identifiedMisconceptions.push(patch.misconception)
  }

  if (patch.establishedFact) {
    next.establishedFacts[patch.establishedFact.key] = patch.establishedFact.val
  }

  if (patch.contradiction && !next.notedContradictions.includes(patch.contradiction)) {
    next.notedContradictions.push(patch.contradiction)
  }

  if (patch.questionText && patch.status) {
    const existing = next.questionHistory.find((q) => q.questionText === patch.questionText)
    if (existing) {
      existing.status = patch.status
      if (patch.turnsCount !== undefined) existing.turnsCount = patch.turnsCount
    } else {
      next.questionHistory.push({
        questionText: patch.questionText,
        lens: patch.lens,
        status: patch.status,
        turnsCount: patch.turnsCount ?? 1,
      })
    }
  }

  return next
}

/**
 * Formats a compact, token-efficient summary of the session memory for prompt injection.
 */
export function formatMemoryForPrompt(memory?: SessionMemory): string {
  if (!memory) return 'No prior viva interactions in this session.'

  const parts: string[] = []

  if (Object.keys(memory.establishedFacts).length > 0) {
    const facts = Object.entries(memory.establishedFacts)
      .map(([k, v]) => `${k}: ${v}`)
      .join('; ')
    parts.push(`Facts established by student: ${facts}`)
  }

  if (memory.conceptsMastered.length > 0) {
    parts.push(`Concepts successfully demonstrated: ${memory.conceptsMastered.join(', ')}`)
  }

  if (memory.identifiedMisconceptions.length > 0) {
    parts.push(`Previous misconceptions/weaknesses: ${memory.identifiedMisconceptions.join(', ')}`)
  }

  if (memory.notedContradictions.length > 0) {
    parts.push(`Unreconciled contradictions: ${memory.notedContradictions.join('; ')}`)
  }

  if (memory.questionHistory.length > 0) {
    const history = memory.questionHistory
      .map((q) => `• [${q.status}] "${q.questionText.slice(0, 70)}…"`)
      .join('\n')
    parts.push(`Prior questions in this session:\n${history}`)
  }

  return parts.join('\n\n') || 'No prior viva interactions in this session.'
}

/**
 * Checks whether a new student claim contradicts previously established facts in memory.
 */
export function checkContradictionWithMemory(
  text: string,
  memory?: SessionMemory,
): string | null {
  if (!memory || Object.keys(memory.establishedFacts).length === 0) return null
  const t = text.toLowerCase()

  // E.g. If student previously established supply is +/-5V, but now claims 12V
  if (memory.establishedFacts['supply_rail']) {
    const prevSupply = memory.establishedFacts['supply_rail']
    if (/\b12\s*v\b/i.test(t) && !/\b12\s*v\b/i.test(prevSupply)) {
      return `Student claimed 12V supply, but previously established the circuit operates from ${prevSupply}.`
    }
  }

  // E.g. If student previously established non-inverting topology, but now claims inverting
  if (memory.establishedFacts['topology']) {
    const prevTopo = memory.establishedFacts['topology']
    if (t.includes('inverting amplifier') && !t.includes('non-inverting') && prevTopo.includes('non-inverting')) {
      return `Student mentioned inverting configuration, contradicting earlier established ${prevTopo}.`
    }
  }

  return null
}

