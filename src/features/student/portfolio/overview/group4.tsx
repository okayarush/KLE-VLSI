import { Link } from 'react-router-dom'
import { Activity, ArrowRight, BookOpen, CheckCircle2, Circle, CircuitBoard, ExternalLink, FileText, FolderGit2, Link2, Lock, Play, Quote } from 'lucide-react'
import { fmtDate } from '../../../../lib/progress'
import { PAGES } from '../../../../data/pages'
import { REVIEWS, reviewIndex } from '../../../../data/handbook'
import { useTeam } from '../../hooks'
import { useStore } from '../../../../state/store'
import { PosterMiniature } from './art'
import { Avatar, Blank, Evidences, FrRef, OvSection, Tag, filled, frSetOf, norm, proseOf, rowsOf, sentences, type OvProps } from './kit'
import { EvidenceFigure } from '../Sections'

/* ------------------------------------------------------------------ 12 Review Record */
export function ReviewOv({ page, c, edit }: OvProps) {
  const team = useTeam()
  const cur = reviewIndex(team.currentReview)
  const summary = proseOf(c, 12, 'summary')
  const resp = rowsOf(c, 12, 'responses')
  const official = useStore((st) => st.facultyReviews)
  const pageFor = (t = '') => { const m = t.match(/page\s+(\d+)/i); return m ? PAGES[Number(m[1])] : undefined }
  return (
    <div className="ov">
      {page.note && <div className="freeze"><span className="fz-ic"><Lock size={18} /></span><div><b>Official faculty observations are read-only</b><p>{page.note}</p></div></div>}
      <div className="rv">
        <ol className="rv-rail" aria-label="Reviews">
          {REVIEWS.map((r, i) => <li key={r.id} className={i < cur ? 'past' : i === cur ? 'now' : ''}><i className="dot" /><b>{r.label}</b><small>{r.name}</small></li>)}
        </ol>
        <div className="ov">
          <OvSection no="12.1" title="Review summary" sub="Your own summary of the review, in a few lines." onEdit={() => edit('summary')}>
            {summary ? <figure className="note"><Quote size={20} /><blockquote>{summary}</blockquote></figure> : <Blank title="No summary yet" cta="Write the summary" onClick={() => edit('summary')} />}
          </OvSection>
          <OvSection no="12.2" title="Official faculty observations" sub="Written by your reviewers and released to you. You can read them but not edit them." aside={<Tag tone="maroon"><Lock size={11} /> Read-only</Tag>}>
            {official.length ? (
              <div className="stack-sm">
                {official.map((fr) => (
                  <article key={fr.id} className="devi" style={{ alignItems: 'flex-start' }}>
                    <Lock size={16} />
                    <div>
                      <b>{REVIEWS.find((r) => r.id === fr.reviewId)?.label ?? fr.reviewId} <Tag mono>{fmtDate(fr.releasedAt)}</Tag></b>
                      {fr.summary && <p>{fr.summary}</p>}
                      <ul className="bullets dot">{fr.observations.map((o, i) => <li key={i}>{o.text}{o.page_no !== undefined && <> <Tag mono>Page {o.page_no}</Tag></>}</li>)}</ul>
                    </div>
                  </article>
                ))}
              </div>
            ) : <Blank title="No faculty observations released yet" text="After a review, your faculty panel’s official observations appear here. Until then there is nothing to respond to." compact />}
          </OvSection>
          <OvSection no="12.3" title="Your team’s responses" sub="Quote each observation, then record your response and the page you changed." onEdit={() => edit('responses')}>
            {resp.length ? (
              <div className="conv">
                <div className="conv-h"><span>Observation (quoted by your team)</span><span>Team response</span></div>
                {resp.map((r) => { const pg = pageFor(r.v.changed); return (
                  <div key={r.id} className="conv-r">
                    <blockquote className="obs">{r.v.observation}</blockquote>
                    <div className="rsp"><p>{r.v.response}</p>{filled(r.v.changed) && (pg ? <Link className="plink" to={`/student/portfolio/${pg.slug}`}>Changed: {r.v.changed} <ArrowRight size={12} /></Link> : <Tag mono>Changed: {r.v.changed}</Tag>)}</div>
                  </div>) })}
              </div>
            ) : <Blank title="No observations responded to yet" text="After a review, quote each observation and record what you did about it." cta="Add a response" onClick={() => edit('responses')} />}
          </OvSection>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ 13 Reflections and Forward Links */
export function ReflectOv({ c, edit }: OvProps) {
  const refl = rowsOf(c, 13, 'reflect')
  const fwd = rowsOf(c, 13, 'forward')
  const lessons = proseOf(c, 13, 'lessons')
  return (
    <div className="ov">
      <OvSection no="13.1" title="Individual reflections" sub="Each member, after every review — in their own words." onEdit={() => edit('reflect')}>
        {refl.length ? (
          <div className="rgrid">
            {refl.map((r) => (
              <article key={r.id} className="refl">
                <Quote size={26} className="qm" />
                <p>{r.v.text}</p>
                <footer><Avatar name={r.v.member} size={32} /><b>{r.v.member}</b>{r.v.review && <Tag mono>{r.v.review}</Tag>}</footer>
              </article>
            ))}
          </div>
        ) : <Blank title="No reflections yet" text="Reflections are private-by-default and finalised at the Final Review." cta="Add a reflection" onClick={() => edit('reflect')} />}
      </OvSection>
      <div className="two">
        <OvSection no="13.2" title="Lessons for the next cohort" onEdit={() => edit('lessons')}>
          {lessons ? <div className="lesson">{sentences(lessons).map((s, i) => <p key={i}>{s}</p>)}</div> : <Blank compact title="Not written yet" cta="Write the lessons" onClick={() => edit('lessons')} />}
        </OvSection>
        <OvSection no="13.3" title="Forward links" sub="Later courses or the Minor Project this work prepares for." onEdit={() => edit('forward')}>
          {fwd.length ? <ul className="fwd">{fwd.map((f) => <li key={f.id}><span className="fn-node"><BookOpen size={14} />{f.v.course}</span><ArrowRight size={16} /><p>{f.v.how}</p></li>)}</ul> : <Blank compact title="None yet" text="Add one if it applies." cta="Add a link" onClick={() => edit('forward')} />}
        </OvSection>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ 14 Final Demonstration */
export function DemoOv({ c, edit }: OvProps) {
  const team = useTeam()
  const video = c.evidence.filter((e) => e.pageId === 14 && e.sectionId === 'video')
  const poster = c.evidence.filter((e) => e.pageId === 14 && e.sectionId === 'poster')
  const walk = proseOf(c, 14, 'walk')
  const frTable = rowsOf(c, 4, 'frtable')
  const frs = frSetOf(c)
  const lines = walk.split(/\n+/).map((l) => l.trim()).filter(Boolean).map((l) => {
    const m = l.match(/^(FR-?\s?\d+)\s*[—–:-]\s*(\d{1,2}:\d{2})?\s*(.*)$/i)
    return m ? { fr: m[1].replace(/\s/g, ''), time: m[2], text: m[3] } : { fr: '', time: '', text: l }
  })
  const covered = new Set(lines.map((l) => norm(l.fr)))
  return (
    <div className="ov">
      <div className="media">
        <OvSection no="14.1" title="Demo video" sub="3–5 minutes — a walkthrough of every functional requirement." onEdit={() => edit('video')} editLabel="Attach video">
          {video.length ? <div className="frame">{video.map((e) => <EvidenceFigure key={e.id} e={e} />)}</div> : (
            <button className="frame empty" onClick={() => edit('video')}><span className="playb"><Play size={28} fill="currentColor" /></span><b>No demo video attached yet</b><small>Upload your 3–5 minute walkthrough</small></button>
          )}
        </OvSection>
        <OvSection no="14.2" title="Summary poster" sub="One-page A1 technical poster." onEdit={() => edit('poster')} editLabel="Attach poster">
          {poster.length ? <div className="frame tall">{poster.map((e) => <EvidenceFigure key={e.id} e={e} />)}</div> : (
            <div>
              <PosterMiniature data={{
                team: team.name, artefact: team.artefact, themeLine: `Theme ${team.theme.n}: ${team.theme.name}`,
                need: proseOf(c, 2, 'need'), frs: frTable.map((r) => ({ no: r.v.no, target: r.v.target })),
                blocks: rowsOf(c, 5, 'blocks').map((r) => r.v.block).filter(Boolean),
                results: rowsOf(c, 9, 'validation').filter((r) => filled(r.v.predicted) || filled(r.v.measured)).map((r) => ({ fr: r.v.fr, predicted: r.v.predicted, measured: r.v.measured })),
                lesson: proseOf(c, 13, 'lessons'),
              }} />
              <p className="hint" style={{ marginTop: 8 }}>This draft updates as you write. Upload your finished poster to replace it.</p>
            </div>
          )}
        </OvSection>
      </div>
      <OvSection no="14.3" title="FR walkthrough" sub="For each FR, the timestamp where the video demonstrates it." onEdit={() => edit('walk')}>
        <div className="two">
          <div>
            {lines.length ? <ol className="wt">{lines.map((l, i) => <li key={i}>{l.time ? <span className="tc mono">{l.time}</span> : <span className="tc none">—</span>}{l.fr && <FrRef no={l.fr} frs={frs} />}<p>{l.text}</p></li>)}</ol> : <Blank title="No walkthrough notes yet" text="e.g. “FR-01 — 0:35 gain steps selected live”." cta="Write the walkthrough" onClick={() => edit('walk')} />}
          </div>
          <div className="cov">
            <b>Requirement coverage</b>
            <ul>{frTable.map((r) => { const ok = covered.has(norm(r.v.no)); return <li key={r.id} className={ok ? 'ok' : ''}>{ok ? <CheckCircle2 size={16} /> : <Circle size={16} />}<Tag mono tone="maroon">{r.v.no}</Tag><span>{ok ? 'demonstrated' : 'not in the walkthrough yet'}</span></li> })}</ul>
            {!frTable.length && <p className="hint">Add requirements on Page 4 to see coverage.</p>}
          </div>
        </div>
        <Evidences c={c} pageId={14} sectionId="walk" />
      </OvSection>
    </div>
  )
}

/* ------------------------------------------------------------------ 15 Project Files */
const KIND_ICON: Record<string, typeof FileText> = { 'Formal report': FileText, 'RTL / firmware repository': FolderGit2, Schematic: CircuitBoard, 'Simulation files': Activity, Other: Link2 }
const REQUIRED = ['Formal report', 'RTL / firmware repository', 'Schematic', 'Simulation files']

export function FilesOv({ page, c, edit }: OvProps) {
  const links = rowsOf(c, 15, 'links')
  const have = new Set(links.map((l) => l.v.kind))
  return (
    <div className="ov">
      {page.note && <div className="freeze soft"><span className="fz-ic"><Link2 size={18} /></span><div><b>Link, don’t copy</b><p>{page.note}</p></div></div>}
      <div className="reqs">{REQUIRED.map((k) => { const Ic = KIND_ICON[k]; return <span key={k} className={have.has(k) ? 'ok' : ''}><Ic size={16} />{k}{have.has(k) ? <CheckCircle2 size={15} /> : <Circle size={15} />}</span> })}</div>
      <OvSection no="15.1" title="Links" sub="Formal report, RTL / firmware repository, schematic and simulation files." onEdit={() => edit('links')}>
        {links.length ? (
          <ul className="files">
            {links.map((l) => {
              const Ic = KIND_ICON[l.v.kind] ?? Link2
              const safe = /^https?:\/\//i.test(l.v.url ?? '')
              return (
                <li key={l.id}>
                  <span className="fi"><Ic size={20} /></span>
                  <div className="fm"><small>{l.v.kind || 'Link'}</small><b>{safe ? <a href={l.v.url} target="_blank" rel="noreferrer noopener">{l.v.title}</a> : l.v.title}</b>{l.v.notes && <span className="muted">{l.v.notes}</span>}</div>
                  <code className="url mono" title={l.v.url}>{l.v.url || 'no URL'}</code>
                  {safe ? <a className="icon-btn" href={l.v.url} target="_blank" rel="noreferrer noopener" aria-label={`Open ${l.v.title}`}><ExternalLink size={16} /></a> : <Tag tone="warn">Needs https://</Tag>}
                </li>
              )
            })}
          </ul>
        ) : <Blank title="No links yet" text="The portfolio links to the formal report; it does not copy it." cta="Add a link" onClick={() => edit('links')} />}
      </OvSection>
    </div>
  )
}
