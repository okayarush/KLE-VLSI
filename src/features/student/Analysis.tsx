import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Landmark, Lock, ScanSearch } from 'lucide-react'
import { Bar, Button, Card, CardTitle, Chip, Empty } from '../../design-system'
import { AIBadge, AIBanner, InsightCard } from '../../ai/parts'
import { analysePortfolio } from '../../ai/engine'
import { pageLabel } from '../../data/pages'
import { REVIEWS, pagesLiveAt, reviewIndex } from '../../data/handbook'
import { fmtDate } from '../../lib/progress'
import { useStore } from '../../state/store'
import { useContent, useTeam } from './hooks'

type Tab = 'overview' | 'sections' | 'inconsistencies' | 'evidence'

export function Analysis() {
  const team = useTeam()
  const c = useContent()
  const submission = useStore((s) => s.submission)
  const [preview, setPreview] = useState(false)
  const [tab, setTab] = useState<Tab>('overview')
  const [flagged, setFlagged] = useState<string[]>([])
  const submitted = submission.status === 'submitted'
  const rid = submitted ? (submission.reviewId as typeof team.currentReview) : team.currentReview
  const review = REVIEWS[reviewIndex(rid)]
  const a = useMemo(() => analysePortfolio(c, pagesLiveAt(rid)), [c, rid])

  if (!submitted && !preview)
    return (
      <div className="page-wrap">
        <header className="page-head"><p className="eyebrow">AI analysis</p><h1>Portfolio analysis</h1></header>
        <Card className="locked">
          <Lock size={26} />
          <h2>Available after you submit</h2>
          <p className="muted" style={{ maxWidth: '54ch' }}>When you submit for {review.label}, the AI reads what you submitted and reports overall insights, section-by-section findings, missing information, technical inconsistencies, weak justifications and missing evidence. It never gives marks.</p>
          <div className="row wrap" style={{ gap: 10, justifyContent: 'center' }}>
            <Link className="btn btn-accent" to="/student/submit">Go to review & submit</Link>
            <Button variant="ghost" onClick={() => setPreview(true)}>Preview on my current draft</Button>
          </div>
        </Card>
      </div>
    )

  const total = Object.values(a.counts).reduce((x, y) => x + y, 0)
  const toggleFlag = (id: string) => setFlagged((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]))
  const render = (list: typeof a.overall) => list.map((i) => (
    <div key={i.id} className="stack" style={{ gap: 4 }}>
      <InsightCard i={i} />
      <button className="btn btn-quiet btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => toggleFlag(i.id)}>{flagged.includes(i.id) ? '✓ Flagged as inaccurate — thanks' : 'This looks wrong'}</button>
    </div>
  ))

  return (
    <div className="page-wrap">
      <header className="page-head row wrap" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <p className="eyebrow">AI analysis · {review.label} · {submitted ? `generated ${fmtDate(submission.at)}` : 'draft preview'}</p>
          <h1>Portfolio analysis</h1>
        </div>
        <AIBadge />
      </header>
      <AIBanner><b>This is AI insight, not an evaluation.</b> It carries no marks and is not a grade. Official feedback and assessment come only from your faculty — see <Link to="/student/feedback">Feedback</Link>. The analysis can be wrong; use “This looks wrong” and discuss it with your mentor.</AIBanner>
      {!submitted && <div className="banner banner-warn"><Lock size={18} /><div>You are previewing the analysis on your <b>current draft</b>. After you submit, this page shows the analysis of what you submitted.</div></div>}

      <div className="tabs" role="tablist" style={{ alignSelf: 'flex-start' }}>
        {([['overview', 'Overview'], ['sections', 'By section'], ['inconsistencies', `Inconsistencies (${a.inconsistencies.length})`], ['evidence', `Missing evidence (${a.missingEvidence.length})`]] as [Tab, string][]).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className="tab" onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid-main">
          <div className="stack">
            <Card>
              <CardTitle title="What the AI looked at" />
              <div className="stat-grid">
                <div className="stat"><b>{a.byPage.length}</b><span>pages read</span></div>
                <div className="stat"><b>{total}</b><span>findings in total</span></div>
                {(Object.entries(a.counts) as [string, number][]).filter(([, n]) => n > 0).map(([k, n]) => <div className="stat" key={k}><b>{n}</b><span>{k.toLowerCase()}</span></div>)}
              </div>
              <p className="hint" style={{ marginTop: 10 }}>Counts describe things to look at — not quality, and not a score.</p>
            </Card>
            <section><h2 className="section-h" style={{ marginBottom: 10 }}>Most important to look at first</h2>
              <div className="stack">{a.overall.length ? render(a.overall) : <Empty title="No standout issues">The checks that run today found no errors or unsupported assumptions. A reviewer may still probe deeper — try the Mentor.</Empty>}</div></section>
          </div>
          <div className="stack">
            <Card>
              <CardTitle title="Improvement opportunities" />
              <ul className="mini-list">{a.improvements.map((t) => <li key={t}>{t}</li>)}</ul>
            </Card>
            <Card className="faculty-box">
              <CardTitle title="Official evaluation" icon={<Landmark size={18} />} />
              <p className="muted">Faculty evaluation is separate from this analysis and appears under Feedback once your faculty have reviewed your submission.</p>
              <Link className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} to="/student/feedback">Go to Feedback</Link>
            </Card>
          </div>
        </div>
      )}

      {tab === 'sections' && (
        <div className="stack" style={{ gap: 14 }}>
          {a.byPage.map(({ page, pct, insights }) => (
            <Card key={page.id}>
              <CardTitle title={pageLabel(page)} action={<Link className="btn btn-quiet btn-sm" to={`/student/portfolio/${page.slug}`}>Open page</Link>} />
              <div className="row" style={{ gap: 12, marginBottom: 12 }}><div className="grow"><Bar pct={pct} /></div><span className="mono muted">{Math.round(pct)}% written</span></div>
              {insights.length === 0 ? <p className="muted"><ScanSearch size={14} style={{ verticalAlign: -2 }} /> Nothing flagged by today’s checks.</p> : <div className="grid-3">{render(insights)}</div>}
            </Card>
          ))}
        </div>
      )}

      {tab === 'inconsistencies' && (
        a.inconsistencies.length ? <div className="grid-3">{render(a.inconsistencies)}</div>
          : <Empty title="No cross-page inconsistencies found">The AI compares what pages say about each other (for example, FR references against the FR table). None found in the pages checked today.</Empty>
      )}
      {tab === 'evidence' && (
        a.missingEvidence.length ? <div className="grid-3">{render(a.missingEvidence)}</div>
          : <Empty title="No missing evidence flagged">Every section that expects evidence has some attached.</Empty>
      )}
      <p className="hint"><Chip mono>Simulated</Chip> Real AI is not connected. These findings come from simple rule checks that stand in for it so the experience can be designed.</p>
    </div>
  )
}
