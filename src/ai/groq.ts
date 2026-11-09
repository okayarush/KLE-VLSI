import type { PageDef } from '../data/pages'
import type { Content } from '../lib/progress'
import type { MentorQuestion } from '../state/store'
import {
  MENTOR_SYSTEM_PROMPT,
  buildPortfolioAnalysisPrompt,
  buildQuestionGenPrompt,
  buildVivaEvaluationPrompt,
} from './prompts'
import {
  analysePortfolio,
  type Analysis,
} from './engine'
import {
  buildStructuredProject,
  createProjectDigest,
  getTargetedPageContext,
} from './projectContext'
import { analyzeCrossPageConsistency } from './crossPageAnalyzer'
import {
  generateSmartFallbackQuestions,
  processAndFilterGeneratedQuestions,
} from './questionEngine'
import {
  evaluateAnswerOffline,
  validateAndNormalizeVerdict,
} from './answerEvaluator'
import { getProgressiveHint, type ProgressiveHint } from './scaffoldingEngine'
import type {
  EvaluationState,
  SessionMemory,
} from './types'

export interface AiStatus {
  configured: boolean
  model: string
  provider: string
}

let cachedStatus: AiStatus | null = null

export async function getAiStatus(): Promise<AiStatus> {
  if (cachedStatus) return cachedStatus
  try {
    const res = await fetch('/api/ai/health')
    if (res.ok) {
      cachedStatus = await res.json()
      return cachedStatus!
    }
  } catch {
    // server unreachable / dev mode fallback
  }
  return {
    configured: false,
    model: 'llama-3.3-70b-versatile (offline)',
    provider: 'Groq Cloud',
  }
}

/** Formats a page's prose, rows, and evidence for model grounding. */
function summarizePage(p: PageDef, c: Content): string {
  const parts: string[] = []
  for (const sec of p.sections) {
    const k = `${p.id}.${sec.id}`
    if (sec.type === 'prose') {
      const text = c?.prose?.[k]
      if (text && text.trim()) {
        parts.push(`Section "${sec.title}" (prose):\n${text.trim()}`)
      }
    } else if (sec.type === 'rows') {
      const rows = c?.rows?.[k] ?? []
      if (rows.length > 0) {
        const rowStr = rows
          .map((r, i) => `  [${i + 1}] ${JSON.stringify(r.v)}`)
          .join('\n')
        parts.push(`Section "${sec.title}" (${sec.itemLabel}s):\n${rowStr}`)
      }
    }
  }

  const ev = (c?.evidence ?? []).filter((e) => e.pageId === p.id)
  if (ev.length > 0) {
    const evStr = ev
      .map((e) => `  - Figure/File: "${e.name}", Caption: "${e.caption}"`)
      .join('\n')
    parts.push(`Attached Evidence:\n${evStr}`)
  }

  return parts.join('\n\n')
}

/**
 * Generates context-aware, grounded viva questions across the Seven Engineering Lenses.
 * Validates quotes against actual student submission before presenting.
 */
export async function generateGroqQuestions(
  page: PageDef,
  content: Content,
  themeName?: string,
): Promise<MentorQuestion[] | 'insufficient'> {
  const structuredProject = buildStructuredProject(content, { themeName })
  const projectDigest = createProjectDigest(structuredProject)
  const targetedContext = getTargetedPageContext(page, content, structuredProject)

  if (!targetedContext || targetedContext.trim().length < 40) {
    return 'insufficient'
  }

  try {
    const res = await fetch('/api/ai/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt: MENTOR_SYSTEM_PROMPT,
        userPrompt: buildQuestionGenPrompt({
          pageId: page.id,
          pageTitle: page.title,
          pageContext: targetedContext,
          projectDigest,
          themeName,
        }),
      }),
    })

    if (!res.ok) {
      console.warn('Groq API error, falling back to smart engineering heuristics')
      return generateSmartFallbackQuestions(page, content, structuredProject)
    }

    const data = await res.json()
    if (data.insufficient) {
      return 'insufficient'
    }

    if (Array.isArray(data.questions) && data.questions.length > 0) {
      return processAndFilterGeneratedQuestions(data.questions, page, content)
    }
  } catch (err) {
    console.warn('Could not reach Groq AI endpoint:', err)
  }

  return generateSmartFallbackQuestions(page, content, structuredProject)
}

export interface EvaluateResult {
  verdict: 'resolved' | 'followup' | 'gap'
  evalState: EvaluationState
  reply: string
  justificationEvaluation?: string
  isDeterminateError?: boolean
  suggestedHint?: string
  memoryPatch?: Partial<SessionMemory>
}

/**
 * Evaluates student viva response with Groq Llama 3.3 70B across the 6 evaluation states.
 * Safely falls back to honest offline evaluation without false resolutions.
 */
export async function evaluateGroqReply(params: {
  page: PageDef
  currentQuestion: MentorQuestion
  studentReply: string
  followupsCount: number
  content?: Content
  sessionMemory?: SessionMemory
}): Promise<EvaluateResult> {
  const content = params.content ?? { prose: {}, rows: {}, evidence: [] }
  const project = buildStructuredProject(content)
  const projectDigest = createProjectDigest(project)

  try {
    const res = await fetch('/api/ai/viva', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt: MENTOR_SYSTEM_PROMPT,
        userPrompt: buildVivaEvaluationPrompt({
          pageId: params.page.id,
          pageTitle: params.page.title,
          questionText: params.currentQuestion.text,
          quote: params.currentQuestion.quote,
          rationale: (params.currentQuestion as any).rationale,
          conversationHistory: params.currentQuestion.thread,
          studentReply: params.studentReply,
          followupsCount: params.followupsCount,
          projectDigest,
          sessionMemory: params.sessionMemory,
        }),
      }),
    })

    if (res.ok) {
      const data = await res.json()
      const normalized = validateAndNormalizeVerdict(data, params.studentReply)

      // Map to legacy verdict for existing UI / summary tabs
      let legacyVerdict: 'resolved' | 'followup' | 'gap' = 'followup'
      if (normalized.verdict === 'resolved') {
        legacyVerdict = 'resolved'
      } else if (normalized.verdict === 'unresolved') {
        legacyVerdict = 'gap'
      } else {
        legacyVerdict = 'followup'
      }

      return {
        verdict: legacyVerdict,
        evalState: normalized.verdict,
        reply: normalized.reply,
        justificationEvaluation: normalized.justificationEvaluation,
        isDeterminateError: normalized.isDeterminateError,
        suggestedHint: normalized.suggestedHint,
        memoryPatch: normalized.memoryPatch,
      }
    }
  } catch (err) {
    console.warn('Groq viva call failed, using honest offline evaluation:', err)
  }

  // Honest offline fallback evaluation (never falsely resolves!)
  const offlineResult = evaluateAnswerOffline(
    params.studentReply,
    params.currentQuestion,
    params.followupsCount,
    params.sessionMemory,
  )

  let legacyVerdict: 'resolved' | 'followup' | 'gap' = 'followup'
  if (offlineResult.verdict === 'resolved') {
    legacyVerdict = 'resolved'
  } else if (offlineResult.verdict === 'unresolved') {
    legacyVerdict = 'gap'
  } else {
    legacyVerdict = 'followup'
  }

  return {
    verdict: legacyVerdict,
    evalState: offlineResult.verdict,
    reply: offlineResult.reply,
    justificationEvaluation: offlineResult.justificationEvaluation,
    isDeterminateError: offlineResult.isDeterminateError,
    suggestedHint: offlineResult.suggestedHint,
    memoryPatch: offlineResult.memoryPatch,
  }
}

/**
 * Requests the next progressive pedagogical hint for a question.
 */
export function requestVivaHint(
  question: MentorQuestion,
  currentLevel: number,
): ProgressiveHint {
  return getProgressiveHint(question, currentLevel)
}

/** Analyzes the entire review portfolio with Groq Llama 3.3 70B & cross-page analysis. */
export async function analyzeGroqPortfolio(
  content: Content,
  livePages: PageDef[],
  reviewId: string,
  themeName?: string,
): Promise<Analysis> {
  const fallback = analysePortfolio(
    content,
    livePages.map((p) => p.id),
  )

  const structuredProject = buildStructuredProject(content, { themeName })
  const crossPageFindings = analyzeCrossPageConsistency(structuredProject)
  const projectDigest = createProjectDigest(structuredProject)
  projectDigest.crossPageFindings = crossPageFindings

  try {
    const pagesSummary = livePages
      .map((p) => `### Page ${p.id}: ${p.title}\n${summarizePage(p, content) || '(No content entered yet)'}`)
      .join('\n\n---\n\n')

    const res = await fetch('/api/ai/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt: MENTOR_SYSTEM_PROMPT,
        userPrompt: buildPortfolioAnalysisPrompt({
          reviewId,
          themeName,
          projectDigest,
          pagesSummary,
        }),
      }),
    })

    if (res.ok) {
      const data = await res.json()
      if (data.overall && Array.isArray(data.overall)) {
        return {
          overall: data.overall.length > 0 ? data.overall : fallback.overall,
          byPage: fallback.byPage,
          counts: fallback.counts,
          inconsistencies: Array.isArray(data.inconsistencies) && data.inconsistencies.length > 0
            ? data.inconsistencies
            : fallback.inconsistencies,
          missingEvidence: Array.isArray(data.missingEvidence) && data.missingEvidence.length > 0
            ? data.missingEvidence
            : fallback.missingEvidence,
          improvements: Array.isArray(data.improvements) && data.improvements.length > 0
            ? data.improvements
            : fallback.improvements,
        }
      }
    }
  } catch (err) {
    console.warn('Groq portfolio analysis failed, using local heuristics:', err)
  }

  return fallback
}
