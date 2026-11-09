import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { seedContent } from '../demo/seed'
import * as remote from './remote'
import type { Team } from '../data/team'

export type StepState = 'todo' | 'doing' | 'done'
export interface Row { id: string; v: Record<string, string>; at: string }
export interface EvidenceItem { id: string; name: string; mime: string; size: number; caption: string; pageId: number; sectionId: string; addedAt: string; path?: string }
export type IssueType = 'Unsupported assumption' | 'Possible error' | 'Open design choice' | 'Needs context' | 'Incomplete' | 'Missing evidence'
export interface ThreadMsg { role: 'mentor' | 'student'; text: string; at: string }
export type QStatus = 'open' | 'resolved' | 'gap' | 'skipped' | 'disputed'
export interface MentorQuestion { id: string; pageId: number; type: IssueType; quote?: string; text: string; status: QStatus; followups: number; thread: ThreadMsg[] }
export interface MentorSession { id: string; pageId: number; startedAt: string; endedAt?: string; questions: MentorQuestion[] }
/** `real` = Supabase-authenticated student with a persisted team workspace; `demo` = local seeded presentation project. */
export interface Session { email: string; name: string; mode: 'real' | 'demo'; userId?: string }
export type Submission = { status: 'draft' } | { status: 'submitted'; at: string; reviewId: string }
export interface FacultyReview { id: string; reviewId: string; summary: string; observations: { text: string; page_no?: number }[]; releasedAt: string }
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface Content {
  prose: Record<string, string>
  proseDoc: Record<string, unknown>
  rows: Record<string, Row[]>
  evidence: EvidenceItem[]
  stepStates: Record<number, StepState>
  mentor: MentorSession[]
  activity: { at: string; text: string }[]
  completed: Record<number, boolean>
  submission: Submission
  submitChecks: Record<string, boolean>
  dismissedInsights: string[]
  facultyReviews: FacultyReview[]
}

interface State extends Content {
  session: Session | null
  /** real mode only */
  team: Team | null
  booting: boolean
  workspaceReady: boolean
  lastPage: number | null
  savedAt: string | null
  saveStatus: SaveStatus
  setBooting: (b: boolean) => void
  loadWorkspace: (team: Team | null, c?: remote.LoadedContent, reviews?: FacultyReview[]) => void
  toggleComplete: (pageId: number) => void
  markSaved: () => Promise<boolean>
  signIn: (s: Session) => void
  signOut: () => void
  setProse: (key: string, text: string, label: string, pageId: number, doc?: unknown) => void
  addRow: (key: string, v: Record<string, string>, pageId: number) => string
  updateRow: (key: string, id: string, patch: Record<string, string>, pageId: number) => void
  removeRow: (key: string, id: string) => void
  addEvidence: (e: Omit<EvidenceItem, 'id' | 'addedAt'> & { id?: string; addedAt?: string }) => void
  updateEvidence: (id: string, patch: Partial<EvidenceItem>) => void
  removeEvidence: (id: string) => void
  setStep: (n: number, s: StepState) => void
  submit: (reviewId: string) => void
  reopen: () => void
  setSubmitCheck: (review: string, criterion: string, ticked: boolean) => void
  dismissInsight: (id: string) => void
  upsertSession: (s: MentorSession) => void
  resetDemo: () => void
}

const now = () => new Date().toISOString()
const log = (a: State['activity'], text: string) => [{ at: now(), text }, ...a].slice(0, 20)

/** Empty workspace: real students always start here — nothing is pre-filled. */
export const emptyContent = (): Content => ({
  prose: {}, proseDoc: {}, rows: {}, evidence: [], stepStates: {}, mentor: [], activity: [], completed: {},
  submission: { status: 'draft' }, submitChecks: {}, dismissedInsights: [], facultyReviews: [],
})
const demoContent = (): Content => ({ ...emptyContent(), ...seedContent(), completed: { 0: true, 1: true, 2: true } })

const real = (s: State) => s.session?.mode === 'real' && s.team ? s.team.id : null
const pageName = (pageId: number) => (pageId === 0 ? 'Home' : `Page ${pageId}`)
const splitKey = (k: string): [number, string] => { const i = k.indexOf('.'); return [Number(k.slice(0, i)), k.slice(i + 1)] }

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      session: null,
      team: null,
      booting: true,
      workspaceReady: false,
      ...emptyContent(),
      lastPage: null,
      savedAt: null,
      saveStatus: 'idle',
      setBooting: (booting) => set({ booting }),
      loadWorkspace: (team, c, reviews) => set(() => ({ team, workspaceReady: true, ...emptyContent(), ...(c ?? {}), facultyReviews: reviews ?? [] })),
      toggleComplete: (pageId) => {
        const s = get(); const next = !s.completed[pageId]
        set({ completed: { ...s.completed, [pageId]: next }, activity: log(s.activity, `${next ? 'Marked complete:' : 'Reopened'} ${pageName(pageId)}`) })
        const t = real(s); if (t) { remote.setPageCompleted(t, pageId, next); remote.logActivity(t, `${next ? 'Marked complete:' : 'Reopened'} ${pageName(pageId)}`) }
      },
      markSaved: async () => {
        const t = real(get())
        if (!t) { set({ savedAt: now(), saveStatus: 'saved' }); return true }
        set({ saveStatus: 'saving' })
        const ok = await remote.flush()
        set({ saveStatus: ok ? 'saved' : 'error', savedAt: ok ? now() : get().savedAt })
        return ok
      },
      signIn: (session) => set({ session }),
      signOut: () => set({ session: null, team: null, workspaceReady: false, ...emptyContent(), lastPage: null, savedAt: null, saveStatus: 'idle' }),
      setProse: (key, text, label, pageId, doc) => {
        const s = get()
        set({ prose: { ...s.prose, [key]: text }, proseDoc: doc !== undefined ? { ...s.proseDoc, [key]: doc } : s.proseDoc, lastPage: pageId, activity: s.lastPage === pageId && s.activity[0]?.text === `Edited ${label}` ? s.activity : log(s.activity, `Edited ${label}`) })
        const t = real(s); if (t) { const [p, sec] = splitKey(key); remote.saveProse(t, p, sec, doc ?? null, text); if (s.activity[0]?.text !== `Edited ${label}`) remote.logActivity(t, `Edited ${label}`) }
      },
      addRow: (key, v, pageId) => {
        const id = crypto.randomUUID()
        const s = get(); const row: Row = { id, v, at: now() }
        const list = [...(s.rows[key] ?? []), row]
        set({ rows: { ...s.rows, [key]: list }, lastPage: pageId })
        const t = real(s); if (t) { const [p, sec] = splitKey(key); remote.saveRow(t, p, sec, row, list.length - 1, true) }
        return id
      },
      updateRow: (key, id, patch, pageId) => {
        const s = get(); let updated: Row | undefined; let idx = 0
        const list = (s.rows[key] ?? []).map((r, i) => { if (r.id === id) { updated = { ...r, v: { ...r.v, ...patch } }; idx = i; return updated } return r })
        set({ rows: { ...s.rows, [key]: list }, lastPage: pageId })
        const t = real(s); if (t && updated) { const [p, sec] = splitKey(key); remote.saveRow(t, p, sec, updated, idx) }
      },
      removeRow: (key, id) => {
        const s = get()
        set({ rows: { ...s.rows, [key]: (s.rows[key] ?? []).filter((r) => r.id !== id) } })
        if (real(s)) remote.deleteRow(id)
      },
      addEvidence: (e) => {
        const s = get(); const item: EvidenceItem = { ...e, id: e.id ?? crypto.randomUUID(), addedAt: e.addedAt ?? now() }
        set({ evidence: [item, ...s.evidence.filter((x) => x.id !== item.id)], activity: log(s.activity, `Added evidence “${e.name}”`) })
        const t = real(s); if (t) remote.logActivity(t, `Added evidence “${e.name}”`)
      },
      updateEvidence: (id, patch) => {
        const s = get()
        set({ evidence: s.evidence.map((e) => (e.id === id ? { ...e, ...patch } : e)) })
        if (real(s) && patch.caption !== undefined) remote.saveEvidenceCaption(id, patch.caption)
      },
      removeEvidence: (id) => {
        const s = get(); const e = s.evidence.find((x) => x.id === id)
        set({ evidence: s.evidence.filter((x) => x.id !== id) })
        if (real(s) && e) remote.removeEvidence(e)
      },
      setStep: (n, st) => {
        const s = get(); set({ stepStates: { ...s.stepStates, [n]: st } })
        const t = real(s); if (t) remote.setStepState(t, n, st)
      },
      submit: (reviewId) => {
        const s = get(); const sub: Submission = { status: 'submitted', at: now(), reviewId }
        set({ submission: sub, activity: log(s.activity, 'Submitted portfolio for review') })
        const t = real(s); if (t) { remote.saveSubmission(t, sub, s.session?.userId); remote.logActivity(t, 'Submitted portfolio for review') }
      },
      reopen: () => {
        const s = get(); set({ submission: { status: 'draft' } })
        const t = real(s); if (t) remote.saveSubmission(t, { status: 'draft' })
      },
      setSubmitCheck: (review, criterion, ticked) => {
        const s = get(); set({ submitChecks: { ...s.submitChecks, [`${review}.${criterion}`]: ticked } })
        const t = real(s); if (t) remote.saveSubmitCheck(t, review, criterion, ticked)
      },
      dismissInsight: (id) => {
        const s = get(); set({ dismissedInsights: [...s.dismissedInsights, id] })
        const t = real(s); if (t) remote.saveDismissed(t, id)
      },
      upsertSession: (sess) => {
        const s = get()
        set({ mentor: s.mentor.some((m) => m.id === sess.id) ? s.mentor.map((m) => (m.id === sess.id ? sess : m)) : [sess, ...s.mentor] })
        const t = real(s); if (t) remote.saveMentor(t, sess)
      },
      resetDemo: () => { if (get().session?.mode === 'demo') set({ ...demoContent(), lastPage: 3, savedAt: null }) },
    }),
    {
      name: 'fip-demo-v1',
      version: 1,
      // Only the DEMO project is stored in the browser. Real student data lives in Supabase and is never cached here.
      partialize: (s) => (s.session?.mode === 'demo'
        ? { session: s.session, prose: s.prose, proseDoc: s.proseDoc, rows: s.rows, evidence: s.evidence, stepStates: s.stepStates, mentor: s.mentor, activity: s.activity, completed: s.completed, submission: s.submission, submitChecks: s.submitChecks, dismissedInsights: s.dismissedInsights, lastPage: s.lastPage, savedAt: s.savedAt }
        : {}) as never,
      merge: (persisted, current) => {
        const p = persisted as Partial<State> | undefined
        return p?.session?.mode === 'demo' ? { ...current, ...p } : current
      },
    },
  ),
)

/** Starts a fresh seeded demo (used by the "Explore demo project" action). */
export function startDemo(name: string, email: string) {
  const st = useStore.getState()
  const hasDemo = st.session?.mode === 'demo'
  useStore.setState({ session: { email, name, mode: 'demo' }, team: null, workspaceReady: true, booting: false, ...(hasDemo ? {} : { ...demoContent(), lastPage: 3 }) })
}

export const key = (pageId: number, sectionId: string) => `${pageId}.${sectionId}`

// reflect background-save state on the store (drives the Save button)
remote.onSyncChange(({ pending, failed }) => {
  const cur = useStore.getState().saveStatus
  const next: SaveStatus = failed ? 'error' : pending > 0 ? 'saving' : cur === 'saving' ? 'saved' : cur
  if (next !== cur) useStore.setState({ saveStatus: next, ...(next === 'saved' ? { savedAt: new Date().toISOString() } : {}) })
})
if (typeof window !== 'undefined') window.addEventListener('beforeunload', (e) => { if (remote.hasPending()) { void remote.flush(); e.preventDefault() } })
