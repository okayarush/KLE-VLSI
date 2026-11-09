import { Link } from 'react-router-dom'
import { Crown, UserRound } from 'lucide-react'
import { Card, CardTitle, Chip } from '../../design-system'
import { INSTITUTION, REVIEWS, reviewIndex } from '../../data/handbook'
import { PAGES } from '../../data/pages'
import { useStore } from '../../state/store'
import { useTeam } from './hooks'

export function TeamWorkspace() {
  const team = useTeam()
  const stepStates = useStore((s) => s.stepStates)
  const session = useStore((s) => s.session)
  const cur = reviewIndex(team.currentReview)
  return (
    <div className="page-wrap">
      <header className="page-head">
        <p className="eyebrow">My team</p>
        <h1>{team.name}</h1>
        <p className="muted">{INSTITUTION.year} · {INSTITUTION.department}</p>
      </header>

      <Card className="theme-card">
        <div className="row wrap" style={{ gap: 8 }}><Chip tone="accent" mono>Theme {team.theme.n}</Chip>{team.isDemo && <Chip title="Fictional data for presentations">Demo project</Chip>}</div>
        <h2 className="theme-name">{team.theme.name}</h2>
        <p className="muted subtitle">{team.theme.subtitle}</p>
        <div className="divider" />
        <p className="eyebrow">Assigned engineering artefact</p>
        <h3 className="display" style={{ fontSize: 24, marginTop: 6 }}>{team.artefact}</h3>
        <p className="hint" style={{ marginTop: 6 }}>Every artefact carries its theme’s academic subtitle. Theme and artefact were chosen when your team was created; your coordinator confirms them at Review 1.</p>
      </Card>

      <div className="grid-2">
        <Card>
          <CardTitle title="Members and owned subsystems" />
          <ul className="members">
            {team.members.map((m) => (
              <li key={m.id}>
                <span className="avatar sm" aria-hidden="true">{m.name[0]}</span>
                <span className="grow"><b>{m.name}</b>{(m.id === 'm1' || m.id === session?.userId) && <span className="muted"> (you)</span>}<br /><span className="muted">{m.subsystem || 'Subsystem not set — add it on Page 1'}</span></span>
                {m.role && <Chip tone="accent"><Crown size={12} /> {m.role}</Chip>}
              </li>
            ))}
          </ul>
          <p className="hint" style={{ marginTop: 10 }}>The Portfolio Lead role rotates. You edit your own subsystem sections; the team shares the rest.</p>
        </Card>
        <Card>
          <CardTitle title="Mentor" icon={<UserRound size={18} />} />
          <p><b>{team.mentor ?? 'Not assigned yet'}</b></p>
          <p className="muted" style={{ marginTop: 6 }}>{team.mentor ? 'Your mentor can read this portfolio. Official evaluation happens at each review, by faculty.' : 'A faculty mentor will be assigned by your coordinator. Official evaluation happens at each review, by faculty.'}</p>
          <div className="divider" />
          <p className="eyebrow">Design chain</p>
          <p style={{ marginTop: 6 }}>{Object.values(stepStates).filter((s) => s === 'done').length} of 16 steps complete · {Object.values(stepStates).filter((s) => s === 'doing').length} in progress</p>
        </Card>
      </div>

      <Card>
        <CardTitle title="Review timeline" action={<span className="hint">Pages shown are those that go live at each review. Dates are set by your coordinator.</span>} />
        <ol className="rtimeline">
          {REVIEWS.map((r, i) => (
            <li key={r.id} className={i < cur ? 'past' : i === cur ? 'now' : ''}>
              <span className="rt-dot" />
              <b>{r.label}</b>
              <span className="rt-name">{r.name}</span>
              <span className="rt-pages">{r.newPages.map((id) => <Link key={id} to={`/student/portfolio/${PAGES[id].slug}`} className="chip chip-mono">{id === 0 ? 'Home' : `P${id}`}</Link>)}</span>
              <span className="hint">{r.evidence}</span>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  )
}
