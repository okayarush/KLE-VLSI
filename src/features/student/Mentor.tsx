import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, Flag, History, Play, RefreshCw, Send, SkipForward, Square } from 'lucide-react'
import { Button, Card, CardTitle, Chip, Empty } from '../../design-system'
import { AIBadge, AIBanner, IssueChip } from '../../ai/parts'
import { MAX_FOLLOWUPS, evaluateReply, insightsForPage, mentorQuestionsFor } from '../../ai/engine'
import { PAGES, pageLabel } from '../../data/pages'
import { ago, fmtDate } from '../../lib/progress'
import { useStore, type MentorQuestion, type MentorSession, type ThreadMsg } from '../../state/store'
import { useContent } from './hooks'

const now = () => new Date().toISOString()
const STATUS_TXT = { open: 'Unanswered', resolved: 'Resolved', gap: 'Gap to address', skipped: 'Skipped', disputed: 'Disputed' } as const

export function Mentor() {
  const c = useContent()
  const { mentor, upsertSession } = useStore()
  const [pageId, setPageId] = useState(2)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [note, setNote] = useState('')
  const [ack, setAck] = useState<Record<string, boolean>>({})
  const end = useRef<HTMLDivElement>(null)

  const active = mentor.find((m) => m.id === activeId)
  const current = active && !active.endedAt ? active.questions.find((q) => q.status === 'open') : undefined
  const idx = current && active ? active.questions.indexOf(current) : -1
  const openTotal = mentor.flatMap((m) => m.questions).filter((q) => q.status === 'open').length

  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [current?.thread.length, current?.id])

  const save = (s: MentorSession, q: MentorQuestion, patch: Partial<MentorQuestion>) => upsertSession({ ...s, questions: s.questions.map((x) => (x.id === q.id ? { ...q, ...patch } : x)) })
  const msg = (role: ThreadMsg['role'], text: string): ThreadMsg => ({ role, text, at: now() })

  const start = () => {
    setNote('')
    const qs = mentorQuestionsFor(PAGES[pageId], c)
    if (qs === 'insufficient') { setNote(`“${PAGES[pageId].title}” doesn’t have enough written yet for me to question. Add your main content first, then come back.`); return }
    const s: MentorSession = { id: crypto.randomUUID(), pageId, startedAt: now(), questions: qs }
    upsertSession(s); setActiveId(s.id)
  }
  const reply = () => {
    if (!active || !current || !draft.trim()) return
    const ev = evaluateReply(draft, current.followups)
    save(active, current, {
      thread: [...current.thread, msg('student', draft.trim()), msg('mentor', ev.reply)],
      followups: ev.verdict === 'followup' ? current.followups + 1 : current.followups,
      status: ev.verdict === 'followup' ? 'open' : ev.verdict,
    })
    setDraft('')
    setNote(ev.verdict === 'followup' ? '' : `Mentor: ${ev.reply}`)
  }
  const skip = () => active && current && save(active, current, { status: 'skipped', thread: [...current.thread, msg('mentor', 'Skipped. I will keep this noted as an open point, not a penalty.')] })
  const dispute = () => { if (active && current) { save(active, current, { status: 'disputed', thread: [...current.thread, msg('mentor', 'Noted — you disagree with this question. Your faculty can see that you disputed it.')] }); setNote('Dispute recorded for your faculty to see.') } }
  const revised = () => {
    if (!active || !current) return
    const still = current.quote ? insightsForPage(PAGES[active.pageId], c).some((i) => i.quote && current.quote!.slice(0, 30) === i.quote.slice(0, 30)) : true
    if (current.quote && !still) save(active, current, { status: 'resolved', thread: [...current.thread, msg('mentor', 'I re-read the page and the passage I asked about has changed — marking this as addressed. (Simulated re-check.)')] })
    else save(active, current, { thread: [...current.thread, msg('mentor', current.quote ? 'I re-read the page and still see the same passage. Could you tell me here what it is based on?' : 'I re-read the page (simulated). Tell me in your own words how it addresses the question.')] })
  }
  const finish = () => active && upsertSession({ ...active, endedAt: now() })
  const resume = () => active && upsertSession({ ...active, endedAt: undefined })

  return (
    <div className="page-wrap">
      <header className="page-head row wrap" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div><p className="eyebrow">AI Mentor</p><h1>Practise explaining your decisions</h1>
          <p className="muted" style={{ maxWidth: '62ch', marginTop: 6 }}>An interactive viva-preparation conversation about <i>your</i> project. The Mentor reads what you wrote, asks one question at a time, and records the gaps it finds.</p></div>
        <AIBadge />
      </header>
      <AIBanner><b>Who can read this.</b> Your assigned faculty can read this conversation, the page discussed, and the gaps identified. This is practice — it does not replace faculty review or the individual viva, and it gives no marks.</AIBanner>

      <div className="mentor-grid">
        <Card>
          {!active && (
            <div className="stack">
              <CardTitle title="Start a session" />
              <div className="field"><label htmlFor="mp">Choose a page to be questioned on</label>
                <select id="mp" className="select" value={pageId} onChange={(e) => { setPageId(+e.target.value); setNote('') }}>{PAGES.map((p) => <option key={p.id} value={p.id}>{pageLabel(p)}</option>)}</select></div>
              {note && <div className="banner banner-warn" role="status">{note}</div>}
              <div className="row wrap"><Button variant="accent" onClick={start}><Play size={16} /> Begin session</Button><span className="hint">Up to {MAX_FOLLOWUPS} follow-ups per question (proposed default — pending faculty confirmation).</span></div>
            </div>
          )}

          {active && (
            <div className="stack">
              <div className="row wrap" style={{ justifyContent: 'space-between' }}>
                <span className="row" style={{ gap: 8 }}><Chip mono>{pageLabel(PAGES[active.pageId])}</Chip><span className="hint">{fmtDate(active.startedAt)}</span></span>
                <Button variant="quiet" size="sm" onClick={() => { setActiveId(null); setNote('') }}>← All sessions</Button>
              </div>
              <div className="progress-pips" aria-label="Questions in this session">
                {active.questions.map((q) => <span key={q.id} className={`pip ${q.status === 'resolved' ? 'done' : q.status === 'gap' ? 'gap' : q === current ? 'on' : ''}`} title={STATUS_TXT[q.status]} />)}
              </div>

              {current ? (
                <>
                  <div className="row wrap" style={{ gap: 8 }}>
                    <IssueChip type={current.type} />
                    <span className="chip">Issue {idx + 1} of {active.questions.length} · follow-up {current.followups} of {MAX_FOLLOWUPS}</span>
                  </div>
                  <div className="chat" aria-live="polite">
                    <div className="msg msg-mentor">
                      {current.quote && <div className="msg-quote">From your page: “{current.quote}”</div>}
                      {current.text}
                      <div className="msg-meta">Mentor · simulated</div>
                    </div>
                    {current.thread.map((m, i) => (
                      <div key={i} className={`msg msg-${m.role}`}>{m.text}<div className="msg-meta" style={m.role === 'student' ? { color: 'inherit', opacity: .7 } : undefined}>{m.role === 'mentor' ? 'Mentor · simulated' : 'You'} · {ago(m.at)}</div></div>
                    ))}
                    <div ref={end} />
                  </div>
                  <div className="composer">
                    <label className="sr-only" htmlFor="ans">Your answer</label>
                    <textarea id="ans" className="textarea" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Answer in your own words — give numbers, reasoning or the source you relied on." onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) reply() }} />
                    <div className="row wrap" style={{ gap: 6 }}>
                      <Button onClick={reply} disabled={!draft.trim()}><Send size={15} /> Send</Button>
                      <Button variant="ghost" size="sm" onClick={revised}><RefreshCw size={14} /> I’ve revised the page</Button>
                      <Button variant="quiet" size="sm" onClick={skip}><SkipForward size={14} /> Skip</Button>
                      <Button variant="quiet" size="sm" onClick={dispute}><Flag size={14} /> Dispute</Button>
                      <Button variant="quiet" size="sm" onClick={finish} style={{ marginLeft: 'auto' }}><Square size={14} /> End session</Button>
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
          {mentor.length === 0 && <Empty title="No sessions yet">Your discussions are saved here so you can see how your answers improve.</Empty>}
          <ul className="history">
            {mentor.map((m) => {
              const open = m.questions.filter((q) => q.status === 'open').length
              return (
                <li key={m.id}><button className={m.id === activeId ? 'on' : ''} onClick={() => { setActiveId(m.id); setNote('') }}>
                  <b>{pageLabel(PAGES[m.pageId])}</b>
                  <span className="muted">{fmtDate(m.startedAt)} · {m.questions.filter((q) => q.status === 'resolved').length}/{m.questions.length} resolved</span>
                  {open > 0 && <Chip tone="ai">{open} unanswered</Chip>}
                </button></li>
              )
            })}
          </ul>
          {openTotal > 0 && <p className="hint" style={{ marginTop: 10 }}>{openTotal} unanswered question{openTotal > 1 ? 's' : ''} across sessions.</p>}
          <div className="divider" />
          <p className="hint row" style={{ gap: 6, alignItems: 'flex-start' }}><Eye size={14} style={{ flex: 'none', marginTop: 2 }} /> Faculty can read these sessions. Real AI is not connected yet — questions and replies here are simulated.</p>
          <p className="hint" style={{ marginTop: 8 }}>Want a quick scan of a page instead? Use the assistant beside each page, or see <Link to="/student/analysis">AI analysis</Link>.</p>
        </Card>
      </div>
    </div>
  )
}

function Summary({ s, ack, setAck, onFinish, onResume }: { s: MentorSession; ack: Record<string, boolean>; setAck: (a: Record<string, boolean>) => void; onFinish: () => void; onResume: () => void }) {
  const by = (st: MentorQuestion['status'][]) => s.questions.filter((q) => st.includes(q.status))
  const openLeft = by(['open'])
  const group = (title: string, qs: MentorQuestion[], tone: 'ok' | 'warn' | undefined) => qs.length > 0 && (
    <div className="stack" style={{ gap: 8 }}>
      <h3 className="display" style={{ fontSize: 17 }}>{title} <Chip tone={tone}>{qs.length}</Chip></h3>
      {qs.map((q) => (
        <label key={q.id} className="sum-item">
          {title !== 'Resolved' && <input type="checkbox" checked={!!ack[q.id]} onChange={(e) => setAck({ ...ack, [q.id]: e.target.checked })} />}
          <span><IssueChip type={q.type} /> <br />{q.text}{title !== 'Resolved' && <><br /><span className="hint">{ack[q.id] ? 'You marked: I will address this.' : 'Tick if you will address this.'}</span></>}</span>
        </label>
      ))}
    </div>
  )
  return (
    <div className="stack">
      <h2 className="display" style={{ fontSize: 22 }}>{s.endedAt ? 'Session summary' : 'All questions covered'}</h2>
      <p className="muted">A record of what was settled and what still needs work. This is not a grade.</p>
      {group('Resolved', by(['resolved']), 'ok')}
      {group('Gaps to address', by(['gap', 'skipped', 'disputed']), 'warn')}
      {group('Unanswered', openLeft, undefined)}
      <div className="row wrap">
        {!s.endedAt && <Button onClick={onFinish}>End session</Button>}
        {s.endedAt && openLeft.length > 0 && <Button variant="accent" onClick={onResume}><Play size={15} /> Continue this session</Button>}
        <Link className="btn btn-ghost" to={`/student/portfolio/${PAGES[s.pageId].slug}`}>Open the page</Link>
      </div>
    </div>
  )
}
