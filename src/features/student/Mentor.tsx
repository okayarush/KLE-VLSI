import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Eye,
  Flag,
  History,
  Lightbulb,
  Loader2,
  Play,
  RefreshCw,
  Send,
  SkipForward,
  Square,
} from 'lucide-react'
import { Button, Card, CardTitle, Chip, Empty } from '../../design-system'
import { AIBadge, AIBanner, IssueChip } from '../../ai/parts'
import {
  generateGroqQuestions,
  evaluateGroqReply,
  getAiStatus,
  requestVivaHint,
  type AiStatus,
} from '../../ai/groq'
import { updateSessionMemory } from '../../ai/sessionMemory'
import { PAGES, pageLabel } from '../../data/pages'
import { ago, fmtDate } from '../../lib/progress'
import { supabase } from '../../lib/supabase'
import {
  useStore,
  type MentorQuestion,
  type MentorSession,
  type ThreadMsg,
} from '../../state/store'
import { useContent, useTeam } from './hooks'

const now = () => new Date().toISOString()
const STATUS_TXT = {
  open: 'Unanswered',
  resolved: 'Resolved',
  gap: 'Gap to address',
  skipped: 'Skipped',
  disputed: 'Disputed',
} as const

export function Mentor() {
  const c = useContent()
  const team = useTeam()
  const { mentor, upsertSession } = useStore()
  const [pageId, setPageId] = useState(2)

  // Initialize activeId from URL query param if present
  const initialSession = new URLSearchParams(window.location.search).get('session')
  const [activeId, setActiveId] = useState<string | null>(initialSession)
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null)

  const [draft, setDraft] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [evaluating, setEvaluating] = useState(false)
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null)
  const [ack, setAck] = useState<Record<string, boolean>>({})
  const end = useRef<HTMLDivElement>(null)

  const active = mentor.find((m) => m.id === activeId)
  const current = active && !active.endedAt
    ? (active.questions.find((q) => q.id === activeQuestionId) ||
       active.questions.find((q) => q.status === 'open') ||
       active.questions[0])
    : undefined

  const idx = current && active ? active.questions.indexOf(current) : -1
  const openTotal = mentor.flatMap((m) => m.questions).filter((q) => q.status === 'open').length

  useEffect(() => {
    getAiStatus().then(setAiStatus)
  }, [])


  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [current?.thread.length, current?.id, evaluating])

  const save = (s: MentorSession, q: MentorQuestion, patch: Partial<MentorQuestion>) =>
    upsertSession({
      ...s,
      questions: s.questions.map((x) => (x.id === q.id ? { ...q, ...patch } : x)),
    })

  const msg = (
    role: ThreadMsg['role'],
    text: string,
    evaluationState?: ThreadMsg['evaluationState'],
  ): ThreadMsg => ({
    role,
    text,
    at: now(),
    evaluationState,
  })

  const themeName = team?.theme?.name

  const start = async () => {
    setNote('')
    setLoading(true)
    try {
      const qs = await generateGroqQuestions(PAGES[pageId], c, themeName)
      if (qs === 'insufficient') {
        setNote(
          `“${PAGES[pageId].title}” doesn’t have enough written yet for me to question. Add your main content first, then come back.`,
        )
        return
      }
      const s: MentorSession = {
        id: crypto.randomUUID(),
        pageId,
        startedAt: now(),
        questions: qs,
      }
      upsertSession(s)
      setActiveId(s.id)
      setActiveQuestionId(qs[0]?.id ?? null)
    } finally {
      setLoading(false)
    }
  }

  const reply = async () => {
    if (!active || !current || !draft.trim() || evaluating) return
    const studentText = draft.trim()
    setDraft('')
    setEvaluating(true)

    // Functional read of latest store state to avoid stale closure races
    const latestSession = useStore.getState().mentor.find((m) => m.id === active.id) ?? active
    const latestQuestion = latestSession.questions.find((q) => q.id === current.id) ?? current

    // Optimistically record student's response in thread
    const studentMsg = msg('student', studentText)
    save(latestSession, latestQuestion, { thread: [...latestQuestion.thread, studentMsg] })

    try {
      const ev = await evaluateGroqReply({
        page: PAGES[active.pageId],
        currentQuestion: latestQuestion,
        studentReply: studentText,
        followupsCount: latestQuestion.followups,
        content: c,
        sessionMemory: latestSession.memory,
      })

      const mentorMsg = msg('mentor', ev.reply, ev.evalState)
      const isResolved = ev.evalState === 'resolved'

      const nextMemory = updateSessionMemory(latestSession.memory, {
        questionText: latestQuestion.text,
        lens: (latestQuestion as any).lens,
        status: ev.evalState,
        turnsCount: latestQuestion.followups + 1,
        conceptMastered: isResolved
          ? (latestQuestion as any).rationale?.conceptTested || latestQuestion.text
          : undefined,
        misconception: ev.evalState === 'incorrect' ? ev.justificationEvaluation : undefined,
        ...(ev.memoryPatch ?? {}),
      })

      const updatedStatus: import('../../state/store').QStatus = isResolved ? 'resolved' : 'open'
      const updatedQuestions = latestSession.questions.map((x) =>
        x.id === latestQuestion.id
          ? {
              ...latestQuestion,
              thread: [...latestQuestion.thread, studentMsg, mentorMsg],
              followups: isResolved ? latestQuestion.followups : latestQuestion.followups + 1,
              status: updatedStatus,
              evaluationState: ev.evalState,
            }
          : x,
      )

      upsertSession({
        ...latestSession,
        questions: updatedQuestions,
        memory: nextMemory,
      })

      if (isResolved) {
        setNote('Issue resolved! You may review this topic or click Next Issue.')
      } else {
        setNote('')
      }
    } finally {
      setEvaluating(false)
    }
  }

  const getHint = () => {
    if (!active || !current) return
    const nextLevel = (current.hintsGiven ?? 0) + 1
    const hint = requestVivaHint(current, nextLevel)
    const hintMsg = msg(
      'hint',
      `💡 ${hint.title}\n\n${hint.hintText}\n\n${hint.synthesisPrompt}`,
    )

    save(active, current, {
      thread: [...current.thread, hintMsg],
      hintsGiven: nextLevel,
    })
    setNote(`Pedagogical hint ${nextLevel} of 3 provided.`)
  }

  const skip = () => {
    if (!active || !current) return
    save(active, current, {
      status: 'skipped',
      thread: [
        ...current.thread,
        msg('mentor', 'Skipped. I have recorded this as a gap to revisit before faculty viva.'),
      ],
    })
    setNote('Issue skipped and recorded as a gap.')
  }

  const dispute = async () => {
    if (!active || !current) return
    save(active, current, {
      status: 'disputed',
      thread: [
        ...current.thread,
        msg('mentor', 'Noted — you disagree with this question. Your faculty can see that you disputed it.'),
      ],
    })
    setNote('Dispute recorded for your faculty to see.')

    try {
      const isReal = useStore.getState().session?.mode === 'real' && team?.id
      if (isReal) {
        await supabase.from('ai_student_disputes').insert({
          team_id: team.id,
          session_id: active.id,
          page_no: active.pageId,
          question_id: current.id,
          question_text: current.text,
          quote: current.quote ?? null,
          reason: 'Student disputed question during viva preparation',
        })
      }
    } catch (err) {
      console.warn('Could not record dispute to server:', err)
    }
  }

  const revised = () => {
    if (!active || !current) return
    if (!current.quote) {
      save(active, current, {
        thread: [
          ...current.thread,
          msg('mentor', 'I re-read the page. Could you tell me here in your own words what you updated?'),
        ],
      })
      return
    }

    const cleanQuote = current.quote.trim().toLowerCase().slice(0, 30)
    const inProse = Object.values(c.prose).some((p) => p.toLowerCase().includes(cleanQuote))
    const inRows = Object.values(c.rows)
      .flat()
      .some((r) => Object.values(r.v).some((v) => v.toLowerCase().includes(cleanQuote)))
    const stillPresent = inProse || inRows

    if (!stillPresent) {
      save(active, current, {
        status: 'resolved',
        thread: [
          ...current.thread,
          msg(
            'mentor',
            'I re-read the page and confirmed that the passage has been revised. Marking this issue as resolved.',
          ),
        ],
      })
      setNote('Page revision confirmed by AI Mentor — issue marked as resolved.')
    } else {
      save(active, current, {
        thread: [
          ...current.thread,
          msg(
            'mentor',
            `I re-read the page, but I still see the same passage: “${current.quote.slice(0, 60)}…”. Please explain what you changed to address the question.`,
          ),
        ],
      })
    }
  }

  const finish = () => active && upsertSession({ ...active, endedAt: now() })
  const resume = () => active && upsertSession({ ...active, endedAt: undefined })

  const mentorLabel = aiStatus?.configured ? 'Mentor · Groq Llama 3.3' : 'Mentor · simulated'

  return (
    <div className="page-wrap">
      <header className="page-head row wrap" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <p className="eyebrow">AI Mentor</p>
          <h1>Practise explaining your decisions</h1>
          <p className="muted" style={{ maxWidth: '62ch', marginTop: 6 }}>
            An interactive viva-preparation conversation about <i>your</i> project. The Mentor reads what you wrote, asks one question at a time, and records the gaps it finds.
          </p>
        </div>
        <AIBadge />
      </header>

      {aiStatus && !aiStatus.configured && (
        <div className="banner banner-warn" role="alert" style={{ marginBottom: 12 }}>
          <b>AI Mentor running in offline preview mode.</b> The Groq API key is not configured in .env.local. Structural checks and deterministic calculation verification are active, but live LLM reasoning is paused.
        </div>
      )}

      <AIBanner>
        <b>Who can read this.</b> Your assigned faculty can read this conversation, the page discussed, and the gaps identified. This is practice — it does not replace faculty review or the individual viva, and it gives no marks.
      </AIBanner>

      <div className="mentor-grid">
        <Card>
          {!active && (
            <div className="stack">
              <CardTitle title="Start a session" />
              <div className="field">
                <label htmlFor="mp">Choose a page to be questioned on</label>
                <select
                  id="mp"
                  className="select"
                  value={pageId}
                  onChange={(e) => {
                    setPageId(+e.target.value)
                    setNote('')
                  }}
                  disabled={loading}
                >
                  {PAGES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {pageLabel(p)}
                    </option>
                  ))}
                </select>
              </div>
              {note && <div className="banner banner-warn" role="status">{note}</div>}
              <div className="row wrap">
                <Button variant="accent" onClick={start} disabled={loading}>
                  {loading ? <Loader2 size={16} className="spin" /> : <Play size={16} />}
                  {loading ? 'Reading full submission & analyzing project…' : 'Begin session'}
                </Button>
                <span className="hint">
                  Socratic questioning across the Seven Engineering Lenses with progressive hints.
                </span>
              </div>
            </div>
          )}

          {active && (
            <div className="stack">
              <div className="row wrap" style={{ justifyContent: 'space-between' }}>
                <span className="row" style={{ gap: 8 }}>
                  <Chip mono>{pageLabel(PAGES[active.pageId])}</Chip>
                  <span className="hint">{fmtDate(active.startedAt)}</span>
                </span>
                <Button variant="quiet" size="sm" onClick={() => { setActiveId(null); setNote('') }}>
                  ← All sessions
                </Button>
              </div>

              {/* Clickable Progress Pips allowing topic switching without losing state */}
              <div className="progress-pips" aria-label="Questions in this session">
                {active.questions.map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setActiveQuestionId(q.id)}
                    className={`pip ${q.status === 'resolved' ? 'done' : q.status === 'gap' || q.status === 'skipped' ? 'gap' : q.id === current?.id ? 'on' : ''}`}
                    title={`${q.text.slice(0, 50)} (${STATUS_TXT[q.status]})`}
                  />
                ))}
              </div>

              {current ? (
                <>
                  <div className="row wrap" style={{ gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="row wrap" style={{ gap: 8 }}>
                      <IssueChip type={current.type} />
                      {(current as any).lens && (
                        <span className="chip mono" style={{ fontSize: 11 }}>
                          Lens: {(current as any).lens}
                        </span>
                      )}
                      <span className="chip">
                        Issue {idx + 1} of {active.questions.length} · turns {current.followups}
                      </span>
                    </div>
                    {current.status === 'resolved' && (
                      <span className="chip chip-ok" style={{ fontWeight: 600 }}>
                        ✓ Resolved
                      </span>
                    )}
                  </div>

                  <div className="chat" aria-live="polite">
                    <div className="msg msg-mentor">
                      {current.quote && <div className="msg-quote">From your page: “{current.quote}”</div>}
                      {current.text}
                      <div className="msg-meta">{mentorLabel}</div>
                    </div>

                    {current.thread.map((m, i) => (
                      <div key={i} className={`msg msg-${m.role}`}>
                        {m.role === 'mentor' && m.evaluationState && (
                          <div>
                            {m.evaluationState === 'resolved' && (
                              <span className="eval-badge eval-badge-resolved">✓ Reasoning Verified</span>
                            )}
                            {m.evaluationState === 'needs_clarification' && (
                              <span className="eval-badge eval-badge-clarify">Clarification Requested</span>
                            )}
                            {m.evaluationState === 'incorrect' && (
                              <span className="eval-badge eval-badge-incorrect">⚠ Technical Discrepancy Detected</span>
                            )}
                            {m.evaluationState === 'non_answer' && (
                              <span className="eval-badge eval-badge-nonanswer">Non-Answer / Evasion</span>
                            )}
                            {m.evaluationState === 'needs_verification' && (
                              <span className="eval-badge eval-badge-verify">Datasheet / Evidence Needed</span>
                            )}
                          </div>
                        )}
                        {m.text}
                        <div
                          className="msg-meta"
                          style={m.role === 'student' ? { color: 'inherit', opacity: 0.7 } : undefined}
                        >
                          {m.role === 'mentor' ? mentorLabel : m.role === 'hint' ? 'Scaffolding' : 'You'} · {ago(m.at)}
                        </div>
                      </div>
                    ))}

                    {evaluating && (
                      <div className="msg msg-mentor" style={{ opacity: 0.75 }}>
                        <span className="row" style={{ gap: 8, alignItems: 'center' }}>
                          <Loader2 size={14} className="spin" />
                          <span>Evaluating your explanation against engineering criteria…</span>
                        </span>
                      </div>
                    )}
                    <div ref={end} />
                  </div>

                  {current.status === 'resolved' && (
                    <div
                      className="row wrap"
                      style={{
                        padding: '10px 14px',
                        background: 'var(--ok-soft)',
                        borderRadius: 8,
                        border: '1px solid var(--ok)',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ color: 'var(--ok)', fontWeight: 600 }}>
                        ✓ Issue resolved with sound engineering justification.
                      </span>
                      {active.questions.some((q) => q.status === 'open' && q.id !== current.id) && (
                        <Button
                          variant="accent"
                          size="sm"
                          onClick={() => {
                            const nextQ = active.questions.find((q) => q.status === 'open' && q.id !== current.id)
                            if (nextQ) setActiveQuestionId(nextQ.id)
                          }}
                        >
                          Next issue <ArrowRight size={14} />
                        </Button>
                      )}
                    </div>
                  )}

                  <div className="composer">
                    <label className="sr-only" htmlFor="ans">Your answer</label>
                    <textarea
                      id="ans"
                      className="textarea"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Answer in your own words — give numbers, reasoning, equations or the datasheet source you relied on."
                      disabled={evaluating}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) reply()
                      }}
                    />
                    <div className="row wrap" style={{ gap: 6, alignItems: 'center' }}>
                      <Button onClick={reply} disabled={!draft.trim() || evaluating}>
                        {evaluating ? <Loader2 size={15} className="spin" /> : <Send size={15} />}
                        <span>Send</span>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={getHint} disabled={evaluating}>
                        <Lightbulb size={14} />
                        <span>Hint ({current.hintsGiven ?? 0}/3)</span>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={revised} disabled={evaluating}>
                        <RefreshCw size={14} /> I’ve revised the page
                      </Button>
                      <Button variant="quiet" size="sm" onClick={skip} disabled={evaluating}>
                        <SkipForward size={14} /> Skip & mark gap
                      </Button>
                      <Button variant="quiet" size="sm" onClick={dispute} disabled={evaluating}>
                        <Flag size={14} /> Dispute
                      </Button>
                      <Button variant="quiet" size="sm" onClick={finish} style={{ marginLeft: 'auto' }}>
                        <Square size={14} /> End session
                      </Button>
                    </div>
                    {note && <span className="hint" role="status">{note}</span>}
                  </div>
                </>
              ) : (
                <Summary s={active} ack={ack} setAck={setAck} onFinish={finish} onResume={resume} />
              )}
            </div>
          )}
        </Card>

        <Card>
          <CardTitle title="Session history" icon={<History size={18} />} />
          {mentor.length === 0 && (
            <Empty title="No sessions yet">
              Your discussions are saved here so you can see how your answers improve.
            </Empty>
          )}
          <ul className="history">
            {mentor.map((m) => {
              const open = m.questions.filter((q) => q.status === 'open').length
              return (
                <li key={m.id}>
                  <button
                    className={m.id === activeId ? 'on' : ''}
                    onClick={() => {
                      setActiveId(m.id)
                      setActiveQuestionId(null)
                      setNote('')
                    }}
                  >
                    <b>{pageLabel(PAGES[m.pageId])}</b>
                    <span className="muted">
                      {fmtDate(m.startedAt)} · {m.questions.filter((q) => q.status === 'resolved').length}/{m.questions.length} resolved
                    </span>
                    {open > 0 && <Chip tone="ai">{open} unanswered</Chip>}
                  </button>
                </li>
              )
            })}
          </ul>
          {openTotal > 0 && (
            <p className="hint" style={{ marginTop: 10 }}>
              {openTotal} unanswered question{openTotal > 1 ? 's' : ''} across sessions.
            </p>
          )}
          <div className="divider" />
          <p className="hint row" style={{ gap: 6, alignItems: 'flex-start' }}>
            <Eye size={14} style={{ flex: 'none', marginTop: 2 }} />
            Faculty can read these sessions. Powered by Groq Cloud (Llama 3.3 70B).
          </p>
          <p className="hint" style={{ marginTop: 8 }}>
            Want a quick scan of a page instead? Use the assistant beside each page, or see{' '}
            <Link to="/student/analysis">AI analysis</Link>.
          </p>
        </Card>
      </div>
    </div>
  )
}

function Summary({
  s,
  ack,
  setAck,
  onFinish,
  onResume,
}: {
  s: MentorSession
  ack: Record<string, boolean>
  setAck: (a: Record<string, boolean>) => void
  onFinish: () => void
  onResume: () => void
}) {
  const by = (st: MentorQuestion['status'][]) => s.questions.filter((q) => st.includes(q.status))
  const openLeft = by(['open'])
  const group = (title: string, qs: MentorQuestion[], tone: 'ok' | 'warn' | undefined) =>
    qs.length > 0 && (
      <div className="stack" style={{ gap: 8 }}>
        <h3 className="display" style={{ fontSize: 17 }}>
          {title} <Chip tone={tone}>{qs.length}</Chip>
        </h3>
        {qs.map((q) => (
          <label key={q.id} className="sum-item">
            {title !== 'Resolved' && (
              <input
                type="checkbox"
                checked={!!ack[q.id]}
                onChange={(e) => setAck({ ...ack, [q.id]: e.target.checked })}
              />
            )}
            <span>
              <IssueChip type={q.type} /> <br />
              {q.text}
              {title !== 'Resolved' && (
                <>
                  <br />
                  <span className="hint">
                    {ack[q.id] ? 'You marked: I will address this.' : 'Tick if you will address this.'}
                  </span>
                </>
              )}
            </span>
          </label>
        ))}
      </div>
    )

  return (
    <div className="stack">
      <h2 className="display" style={{ fontSize: 22 }}>
        {s.endedAt ? 'Session summary' : 'All questions covered'}
      </h2>
      <p className="muted">A record of what was settled and what still needs work. This is not a grade.</p>
      {group('Resolved', by(['resolved']), 'ok')}
      {group('Gaps to address', by(['gap', 'skipped', 'disputed']), 'warn')}
      {group('Unanswered', openLeft, undefined)}
      <div className="row wrap">
        {!s.endedAt && <Button onClick={onFinish}>End session</Button>}
        {s.endedAt && openLeft.length > 0 && (
          <Button variant="accent" onClick={onResume}>
            <Play size={15} /> Continue this session
          </Button>
        )}
        <Link className="btn btn-ghost" to={`/student/portfolio/${PAGES[s.pageId].slug}`}>
          Open the page
        </Link>
      </div>
    </div>
  )
}
