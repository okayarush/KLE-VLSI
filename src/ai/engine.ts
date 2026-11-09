/**
 * MOCK AI ENGINE — Phase 6 (UI only). No model is called anywhere in this app.
 *
 * Everything here is deterministic client-side heuristics standing in for the real AI so the
 * interfaces can be designed against realistic states. When real AI lands, replace the exports of
 * this file; components depend only on the types below.
 *
 * Hard rules honoured here (DESIGN_GUIDELINES §6, student brief §3):
 *  - AI never produces marks, scores, grades or "approved" language.
 *  - AI never edits the portfolio; it only describes and asks.
 */
import { PAGES, pageLabel, type PageDef, type RowsSection } from '../data/pages'
import { pageProgress, skey, words, type Content } from '../lib/progress'
import type { IssueType, MentorQuestion } from '../state/store'

export interface Insight {
  id: string
  pageId: number
  sectionId?: string
  sectionTitle?: string
  type: IssueType
  title: string
  detail: string
  quote?: string
  question?: string
}

const HEDGE = /\b(assum\w*|approximately|probably|roughly|should be|likely|maybe|about)\b/i
const JUSTIFY = /\b(because|since|datasheet|measured|calculated|therefore|per the|as per)\b/i
const norm = (s = '') => s.trim().toUpperCase().replace(/\s+/g, '')
const sentences = (t: string) => t.split(/(?<=[.!?])\s+/).filter(Boolean)
const clip = (s: string, n = 120) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s)

function frSet(c: Content): Set<string> {
  return new Set((c.rows['4.frtable'] ?? []).map((r) => norm(r.v.no)).filter(Boolean))
}

/** Rows fields that cite an FR on other pages: [pageId, sectionId, fieldId]. */
const FR_REFS: [number, string, string][] = [[5, 'blocks', 'fr'], [6, 'calcs', 'fr'], [7, 'map', 'fr'], [7, 'cards', 'fr'], [9, 'validation', 'fr']]

export function insightsForPage(p: PageDef, c: Content): Insight[] {
  const out: Insight[] = []
  const evHere = (sid: string) => c.evidence.some((e) => e.pageId === p.id && e.sectionId === sid)
  const add = (i: Omit<Insight, 'id' | 'pageId'> & { rule: string }) =>
    out.push({ id: `${p.id}.${i.sectionId ?? 'page'}.${i.rule}`, pageId: p.id, ...i })

  for (const sec of p.sections) {
    const k = skey(p.id, sec.id)
    const base = { sectionId: sec.id, sectionTitle: sec.title }

    if (sec.type === 'evidence') {
      if (!evHere(sec.id)) add({ ...base, rule: 'empty', type: 'Missing evidence', title: `${sec.title}: nothing attached yet`, detail: sec.hint, question: `What would a reviewer need to see in “${sec.title}” to follow your reasoning without asking you?` })
      continue
    }

    if (sec.type === 'prose') {
      const text = c.prose[k] ?? ''
      const w = words(text)
      if (w === 0) { add({ ...base, rule: 'empty', type: 'Incomplete', title: `${sec.title}: not started`, detail: sec.prompt }); continue }
      if (w < (sec.minWords ?? 20)) add({ ...base, rule: 'thin', type: 'Needs context', title: `${sec.title}: explanation is still thin`, detail: `${w} words so far. Say why, not only what — a reviewer should be able to follow the reasoning.`, question: 'What is the one step in this reasoning that a reader could most easily doubt?' })
      if (sec.quantitative && !/\d/.test(text)) add({ ...base, rule: 'nonum', type: 'Unsupported assumption', title: `${sec.title}: no numbers or units`, detail: 'Engineering justification is usually quantified. Which quantities drove this, and in what units?', question: 'Which measured or calculated value most strongly supports this?' })
      const hedged = sentences(text).find((s) => HEDGE.test(s) && !JUSTIFY.test(s))
      if (hedged) add({ ...base, rule: 'hedge', type: 'Unsupported assumption', title: 'Assumption without a stated basis', detail: 'This sentence relies on an assumption or estimate. What is it based on, and how could you check it?', quote: clip(hedged), question: 'Can this be measured or looked up instead of assumed?' })
      if (sec.wantsEvidence && !evHere(sec.id)) add({ ...base, rule: 'noev', type: 'Missing evidence', title: `${sec.title}: no supporting evidence attached`, detail: 'Attach a figure, capture or document beside this section, with a caption.' })
      continue
    }

    const rows = c.rows[k] ?? []
    const need = sec.minRows ?? 1
    if (rows.length === 0 && need > 0) { add({ ...base, rule: 'empty', type: 'Incomplete', title: `${sec.title}: no ${sec.itemLabel.toLowerCase()}s yet`, detail: sec.prompt }); continue }
    if (rows.length > 0 && rows.length < need) add({ ...base, rule: 'few', type: 'Incomplete', title: `${sec.title}: ${rows.length} of ${need} expected`, detail: `The handbook expects at least ${need}. Add the rest, including options you rejected.` })
    const req = (sec as RowsSection).fields.filter((f) => f.required)
    const bad = rows.map((r, i) => ({ r, i })).filter(({ r }) => req.some((f) => !(r.v[f.id] ?? '').trim()))
    if (bad.length) {
      const { r, i } = bad[0]
      const missing = req.filter((f) => !(r.v[f.id] ?? '').trim()).map((f) => f.label)
      add({ ...base, rule: 'rowinc', type: 'Incomplete', title: `${sec.itemLabel} ${i + 1}${bad.length > 1 ? ` (and ${bad.length - 1} more)` : ''} is missing details`, detail: `Missing: ${missing.join(', ')}.` })
    }
    if (sec.wantsEvidence && rows.length > 0 && !evHere(sec.id)) add({ ...base, rule: 'noev', type: 'Missing evidence', title: `${sec.title}: no supporting evidence attached`, detail: 'Place a capture, sketch or file beside these entries, with a caption.' })
  }

  // Page-specific checks
  if (p.id === 2) {
    const assumed = (c.rows['2.inputs'] ?? []).filter((r) => r.v.provenance === 'assumed')
    if (assumed[0]) add({ sectionId: 'inputs', sectionTitle: 'Quantified design inputs', rule: 'assumed', type: 'Unsupported assumption', title: `“${assumed[0].v.parameter}” is an assumed input`, detail: 'Assumed inputs weaken everything calculated from them. What would it take to measure or look this up?', question: `How would your design change if “${assumed[0].v.parameter}” were 10× different from your assumption?` })
    const vague = (c.rows['2.candfr'] ?? []).find((r) => r.v.statement?.trim() && !(r.v.target ?? '').trim())
    if (vague) add({ sectionId: 'candfr', sectionTitle: 'Three candidate functional requirements', rule: 'vague', type: 'Needs context', title: 'A candidate FR has no target yet', detail: 'A functional requirement should be quantified so it can be tested.', quote: clip(vague.v.statement), question: 'What number, in what unit, would tell you this requirement is met?' })
  }
  if (p.id === 4) {
    const bad = (c.rows['4.frtable'] ?? []).find((r) => r.v.status === 'Deferred with reason' && !(r.v.reason ?? '').trim())
    if (bad) add({ sectionId: 'frtable', sectionTitle: 'Functional Requirements Table', rule: 'deferred', type: 'Incomplete', title: `${bad.v.no || 'An FR'} is deferred without a reason`, detail: 'The handbook treats a deferred requirement without a reason as missing.' })
  }

  // Cross-page consistency
  const frs = frSet(c)
  if (frs.size) {
    for (const [pg, sid, fid] of FR_REFS.filter(([pg]) => pg === p.id)) {
      const unknown = (c.rows[skey(pg, sid)] ?? []).map((r) => r.v[fid]).filter((v) => v?.trim() && !frs.has(norm(v)))
      if (unknown[0]) add({ sectionId: sid, sectionTitle: PAGES[pg].sections.find((s) => s.id === sid)?.title, rule: 'frref', type: 'Possible error', title: `References ${unknown[0].trim()}, which is not in the FR table`, detail: 'Every block, calculation and result should trace to a requirement in Page 4. Either the FR is missing or the reference has a typo.' })
    }
    if (p.id === 9) {
      const done = new Set((c.rows['9.validation'] ?? []).map((r) => norm(r.v.fr)))
      const missing = [...frs].filter((f) => !done.has(f))
      if (done.size && missing.length) add({ sectionId: 'validation', sectionTitle: 'Validation sheet', rule: 'allfr', type: 'Incomplete', title: `${missing.length} FR${missing.length > 1 ? 's have' : ' has'} no validation row`, detail: `Missing: ${missing.slice(0, 5).join(', ')}. The handbook asks for predicted vs measured for every requirement.` })
    }
  }
  return out
}

export interface Analysis {
  overall: Insight[]
  byPage: { page: PageDef; pct: number; insights: Insight[] }[]
  counts: Record<IssueType, number>
  inconsistencies: Insight[]
  missingEvidence: Insight[]
  improvements: string[]
}

export function analysePortfolio(c: Content, onlyLive: number[]): Analysis {
  const byPage = PAGES.filter((p) => onlyLive.includes(p.id)).map((page) => ({ page, pct: pageProgress(page, c).pct, insights: insightsForPage(page, c) }))
  const all = byPage.flatMap((b) => b.insights)
  const counts = { 'Unsupported assumption': 0, 'Possible error': 0, 'Open design choice': 0, 'Needs context': 0, Incomplete: 0, 'Missing evidence': 0 } as Record<IssueType, number>
  all.forEach((i) => counts[i.type]++)
  const weakest = [...byPage].sort((a, b) => a.pct - b.pct).slice(0, 2).map((b) => pageLabel(b.page))
  return {
    overall: all.filter((i) => i.type === 'Possible error' || i.type === 'Unsupported assumption').slice(0, 4),
    byPage,
    counts,
    inconsistencies: all.filter((i) => i.type === 'Possible error'),
    missingEvidence: all.filter((i) => i.type === 'Missing evidence'),
    improvements: [
      weakest.length ? `Spend your next session on ${weakest.join(' and ')} — they have the least written.` : 'Keep adding dated notebook entries as you work.',
      'Turn each assumed design input into a measured or datasheet value where you can.',
      'Place a captioned figure beside every calculation or test result.',
    ],
  }
}

/* ---------------- AI Mentor ---------------- */

const BANK: Record<number, { type: IssueType; text: string }[]> = {
  2: [{ type: 'Open design choice', text: 'Why is the lowest input level in your design inputs the limiting case — what happens at the other end of the range?' }],
  3: [{ type: 'Open design choice', text: 'Which criterion in your comparison would change the winner if its weight doubled?' }],
  4: [{ type: 'Needs context', text: 'Pick your tightest requirement. How did you decide that target rather than a looser one?' }],
  5: [{ type: 'Open design choice', text: 'If one block failed completely, which requirement breaks first, and how would you know?' }],
  6: [{ type: 'Possible error', text: 'Walk me through one calculation: which assumption would most change the result if it were wrong?' }],
  9: [{ type: 'Needs context', text: 'For the requirement with the largest deviation, what is your explanation, and how would you test it?' }],
  10: [{ type: 'Open design choice', text: 'In your most recent failure, how do you know the root cause is the cause, not a symptom?' }],
}

export function mentorQuestionsFor(p: PageDef, c: Content): MentorQuestion[] | 'insufficient' {
  if (pageProgress(p, c).pct < 15) return 'insufficient'
  const fromInsights = insightsForPage(p, c).filter((i) => i.question).slice(0, 3)
  const qs: Omit<MentorQuestion, 'id' | 'status' | 'followups' | 'thread' | 'pageId'>[] = [
    ...fromInsights.map((i) => ({ type: i.type, quote: i.quote, text: i.question! })),
    ...(BANK[p.id] ?? [{ type: 'Open design choice' as IssueType, text: `What is the single decision on “${p.title}” you are least sure about, and what would you need to settle it?` }]),
  ]
  return qs.slice(0, 4).map((q) => ({ ...q, id: crypto.randomUUID(), pageId: p.id, status: 'open' as const, followups: 0, thread: [] }))
}

/** Proposed default from D-06 (follow-ups per issue, pending faculty confirmation). */
export const MAX_FOLLOWUPS = 3

export function evaluateReply(text: string, followups: number): { verdict: 'resolved' | 'followup' | 'gap'; reply: string } {
  const w = words(text)
  const specific = /\d/.test(text) || JUSTIFY.test(text)
  if (w >= 20 && specific) return { verdict: 'resolved', reply: 'That gives a concrete basis for the decision. I have noted it as resolved. Consider writing the same reasoning into the page so a reader sees it without asking.' }
  if (followups + 1 >= MAX_FOLLOWUPS) return { verdict: 'gap', reply: 'Let us park this one. I have recorded it as a gap to revisit — it will show in your end-of-session summary. Nothing here is a mark or a verdict on you.' }
  if (w < 12) return { verdict: 'followup', reply: 'Could you be more specific? Name the value, the calculation step or the source you are relying on.' }
  return { verdict: 'followup', reply: 'You have described the idea. What number or measurement would show that it holds in your design?' }
}

export const AI_LABEL = 'Simulated preview — real AI is not connected yet'
