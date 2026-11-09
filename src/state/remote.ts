import { supabase } from '../lib/supabase'
import type { EvidenceItem, MentorSession, Row, StepState } from './store'

/**
 * Supabase persistence for real-mode workspaces. Writes are debounced per record, tracked as
 * pending/failed, and can be flushed (Save button, route change, unload).
 */
export interface LoadedContent {
  prose: Record<string, string>
  proseDoc: Record<string, unknown>
  rows: Record<string, Row[]>
  evidence: EvidenceItem[]
  completed: Record<number, boolean>
  stepStates: Record<number, StepState>
  activity: { at: string; text: string }[]
  mentor: MentorSession[]
  submission: { status: 'draft' } | { status: 'submitted'; at: string; reviewId: string }
  submitChecks: Record<string, boolean>
  dismissedInsights: string[]
}

type Listener = (s: { pending: number; failed: number; savedAt: string | null }) => void
let listener: Listener = () => {}
export const onSyncChange = (l: Listener) => { listener = l }

let inflight = 0
let failed = 0
let savedAt: string | null = null
const timers = new Map<string, ReturnType<typeof setTimeout>>()
const jobs = new Map<string, () => Promise<void>>()
const pendingCount = () => timers.size + inflight
const emit = () => listener({ pending: pendingCount(), failed, savedAt })

async function run(job: () => Promise<void>) {
  inflight++; emit()
  try {
    await job()
    savedAt = new Date().toISOString()
    failed = 0
  } catch (e) {
    failed++
    console.error('save failed', e)
  } finally { inflight--; emit() }
}

/** Queue a write; the latest job for a key wins after `delay` ms of quiet. */
export function queue(key: string, job: () => Promise<void>, delay = 0) {
  jobs.set(key, job)
  clearTimeout(timers.get(key))
  timers.set(key, setTimeout(() => {
    timers.delete(key)
    const j = jobs.get(key); jobs.delete(key)
    if (j) void run(j); else emit()
  }, delay))
  emit()
}

/** Runs every queued write now and waits for in-flight ones. Returns true when everything saved. */
export async function flush(): Promise<boolean> {
  for (const k of [...timers.keys()]) {
    clearTimeout(timers.get(k)); timers.delete(k)
    const j = jobs.get(k); jobs.delete(k)
    if (j) await run(j)
  }
  while (inflight > 0) await new Promise((r) => setTimeout(r, 40))
  emit()
  return failed === 0
}
export const hasPending = () => pendingCount() > 0

const check = <T>(res: { data: T; error: { message: string } | null }) => { if (res.error) throw new Error(res.error.message); return res.data }

export async function loadAll(teamId: string): Promise<LoadedContent> {
  const q = (t: string) => supabase.from(t).select('*').eq('team_id', teamId)
  const [prose, rows, ev, pages, steps, act, ments, sub, checks, dis] = await Promise.all([
    q('section_prose'), q('section_rows').order('sort').order('created_at'), q('evidence').order('created_at', { ascending: false }),
    q('page_status'), q('step_states'), q('activity').order('created_at', { ascending: false }).limit(20),
    q('mentor_sessions'), q('submissions'), q('submit_checks'), q('dismissed_insights'),
  ])
  const out: LoadedContent = { prose: {}, proseDoc: {}, rows: {}, evidence: [], completed: {}, stepStates: {}, activity: [], mentor: [], submission: { status: 'draft' }, submitChecks: {}, dismissedInsights: [] }
  for (const p of check(prose) as any[]) { const k = `${p.page_no}.${p.section_id}`; out.prose[k] = p.text; if (p.content) out.proseDoc[k] = p.content }
  for (const r of check(rows) as any[]) { const k = `${r.page_no}.${r.section_id}`; (out.rows[k] ??= []).push({ id: r.id, v: r.data ?? {}, at: r.created_at }) }
  for (const e of check(ev) as any[]) out.evidence.push({ id: e.id, name: e.name, mime: e.mime, size: Number(e.size), caption: e.caption, pageId: e.page_no, sectionId: e.section_id, addedAt: e.created_at, path: e.storage_path })
  for (const p of check(pages) as any[]) out.completed[p.page_no] = p.completed
  for (const s of check(steps) as any[]) out.stepStates[s.step_no] = s.state
  out.activity = (check(act) as any[]).map((a) => ({ at: a.created_at, text: a.text }))
  out.mentor = (check(ments) as any[]).map((m) => m.data as MentorSession)
  const s = (check(sub) as any[])[0]
  if (s?.status === 'submitted') out.submission = { status: 'submitted', at: s.submitted_at, reviewId: s.review_id }
  for (const c of check(checks) as any[]) out.submitChecks[`${c.review_id}.${c.criterion_id}`] = c.ticked
  out.dismissedInsights = (check(dis) as any[]).map((d) => d.insight_id)
  await signEvidence(out.evidence)
  return out
}

/* ---------- signed evidence URLs (private bucket) ---------- */
export const evidenceUrls = new Map<string, string>()
export async function signEvidence(list: EvidenceItem[]) {
  const need = list.filter((e) => e.path && !evidenceUrls.has(e.id))
  if (!need.length) return
  const { data } = await supabase.storage.from('evidence').createSignedUrls(need.map((e) => e.path!), 60 * 60 * 6)
  data?.forEach((d, i) => { if (d.signedUrl) evidenceUrls.set(need[i].id, d.signedUrl) })
}

/* ---------- writers ---------- */
export const saveProse = (teamId: string, page: number, sec: string, doc: unknown, text: string) =>
  queue(`prose:${page}.${sec}`, async () => {
    check(await supabase.from('section_prose').upsert({ team_id: teamId, page_no: page, section_id: sec, content: doc ?? null, text, updated_at: new Date().toISOString() }))
  }, 800)

export const saveRow = (teamId: string, page: number, sec: string, row: Row, sort: number, immediate = false) =>
  queue(`row:${row.id}`, async () => {
    check(await supabase.from('section_rows').upsert({ id: row.id, team_id: teamId, page_no: page, section_id: sec, sort, data: row.v }))
  }, immediate ? 0 : 600)

export const deleteRow = (id: string) => {
  clearTimeout(timers.get(`row:${id}`)); timers.delete(`row:${id}`); jobs.delete(`row:${id}`)
  queue(`rowdel:${id}`, async () => { check(await supabase.from('section_rows').delete().eq('id', id)) })
}

export async function uploadEvidence(teamId: string, file: File, meta: { id: string; pageId: number; sectionId: string; caption: string }): Promise<EvidenceItem> {
  const safe = file.name.replace(/[^\w.\-]+/g, '_')
  const path = `team/${teamId}/${meta.pageId}/${crypto.randomUUID()}-${safe}`
  const up = await supabase.storage.from('evidence').upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false })
  if (up.error) throw new Error(up.error.message)
  const ins = await supabase.from('evidence').insert({ id: meta.id, team_id: teamId, page_no: meta.pageId, section_id: meta.sectionId, name: file.name, mime: file.type || 'application/octet-stream', size: file.size, caption: meta.caption, storage_path: path }).select().single()
  if (ins.error) { await supabase.storage.from('evidence').remove([path]); throw new Error(ins.error.message) }
  const item: EvidenceItem = { id: meta.id, name: file.name, mime: file.type, size: file.size, caption: meta.caption, pageId: meta.pageId, sectionId: meta.sectionId, addedAt: ins.data.created_at, path }
  await signEvidence([item])
  savedAt = new Date().toISOString(); emit()
  return item
}
export const saveEvidenceCaption = (id: string, caption: string) =>
  queue(`evcap:${id}`, async () => { check(await supabase.from('evidence').update({ caption }).eq('id', id)) }, 600)
export const removeEvidence = (e: EvidenceItem) =>
  queue(`evdel:${e.id}`, async () => {
    if (e.path) await supabase.storage.from('evidence').remove([e.path])
    check(await supabase.from('evidence').delete().eq('id', e.id))
  })

export const setPageCompleted = (teamId: string, page: number, completed: boolean) =>
  queue(`page:${page}`, async () => { check(await supabase.from('page_status').upsert({ team_id: teamId, page_no: page, completed, completed_at: completed ? new Date().toISOString() : null })) })
export const setStepState = (teamId: string, step: number, state: StepState) =>
  queue(`step:${step}`, async () => { check(await supabase.from('step_states').upsert({ team_id: teamId, step_no: step, state })) }, 300)
export const logActivity = (teamId: string, text: string) =>
  queue(`act:${Date.now()}:${Math.random()}`, async () => { check(await supabase.from('activity').insert({ team_id: teamId, text })) }, 1500)
export const saveMentor = (teamId: string, s: MentorSession) =>
  queue(`mentor:${s.id}`, async () => { check(await supabase.from('mentor_sessions').upsert({ id: s.id, team_id: teamId, page_no: s.pageId, data: s, updated_at: new Date().toISOString() })) }, 500)
export const saveSubmission = (teamId: string, sub: { status: 'draft' } | { status: 'submitted'; at: string; reviewId: string }, userId?: string) =>
  queue('submission', async () => {
    check(await supabase.from('submissions').upsert({ team_id: teamId, status: sub.status, review_id: sub.status === 'submitted' ? sub.reviewId : null, submitted_at: sub.status === 'submitted' ? sub.at : null, submitted_by: sub.status === 'submitted' ? userId : null }))
  })
export const saveSubmitCheck = (teamId: string, review: string, criterion: string, ticked: boolean) =>
  queue(`chk:${review}.${criterion}`, async () => { check(await supabase.from('submit_checks').upsert({ team_id: teamId, review_id: review, criterion_id: criterion, ticked })) })
export const saveDismissed = (teamId: string, id: string) =>
  queue(`dis:${id}`, async () => { check(await supabase.from('dismissed_insights').upsert({ team_id: teamId, insight_id: id })) })
