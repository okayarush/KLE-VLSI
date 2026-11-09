import type { ReviewId } from '../data/handbook'
import { completeRows, skey, words, type Content } from './progress'
import { PAGES, type RowsSection } from '../data/pages'

/**
 * Review readiness — ADVISORY, highlight-and-record only (A-09 pending: gates are not hard locks).
 * Criteria wording follows the handbook gates summarised in PROJECT_REQUIREMENTS §4.2 and §5.6.
 * `auto` criteria are checked against what the student has written; `manual` ones are the student's call.
 * Nothing here is a mark, and none of it replaces the faculty gate decision.
 */
export interface Criterion { id: string; text: string; cite: string; page?: number; status: 'met' | 'unmet' | 'manual' }

const rowsOf = (c: Content, p: number, s: string) => c.rows[skey(p, s)] ?? []
const complete = (c: Content, p: number, s: string) => {
  const sec = PAGES[p].sections.find((x) => x.id === s) as RowsSection
  return completeRows(sec, rowsOf(c, p, s))
}
const ev = (c: Content, p: number, s: string) => c.evidence.some((e) => e.pageId === p && e.sectionId === s)
const ok = (b: boolean): Criterion['status'] => (b ? 'met' : 'unmet')

export function readinessFor(r: ReviewId, c: Content): Criterion[] {
  const cite = (x: string) => `H §9.2 · ${x}`
  switch (r) {
    case 'R1': return [
      { id: 'need', text: 'Need statement written, with sourced design inputs', cite: cite('Review 1'), page: 2, status: ok(words(c.prose['2.need']) >= 40 && complete(c, 2, 'inputs').length >= 3) },
      { id: 'cfr', text: 'At least 3 candidate functional requirements with numbers', cite: cite('Review 1'), page: 2, status: ok(rowsOf(c, 2, 'candfr').filter((x) => x.v.statement?.trim() && x.v.target?.trim()).length >= 3) },
      { id: 'nb', text: 'First Notebook entry recorded', cite: cite('Review 1'), page: 11, status: ok(complete(c, 11, 'entries').length >= 1) },
      { id: 'fim', text: 'Foundation Integration Map template started', cite: cite('Review 1'), page: 7, status: 'manual' },
      { id: 'shared', text: 'Portfolio shared with your mentor', cite: 'Proposal §4', status: 'manual' },
    ]
    case 'R2': return [
      { id: 'alts', text: 'At least 3 concepts documented, rejected ones included', cite: cite('Review 2'), page: 3, status: ok(complete(c, 3, 'alts').length >= 3) },
      { id: 'cmp', text: 'Concepts compared (Pugh matrix / weighted criteria)', cite: cite('Review 2'), page: 3, status: ok(words(c.prose['3.compare']) >= 30) },
      { id: 'sel', text: 'Selected concept stated with rationale', cite: cite('Review 2'), page: 3, status: ok(words(c.prose['3.selected']) >= 40) },
      { id: 'scope', text: 'Scope in and out stated', cite: cite('Review 2'), page: 3, status: ok(words(c.prose['3.scope']) >= 20) },
      { id: 'sketch', text: 'Sketches attached as evidence', cite: 'Proposal §4', page: 3, status: ok(ev(c, 3, 'alts')) },
      { id: 'r1', text: 'Response to Review 1 feedback recorded', cite: 'Proposal §4', page: 12, status: 'manual' },
    ]
    case 'R3': {
      const blocks = rowsOf(c, 5, 'blocks')
      const alts = rowsOf(c, 5, 'subalts').map((x) => (x.v.block ?? '').trim().toLowerCase())
      const frs = complete(c, 4, 'frtable')
      return [
        { id: 'fr', text: 'FR table complete — quantified, with method, source and status on every row', cite: cite('Review 3'), page: 4, status: ok(frs.length >= 3 && frs.length === rowsOf(c, 4, 'frtable').length) },
        { id: 'diag', text: 'Block diagram attached', cite: cite('Review 3'), page: 5, status: ok(ev(c, 5, 'diagram')) },
        { id: 'gov', text: 'Every block lists inputs, outputs and a governing requirement', cite: cite('Review 3'), page: 5, status: ok(blocks.length >= 3 && blocks.every((b) => b.v.fr?.trim() && b.v.inputs?.trim() && b.v.outputs?.trim())) },
        { id: 'alt', text: 'At least one alternative recorded for each block', cite: cite('Review 3'), page: 5, status: ok(blocks.length > 0 && blocks.every((b) => alts.includes((b.v.block ?? '').trim().toLowerCase()))) },
        { id: 'dc', text: 'First Applied-level decision card', cite: 'Proposal §4', page: 7, status: ok(rowsOf(c, 7, 'cards').some((x) => x.v.level === 'Applied')) },
      ]
    }
    case 'R4': return [
      { id: 'calc', text: 'Key components sized by traceable calculations linked to FRs', cite: cite('Review 4'), page: 6, status: ok(complete(c, 6, 'calcs').length >= 1) },
      { id: 'sch', text: 'Schematic and constraints attached', cite: cite('Review 4'), page: 6, status: ok(ev(c, 6, 'schematic')) },
      { id: 'bom', text: 'Every BOM part traces to a calculation or stated assumption', cite: cite('Review 4'), page: 6, status: ok(complete(c, 6, 'bom').length > 0 && complete(c, 6, 'bom').length === rowsOf(c, 6, 'bom').length) },
      { id: 'sim', text: 'Simulation for the critical block', cite: cite('Review 4'), page: 8, status: ok(complete(c, 8, 'sim').length >= 1) },
      { id: 'noval', text: 'No component value without a calculation or stated assumption', cite: cite('Review 4'), status: 'manual' },
    ]
    case 'R5': return [
      { id: 'tests', text: 'Subsystem test records with predicted values', cite: cite('Review 5'), page: 8, status: ok(complete(c, 8, 'tests').length >= 1) },
      { id: 'dbg', text: 'Debug log with at least 2 failure cycles', cite: cite('Review 5'), page: 10, status: ok(complete(c, 10, 'debug').length >= 2) },
      { id: 'dev', text: 'Deviations from plan recorded', cite: cite('Review 5'), page: 8, status: ok(rowsOf(c, 8, 'deviations').length >= 1) },
      { id: 'hw', text: 'Hardware inspected against the schematic', cite: cite('Review 5'), status: 'manual' },
    ]
    case 'FINAL': {
      const frNos = rowsOf(c, 4, 'frtable').map((r) => r.v.no?.trim().toUpperCase()).filter(Boolean)
      const val = new Set(rowsOf(c, 9, 'validation').map((r) => r.v.fr?.trim().toUpperCase()))
      return [
        { id: 'all', text: 'Predicted vs measured recorded for every FR', cite: cite('Final Review'), page: 9, status: ok(frNos.length > 0 && frNos.every((f) => val.has(f))) },
        { id: 'imp', text: 'At least one improvement re-measured', cite: cite('Final Review'), page: 10, status: ok(rowsOf(c, 10, 'debug').some((r) => r.v.remeasure?.trim())) },
        { id: 'dbg3', text: 'Debug log with at least 3 failure cycles', cite: cite('Final Review'), page: 10, status: ok(complete(c, 10, 'debug').length >= 3) },
        { id: 'refl', text: 'Individual reflections recorded', cite: 'Proposal §4', page: 13, status: ok(complete(c, 13, 'reflect').length >= 1) },
        { id: 'demo', text: 'Demo video attached', cite: 'Proposal §4', page: 14, status: ok(ev(c, 14, 'video')) },
        { id: 'files', text: 'Project file links added', cite: 'Proposal §4', page: 15, status: ok(complete(c, 15, 'links').length >= 1) },
        { id: 'viva', text: 'Prepared for the individual viva', cite: cite('Final Review'), status: 'manual' },
      ]
    }
  }
}
