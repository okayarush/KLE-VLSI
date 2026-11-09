import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bar, Card, CardTitle, Chip } from '../../design-system'
import { DesignChain } from '../../design-system/DesignChain'
import { PAGES } from '../../data/pages'
import { firstReviewOf, pagesLiveAt } from '../../data/handbook'
import { STATUS_LABEL, overall, pageProgress } from '../../lib/progress'
import { useStore } from '../../state/store'
import { useContent, useTeam } from './hooks'

export function PortfolioOverview() {
  const team = useTeam()
  const c = useContent()
  const { stepStates, setStep } = useStore()
  const live = pagesLiveAt(team.currentReview)
  const [tab, setTab] = useState<'all' | 'live' | 'later'>('all')
  const list = PAGES.filter((p) => tab === 'all' || (tab === 'live') === live.includes(p.id))
  const tone = { none: undefined, progress: 'warn', ready: 'ok' } as const

  return (
    <div className="page-wrap">
      <header className="page-head">
        <p className="eyebrow">Portfolio</p>
        <h1>Home and fifteen pages</h1>
        <p className="muted" style={{ maxWidth: '64ch' }}>Your portfolio is one shared, dated record. Pages are released review by review, but you can start any page early — nothing is locked.</p>
      </header>

      <Card>
        <CardTitle title="Design chain" action={<span className="hint">Overall {Math.round(overall(c))}% written</span>} />
        <DesignChain states={stepStates} onChange={setStep} />
      </Card>

      <div className="row wrap" style={{ justifyContent: 'space-between' }}>
        <div className="tabs" role="tablist">
          {([['all', 'All 16'], ['live', `Live at ${team.currentReview === 'FINAL' ? 'Final' : team.currentReview}`], ['later', 'Later']] as const).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} className="tab" onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
      </div>

      <div className="page-cards">
        {list.map((p, i) => {
          const pr = pageProgress(p, c)
          const isLive = live.includes(p.id)
          const first = firstReviewOf(p.id)
          return (
            <motion.div key={p.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.025 }}>
              <Link to={`/student/portfolio/${p.slug}`} className={`pcard ${isLive ? '' : 'later'}`}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="mono pno">{p.id === 0 ? 'HOME' : `PAGE ${String(p.id).padStart(2, '0')}`}</span>
                  <Chip tone={tone[pr.status]}>{STATUS_LABEL[pr.status]}</Chip>
                </div>
                <h3>{p.title}</h3>
                <p className="muted">{p.tagline}</p>
                <Bar pct={pr.pct} />
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="chip chip-mono">{first.id === team.currentReview ? `New · ${first.label}` : `Due ${p.due}`}</span>
                  <span className="mono muted">{Math.round(pr.pct)}%</span>
                </div>
              </Link>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
