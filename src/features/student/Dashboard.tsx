import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, ClipboardList, FileSearch, GraduationCap, MessageCircleQuestion, Paperclip, PenLine, Sparkles } from 'lucide-react'
import { Bar, Button, Card, CardTitle, Chip, Ring } from '../../design-system'
import { DesignChain } from '../../design-system/DesignChain'
import { AIBadge, InsightCard } from '../../ai/parts'
import { analysePortfolio } from '../../ai/engine'
import { PAGES, pageLabel } from '../../data/pages'
import { REVIEWS, pagesLiveAt, reviewIndex } from '../../data/handbook'
import { ago, nextReviewAfter, overall, pageProgress, stepSummary } from '../../lib/progress'
import { readinessFor } from '../../lib/readiness'
import { useStore } from '../../state/store'
import { useContent, useTeam } from './hooks'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

export function Dashboard() {
  const nav = useNavigate()
  const team = useTeam()
  const c = useContent()
  const { session, stepStates, setStep, lastPage, activity, mentor, dismissedInsights, dismissInsight } = useStore()
  const review = REVIEWS[reviewIndex(team.currentReview)]
  const next = nextReviewAfter(team.currentReview)
  const live = pagesLiveAt(team.currentReview)
  const liveProgress = overall(c, team.currentReview)
  const analysis = analysePortfolio(c, live)
  const insights = analysis.byPage.flatMap((b) => b.insights).filter((i) => !dismissedInsights.includes(i.id))
  const attention = analysis.byPage.filter((b) => b.insights.some((i) => i.type !== 'Missing evidence')).sort((a, b) => a.pct - b.pct)
  const readiness = readinessFor(team.currentReview, c)
  const met = readiness.filter((r) => r.status === 'met').length
  const openQs = mentor.flatMap((m) => m.questions).filter((q) => q.status === 'open')
  const steps = stepSummary(stepStates)
  const resume = PAGES[lastPage ?? 0]
  const rank = ['Possible error', 'Unsupported assumption', 'Needs context', 'Incomplete', 'Missing evidence', 'Open design choice']
  const top = [...insights].sort((a, b) => rank.indexOf(a.type) - rank.indexOf(b.type)).slice(0, 3)

  return (
    <div className="page-wrap">
      <section className="welcome">
        <div>
          <p className="eyebrow">{greeting()}, {session?.name.split(' ')[0]}</p>
          <h1 className="welcome-title">{team.artefact}</h1>
          <p className="muted" style={{ maxWidth: '62ch', marginTop: 8 }}>Theme {team.theme.n} · {team.theme.name}</p>
          <div className="row wrap" style={{ gap: 8, marginTop: 14 }}>
            <Chip tone="accent" mono>{review.label} · {review.name}</Chip>
            <Chip>{team.name}</Chip>
            {session?.mode === 'demo' && <Chip title="Fictional data for presentations">Demo project</Chip>}
          </div>
        </div>
        <div className="welcome-cta">
          <Button variant="accent" size="lg" onClick={() => nav(`/student/portfolio/${resume.slug}`)}><PenLine size={17} /> Continue writing</Button>
          <span className="hint">{lastPage === null ? `Start with ${pageLabel(resume)}` : `Last edited: ${pageLabel(resume)}`}{activity[0] && ` · ${ago(activity[0].at)}`}</span>
        </div>
      </section>

      <div className="grid-2">
        <Card>
          <CardTitle title="Portfolio progress" action={<Link className="btn btn-quiet btn-sm" to="/student/portfolio">Open <ArrowRight size={14} /></Link>} />
          <div className="row" style={{ gap: 22, flexWrap: 'wrap' }}>
            <Ring pct={liveProgress} sub={`for ${review.label}`} />
            <div className="stack grow" style={{ gap: 10, minWidth: 180 }}>
              <div className="stat-line"><b>{live.length}</b> pages expected live by {review.label}</div>
              <div className="stat-line"><b>{PAGES.filter((p) => live.includes(p.id) && pageProgress(p, c).status === 'ready').length}</b> of them complete</div>
              <div className="stat-line"><b>{steps.done}</b> of 16 design steps complete · <b>{steps.doing}</b> in progress</div>
              <p className="hint">Progress measures how much you have written — not how good it is.</p>
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle title={`Preparing for ${review.label}`} icon={<ClipboardList size={18} />} action={<Link className="btn btn-quiet btn-sm" to="/student/submit">Review & submit <ArrowRight size={14} /></Link>} />
          <div className="row" style={{ gap: 10 }}><b className="display" style={{ fontSize: 30 }}>{met}</b><span className="muted">of {readiness.length} checklist items met</span></div>
          <Bar pct={(met / readiness.length) * 100} />
          <ul className="mini-list">
            {readiness.filter((r) => r.status === 'unmet').slice(0, 3).map((r) => (
              <li key={r.id}>{r.page !== undefined ? <Link to={`/student/portfolio/${PAGES[r.page].slug}`}>{r.text}</Link> : r.text}</li>
            ))}
            {readiness.every((r) => r.status !== 'unmet') && <li className="muted">Nothing outstanding that the platform can check. Review the manual items before submitting.</li>}
          </ul>
          <p className="hint">Advisory checklist from the handbook gates — faculty decide whether a gate is cleared. Next: {next.label}.</p>
        </Card>
      </div>

      <Card>
        <CardTitle title="Your engineering design chain" action={<span className="hint">Click a step to set where your team is · ★ added July 2026</span>} />
        <DesignChain states={stepStates} onChange={setStep} />
      </Card>

      <section aria-labelledby="ai-ins">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap' }}>
          <h2 id="ai-ins" className="section-h">What your AI mentor noticed</h2><AIBadge />
        </div>
        <div className="insight-tiles">
          <Link className="itile" to="/student/analysis"><span className="itile-ic"><FileSearch size={18} /></span><b>{attention.length}</b><span>section{attention.length === 1 ? '' : 's'} need attention</span></Link>
          <Link className="itile" to="/student/evidence"><span className="itile-ic"><Paperclip size={18} /></span><b>{analysis.counts['Missing evidence']}</b><span>place{analysis.counts['Missing evidence'] === 1 ? '' : 's'} missing evidence</span></Link>
          <Link className="itile" to="/student/mentor"><span className="itile-ic"><MessageCircleQuestion size={18} /></span><b>{openQs.length}</b><span>unanswered Mentor question{openQs.length === 1 ? '' : 's'}</span></Link>
          <Link className="itile" to="/student/analysis"><span className="itile-ic"><Sparkles size={18} /></span><b>{analysis.counts['Needs context'] + analysis.counts['Unsupported assumption']}</b><span>explanations could be stronger</span></Link>
        </div>
        <div className="grid-3" style={{ marginTop: 14 }}>
          {top.map((i) => <InsightCard key={i.id} i={i} onOpen={() => nav(`/student/portfolio/${PAGES[i.pageId].slug}#${i.sectionId ?? ''}`)} onDismiss={() => dismissInsight(i.id)} />)}
          {top.length === 0 && <p className="muted">Nothing flagged right now. Keep writing — insights appear as you add content.</p>}
        </div>
        <p className="hint" style={{ marginTop: 10 }}>These are simulated previews of how AI guidance will appear. They are advisory, carry no marks, and are separate from faculty evaluation.</p>
      </section>

      <div className="grid-2">
        <Card>
          <CardTitle title={`New at ${review.label}`} icon={<GraduationCap size={18} />} />
          <div className="stack" style={{ gap: 10 }}>
            {review.newPages.map((id) => {
              const p = PAGES[id], pr = pageProgress(p, c)
              return (
                <Link key={id} to={`/student/portfolio/${p.slug}`} className="mini-page">
                  <span className="grow"><b>{pageLabel(p)}</b><Bar pct={pr.pct} /></span><span className="mono muted">{Math.round(pr.pct)}%</span>
                </Link>
              )
            })}
          </div>
        </Card>
        <Card>
          <CardTitle title="Recent activity" />
          <ul className="timeline">
            {activity.slice(0, 6).map((a, i) => <li key={i}><span>{a.text}</span><span className="muted mono">{ago(a.at)}</span></li>)}
            {activity.length === 0 && <li className="muted">Nothing yet — your edits and uploads will appear here.</li>}
          </ul>
        </Card>
      </div>
    </div>
  )
}
