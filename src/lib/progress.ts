import { PAGES, type PageDef, type SectionDef } from '../data/pages'
import { REVIEWS, STEPS, pagesLiveAt, type ReviewId } from '../data/handbook'
import type { EvidenceItem, Row, StepState } from '../state/store'

export interface Content { prose: Record<string, string>; rows: Record<string, Row[]>; evidence: EvidenceItem[] }

export const words = (s = '') => (s.trim() ? s.trim().split(/\s+/).length : 0)
export const skey = (p: number, s: string) => `${p}.${s}`

/** A row counts when every required field is filled. */
export function completeRows(sec: Extract<SectionDef, { type: 'rows' }>, rows: Row[] = []) {
  const req = sec.fields.filter((f) => f.required).map((f) => f.id)
  return rows.filter((r) => req.every((id) => (r.v[id] ?? '').trim()))
}

/** 0..1 completion of one section. Advisory only — this is a writing-progress measure, not a grade. */
export function sectionProgress(p: PageDef, sec: SectionDef, c: Content): number {
  const k = skey(p.id, sec.id)
  if (sec.type === 'prose') return Math.min(1, words(c.prose[k]) / (sec.minWords ?? 20))
  if (sec.type === 'rows') {
    const need = Math.max(sec.minRows ?? 1, 1)
    if ((sec.minRows ?? 1) === 0) return (c.rows[k]?.length ?? 0) > 0 ? 1 : 0
    return Math.min(1, completeRows(sec, c.rows[k]).length / need)
  }
  return c.evidence.some((e) => e.pageId === p.id && e.sectionId === sec.id) ? 1 : 0
}

export function pageProgress(p: PageDef, c: Content) {
  const parts = p.sections.map((s) => sectionProgress(p, s, c))
  const pct = parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : 0
  const started = parts.some((x) => x > 0)
  const status: 'none' | 'progress' | 'ready' = pct >= 0.999 ? 'ready' : started ? 'progress' : 'none'
  return { pct: pct * 100, status, parts }
}

export function overall(c: Content, scope: 'all' | ReviewId = 'all') {
  const ids = scope === 'all' ? PAGES.map((p) => p.id) : pagesLiveAt(scope)
  const list = ids.map((id) => pageProgress(PAGES[id], c).pct)
  return list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0
}

export const STATUS_LABEL = { none: 'Not started', progress: 'In progress', ready: 'Ready' } as const

export function stepSummary(states: Record<number, StepState>) {
  const done = STEPS.filter((s) => states[s.n] === 'done').length
  const doing = STEPS.filter((s) => states[s.n] === 'doing').length
  return { done, doing, todo: STEPS.length - done - doing }
}

export function nextReviewAfter(current: ReviewId) {
  const i = REVIEWS.findIndex((r) => r.id === current)
  return REVIEWS[Math.min(i + 1, REVIEWS.length - 1)]
}

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

export function ago(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  const d = Math.round(h / 24)
  return d === 1 ? 'yesterday' : `${d} days ago`
}

export const bytes = (n: number) => (n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`)
