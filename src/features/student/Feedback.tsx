import { Link } from 'react-router-dom'
import { Hourglass, Landmark, Sparkles } from 'lucide-react'
import { Card, CardTitle, Chip, Empty } from '../../design-system'
import { Lockup } from '../../brand/BrandMark'
import { AIBadge } from '../../ai/parts'
import { analysePortfolio } from '../../ai/engine'
import { REVIEWS, pagesLiveAt } from '../../data/handbook'
import { fmtDate } from '../../lib/progress'
import { useStore } from '../../state/store'
import { useContent } from './hooks'

/** Faculty feedback and AI insight live side by side but are deliberately styled and labelled as different things. */
export function Feedback() {
  const c = useContent()
  const submission = useStore((s) => s.submission)
  const official = useStore((s) => s.facultyReviews)
  const submitted = submission.status === 'submitted'
  const review = submitted ? REVIEWS.find((r) => r.id === submission.reviewId) : undefined
  const a = submitted ? analysePortfolio(c, pagesLiveAt(review!.id)) : undefined
  const n = a ? Object.values(a.counts).reduce((x, y) => x + y, 0) : 0

  return (
    <div className="page-wrap">
      <header className="page-head"><p className="eyebrow">Feedback</p><h1>What your reviewers and your AI mentor said</h1>
        <p className="muted" style={{ maxWidth: '64ch' }}>Two different things, kept apart on purpose: official feedback from your faculty, and advisory insight from the AI.</p></header>

      <div className="grid-2">
        <Card className="faculty-box">
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
            <span className="row" style={{ gap: 8 }}><Landmark size={18} /><b className="display" style={{ fontSize: 18 }}>Faculty feedback</b></span>
            <Chip tone="info">Official</Chip>
          </div>
          {official.length > 0 ? (
            <div className="stack-sm">
              {official.map((fr) => (
                <article key={fr.id}>
                  <b>{REVIEWS.find((r) => r.id === fr.reviewId)?.label ?? fr.reviewId}</b> <span className="muted">· released {fmtDate(fr.releasedAt)}</span>
                  {fr.summary && <p style={{ marginTop: 6 }}>{fr.summary}</p>}
                  <ul className="mini-list">{fr.observations.map((o, i) => <li key={i}>{o.text}</li>)}</ul>
                </article>
              ))}
              <p className="hint">Official and read-only. Record your response on Page 12 — Review Record.</p>
            </div>
          ) : submitted ? (
            <Empty title={`Awaiting faculty review of ${review!.label}`}>Submitted {fmtDate(submission.at)}. After the review, observations appear here word for word and read-only. You record your response on Page 12 — Review Record.</Empty>
          ) : (
            <Empty title="Nothing to show yet" action={<Link className="btn btn-primary btn-sm" to="/student/submit">Go to review & submit</Link>}>Faculty observations appear here after a review. They are quoted verbatim and cannot be edited.</Empty>
          )}
          <div style={{ marginTop: 14 }}><Lockup compact /></div>
        </Card>

        <Card className="ai-card">
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
            <span className="row" style={{ gap: 8 }}><Sparkles size={18} style={{ color: 'var(--ai)' }} /><b className="display" style={{ fontSize: 18 }}>AI insights</b></span>
            <AIBadge />
          </div>
          {submitted ? (
            <>
              <p><b className="display" style={{ fontSize: 28 }}>{n}</b> <span className="muted">things to look at in your {review!.label} submission.</span></p>
              <p className="hint" style={{ margin: '8px 0 12px' }}>Advisory only. No marks, no grade, not an evaluation.</p>
              <Link className="btn btn-ai btn-sm" to="/student/analysis">Open AI analysis</Link>
            </>
          ) : (
            <Empty title="Submit to unlock"><Hourglass size={14} style={{ verticalAlign: -2 }} /> The full analysis runs on what you submit. Meanwhile, the assistant beside each page and the Mentor are always available.</Empty>
          )}
        </Card>
      </div>

      <Card>
        <CardTitle title="Where each kind of feedback lives" />
        <ul className="mini-list">
          <li><b>Faculty feedback</b> — official, quoted verbatim, read-only. Respond on Page 12.</li>
          <li><b>AI analysis</b> — advisory, can be wrong, never contains marks. Dispute anything that looks off.</li>
          <li><b>AI Mentor</b> — a practice conversation about your own project; faculty can read it, and it does not replace the viva.</li>
        </ul>
      </Card>
    </div>
  )
}
