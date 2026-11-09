import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Paperclip, Plus, Trash2 } from 'lucide-react'
import { Button, Card, CardTitle, Empty } from '../../design-system'
import { InsightCard } from '../../ai/parts'
import { insightsForPage } from '../../ai/engine'
import { PAGES, pageLabel } from '../../data/pages'
import { pagesLiveAt } from '../../data/handbook'
import { useStore } from '../../state/store'
import { useContent, useTeam } from './hooks'
import { AttachDialog } from './AttachDialog'
import { EvidenceFigure } from './portfolio/Sections'

export function EvidenceLibrary() {
  const c = useContent()
  const team = useTeam()
  const { updateEvidence, removeEvidence } = useStore()
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState(-1)
  const list = c.evidence.filter((e) => filter < 0 || e.pageId === filter)
  const missing = useMemo(() => pagesLiveAt(team.currentReview).flatMap((id) => insightsForPage(PAGES[id], c)).filter((i) => i.type === 'Missing evidence'), [c, team.currentReview])

  return (
    <div className="page-wrap">
      <header className="page-head row wrap" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div><p className="eyebrow">Evidence</p><h1>Everything that backs up your reasoning</h1>
          <p className="muted" style={{ maxWidth: '62ch', marginTop: 6 }}>Evidence works best beside the step it supports. Attach it from the page you are writing — or add it here and choose where it belongs. Every item needs a caption.</p></div>
        <Button variant="accent" onClick={() => setOpen(true)}><Plus size={16} /> Add evidence</Button>
      </header>

      <div className="grid-main">
        <div className="stack">
          <div className="row wrap">
            <label className="sr-only" htmlFor="evf">Filter by page</label>
            <select id="evf" className="select" style={{ maxWidth: 320 }} value={filter} onChange={(e) => setFilter(+e.target.value)}>
              <option value={-1}>All pages ({c.evidence.length})</option>
              {PAGES.map((p) => <option key={p.id} value={p.id}>{pageLabel(p)} ({c.evidence.filter((e) => e.pageId === p.id).length})</option>)}
            </select>
          </div>
          {list.length === 0 ? <Empty title="No evidence here yet" action={<Button onClick={() => setOpen(true)}><Paperclip size={15} /> Add the first item</Button>}>Captures, sketches, datasheet excerpts, photos of the bench — anything a reviewer would need to believe your numbers.</Empty> : (
            <div className="ev-list">
              {list.map((e) => (
                <Card key={e.id}>
                  <EvidenceFigure e={e} />
                  <div className="field" style={{ marginTop: 10 }}>
                    <label htmlFor={`cap-${e.id}`}>Caption</label>
                    <textarea id={`cap-${e.id}`} className="textarea" style={{ minHeight: 60 }} value={e.caption} onChange={(ev) => updateEvidence(e.id, { caption: ev.target.value })} />
                  </div>
                  <div className="row" style={{ justifyContent: 'space-between', marginTop: 10 }}>
                    <Link className="btn btn-quiet btn-sm" to={`/student/portfolio/${PAGES[e.pageId].slug}#${e.sectionId}`}>{pageLabel(PAGES[e.pageId])} →</Link>
                    <button className="icon-btn" aria-label={`Remove ${e.name}`} onClick={() => removeEvidence(e.id)}><Trash2 size={15} /></button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
        <Card>
          <CardTitle title="Where evidence is missing" />
          <div className="stack" style={{ gap: 10 }}>
            {missing.length === 0 && <p className="muted">Every live section that needs evidence has some.</p>}
            {missing.slice(0, 8).map((i) => <InsightCard key={i.id} i={i} compact onOpen={undefined} />)}
          </div>
          <p className="hint" style={{ marginTop: 10 }}>Simulated AI check. Upload limits and the allowed link hosts are pending decisions.</p>
        </Card>
      </div>
      <AttachDialog open={open} onClose={() => setOpen(false)} />
    </div>
  )
}
