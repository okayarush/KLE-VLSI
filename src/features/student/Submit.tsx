import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, Circle, CircleDashed, Info, Send, Sparkles } from 'lucide-react'
import { Bar, Button, Card, CardTitle, Chip, Dialog } from '../../design-system'
import { AIBanner } from '../../ai/parts'
import { analysePortfolio } from '../../ai/engine'
import { PAGES, pageLabel } from '../../data/pages'
import { REVIEWS, pagesLiveAt, reviewIndex, type ReviewId } from '../../data/handbook'
import { fmtDate, pageProgress } from '../../lib/progress'
import { readinessFor } from '../../lib/readiness'
import { useStore } from '../../state/store'
import { useContent, useTeam } from './hooks'

export function Submit() {
  const nav = useNavigate()
  const team = useTeam()
  const c = useContent()
  const { submission, submit, reopen, setSubmitCheck } = useStore()
  const manual = useStore((st) => st.submitChecks)
  const [rid, setRid] = useState<ReviewId>(team.currentReview)
  const [confirm, setConfirm] = useState(false)
  const review = REVIEWS[reviewIndex(rid)]
  const items = readinessFor(rid, c)
  const live = pagesLiveAt(rid)
  const met = items.filter((i) => i.status === 'met' || (i.status === 'manual' && manual[`${rid}.${i.id}`])).length
  const analysis = analysePortfolio(c, live)
  const findings = analysis.byPage.reduce((n, b) => n + b.insights.length, 0)
  const submitted = submission.status === 'submitted'

  return (
    <div className="page-wrap">
      <header className="page-head">
        <p className="eyebrow">Review & submit</p>
        <h1>Prepare for {review.label}</h1>
        <p className="muted" style={{ maxWidth: '64ch' }}>{review.name}. Check what the handbook expects, then submit when you are ready. You will be able to see AI insights on what you submitted — separate from your faculty’s evaluation.</p>
      </header>

      {submitted && (
        <div className="banner" style={{ background: 'var(--ok-soft)', borderColor: 'transparent' }}>
          <CheckCircle2 size={20} style={{ color: 'var(--ok)' }} />
          <div className="grow"><b>Submitted for {REVIEWS.find((r) => r.id === submission.reviewId)?.label} on {fmtDate(submission.at)}.</b> Faculty review is next. Your AI analysis is ready, and feedback will appear under Feedback.
            <div className="row wrap" style={{ gap: 8, marginTop: 10 }}>
              <Link className="btn btn-primary btn-sm" to="/student/analysis">View AI analysis</Link>
              <Link className="btn btn-ghost btn-sm" to="/student/feedback">Feedback</Link>
              <button className="btn btn-quiet btn-sm" onClick={reopen}>Re-open for editing</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid-main">
        <div className="stack">
          <Card>
            <CardTitle title="Review checklist" action={
              <select className="select" style={{ width: 'auto' }} value={rid} onChange={(e) => setRid(e.target.value as ReviewId)} aria-label="Review stage">
                {REVIEWS.map((r) => <option key={r.id} value={r.id}>{r.label} — {r.name}</option>)}
              </select>} />
            <div className="banner banner-info" style={{ marginBottom: 14 }}><Info size={18} /><div>This checklist <b>highlights and records</b> — it does not block you. Whether a gate is cleared is decided by faculty. Wording follows the handbook; manual items are yours to confirm.</div></div>
            <div className="row" style={{ gap: 12, marginBottom: 12 }}><div className="grow"><Bar pct={(met / items.length) * 100} /></div><span className="mono muted">{met}/{items.length}</span></div>
            <ul className="checklist">
              {items.map((i) => {
                const isManual = i.status === 'manual'
                const on = i.status === 'met' || (isManual && manual[`${rid}.${i.id}`])
                return (
                  <li key={i.id} className={on ? 'met' : ''}>
                    {isManual ? (
                      <button className="check-btn" role="checkbox" aria-checked={!!on} aria-label={`Confirm: ${i.text}`} onClick={() => setSubmitCheck(rid, i.id, !on)}>{on ? <CheckCircle2 size={20} /> : <CircleDashed size={20} />}</button>
                    ) : <span className="check-btn" aria-hidden="true">{on ? <CheckCircle2 size={20} /> : <Circle size={20} />}</span>}
                    <span className="grow">
                      {i.page !== undefined ? <Link to={`/student/portfolio/${PAGES[i.page].slug}`}>{i.text}</Link> : i.text}
                      <br /><span className="hint">{i.cite} · {isManual ? 'confirmed by you' : on ? 'met' : 'not yet met'}</span>
                    </span>
                    {i.page !== undefined && <Chip mono>{i.page === 0 ? 'Home' : `P${i.page}`}</Chip>}
                  </li>
                )
              })}
            </ul>
          </Card>

          <Card>
            <CardTitle title={`Pages expected live by ${review.label}`} />
            <div className="stack" style={{ gap: 10 }}>
              {live.map((id) => {
                const pr = pageProgress(PAGES[id], c)
                return <Link key={id} to={`/student/portfolio/${PAGES[id].slug}`} className="mini-page"><span className="grow"><b>{pageLabel(PAGES[id])}</b><Bar pct={pr.pct} /></span><span className="mono muted">{Math.round(pr.pct)}%</span></Link>
              })}
            </div>
          </Card>
        </div>

        <div className="stack">
          <Card className="ai-card">
            <CardTitle title="AI pre-check" icon={<Sparkles size={18} />} />
            <AIBanner />
            <p style={{ marginTop: 12 }}><b className="display" style={{ fontSize: 28 }}>{findings}</b> <span className="muted">things the AI would look at in what you have written so far.</span></p>
            <Link className="btn btn-ai btn-sm" style={{ marginTop: 10 }} to="/student/analysis">Preview analysis</Link>
          </Card>
          <Card>
            <CardTitle title="Submit" />
            <p className="muted" style={{ marginBottom: 12 }}>Submitting records your current portfolio as the version for {review.label}. You can keep working afterwards; later edits are dated separately.</p>
            <Button size="lg" variant="accent" style={{ width: '100%' }} disabled={submitted && submission.reviewId === rid} onClick={() => setConfirm(true)}><Send size={17} /> {submitted && submission.reviewId === rid ? 'Already submitted' : `Submit for ${review.label}`}</Button>
          </Card>
        </div>
      </div>

      <Dialog open={confirm} onClose={() => setConfirm(false)} title={`Submit for ${review.label}?`}
        actions={<><Button variant="ghost" onClick={() => setConfirm(false)}>Not yet</Button><Button variant="accent" onClick={() => { submit(rid); setConfirm(false); nav('/student/analysis') }}><Send size={16} /> Submit</Button></>}>
        <p>{items.length - met > 0 ? `${items.length - met} checklist item${items.length - met > 1 ? 's are' : ' is'} not marked as met. You can still submit — faculty decide whether a gate is cleared.` : 'Every checklist item is met or confirmed.'}</p>
        <p className="muted">After submitting, you’ll see an AI analysis of what you submitted. It is advisory and carries no marks.</p>
      </Dialog>
    </div>
  )
}
