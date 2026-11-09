import { Link } from 'react-router-dom'
import { ArrowRight, Check, CheckCircle2, Circle, Crown, Mail, MinusCircle, Quote, Camera } from 'lucide-react'
import { DesignChain } from '../../../../design-system/DesignChain'
import { PAGES } from '../../../../data/pages'
import { REVIEWS, reviewIndex } from '../../../../data/handbook'
import { fmtDate, words } from '../../../../lib/progress'
import { readinessFor } from '../../../../lib/readiness'
import { useStore } from '../../../../state/store'
import { useTeam } from '../../hooks'
import { ConceptGlyph, DynamicRangeDiagram, SignalChainBlueprint, SubsystemTopologyDiagram } from './art'
import { Avatar, Blank, Evidences, OvSection, PageLink, Rich, Tag, filled, proseOf, rowsOf, sentences, type OvProps } from './kit'
import { Info, SourceBadge } from '../guide'

/* ------------------------------------------------------------------ Home */
export function HomeOv({ c, edit }: OvProps) {
  const team = useTeam()
  const { stepStates, setStep } = useStore()
  const cur = reviewIndex(team.currentReview)
  const review = REVIEWS[cur]
  const update = proseOf(c, 0, 'update')
  const updated = rowsOf(c, 11, 'entries').map((r) => r.at).sort().pop()
  const readiness = readinessFor(team.currentReview, c)
  const met = readiness.filter((r) => r.status === 'met').length
  const photos = c.evidence.filter((e) => e.pageId === 0 && e.sectionId === 'photo')
  return (
    <div className="ov">
      <div className="hero">
        <div className="hero-main">
          <span className="eyebrow">Theme {team.theme.n} · {team.theme.name}</span>
          <h2>{team.artefact}</h2>
          <p>{team.theme.subtitle}</p>
          <div className="hero-meta">
            <Tag tone="maroon">{review.label} · {review.name}</Tag>
            <Tag>{team.name}</Tag>
            <Tag>{team.mentor ? `Mentor · ${team.mentor}` : 'Mentor not assigned yet'}</Tag>
          </div>
          <div className="faces">{team.members.map((m) => <span key={m.id} className="face"><Avatar name={m.name} size={34} /><span>{m.name.split(' ')[0]}<small>{m.subsystem}</small></span></span>)}</div>
        </div>
        <button className="hero-photo" onClick={() => edit('photo')} aria-label={photos.length ? 'Change team photo' : 'Add a team photo'}>
          {photos.length ? <span className="ph-ok"><Camera size={22} />{photos[0].caption}</span> : <><img src="/images/kle-campus-sketch.png" alt="" /><span className="ph-add"><Camera size={16} /> Add team photo</span></>}
        </button>
      </div>

      <SignalChainBlueprint blocks={rowsOf(c, 5, 'blocks').map((r) => ({ name: r.v.block, fr: r.v.fr }))} themeLabel={`Theme ${team.theme.n} · ${team.theme.name}`} />

      <OvSection no="H.1" title="Engineering design chain" sub="The handbook’s sixteen steps. Set where your team is from the Dashboard or click any step below." >
        <div className="card-flat"><DesignChain states={stepStates} onChange={setStep} /></div>
      </OvSection>

      <div className="two">
        <OvSection no="H.2" title="Latest dated update" onEdit={() => edit('update')}>
          {update ? (
            <figure className="note">
              <Quote size={20} />
              <blockquote><Rich text={update} marks={false} /></blockquote>
              <figcaption><Tag mono>{updated ? fmtDate(updated) : 'Dated when saved'}</Tag><span className="muted">{words(update)} words</span></figcaption>
            </figure>
          ) : <Blank title="No update yet" text="One short paragraph on what changed most recently. It is dated automatically." cta="Write the update" onClick={() => edit('update')} />}
        </OvSection>
        <OvSection no="H.3" title={`Expected for ${review.label}`} aside={<Tag tone={met === readiness.length ? 'ok' : 'warn'}>{met} of {readiness.length} met</Tag>}>
          <ul className="exp">
            {readiness.map((r) => (
              <li key={r.id} className={r.status}>
                {r.status === 'met' ? <CheckCircle2 size={17} /> : r.status === 'manual' ? <MinusCircle size={17} /> : <Circle size={17} />}
                {r.page !== undefined ? <Link to={`/student/portfolio/${PAGES[r.page].slug}`}>{r.text}</Link> : <span>{r.text}</span>}
              </li>
            ))}
          </ul>
          <p className="hint">Advisory — faculty decide whether a gate is cleared.</p>
        </OvSection>
      </div>

      <OvSection no="H.4" title="Review pathway" sub="Pages are released review by review; nothing is locked.">
        <ol className="rpath">
          {REVIEWS.map((r, i) => (
            <li key={r.id} className={i < cur ? 'past' : i === cur ? 'now' : ''}>
              <i className="dot" />
              <b>{r.label}</b><span className="muted">{r.name}</span>
              <div className="chips">{r.newPages.map((id) => <Link key={id} to={`/student/portfolio/${PAGES[id].slug}`} className="tag mono" title={PAGES[id].title}>{id === 0 ? 'Home' : String(id).padStart(2, '0')}</Link>)}</div>
            </li>
          ))}
        </ol>
      </OvSection>
    </div>
  )
}

/* ------------------------------------------------------------------ 1 Team */
export function TeamOv({ c, edit }: OvProps) {
  const team = useTeam()
  const leadName = team.members.find((m) => m.role)?.name?.trim().toLowerCase()
  const members = rowsOf(c, 1, 'members')
  const contrib = rowsOf(c, 1, 'contrib')
  const names = members.length ? members.map((m) => m.v.name) : [...new Set(contrib.map((r) => r.v.member))]
  const reviews = ['Review 1', 'Review 2', 'Review 3', 'Review 4', 'Review 5', 'Final Review']
  const pending = (rv: string) => !contrib.some((r) => r.v.review === rv)
  return (
    <div className="ov">
      <SubsystemTopologyDiagram members={members.map((m) => ({ name: m.v.name, subsystem: m.v.subsystem }))} />

      <OvSection no="1.1" title="Members and owned subsystems" sub="Each member owns a subsystem; the portfolio is one shared record." onEdit={() => edit('members')}>
        {members.length ? (
          <div className="mgrid">
            {members.map((m) => (
              <article key={m.id} className="mcard">
                <Avatar name={m.v.name} size={52} />
                <div>
                  <b>{m.v.name || 'Unnamed member'}{!!leadName && (m.v.name ?? '').trim().toLowerCase() === leadName && <Tag tone="maroon"><Crown size={11} /> Portfolio Lead</Tag>}</b>
                  <span className="own"><small>Owns</small>{m.v.subsystem || <em>subsystem not set</em>}</span>
                  {filled(m.v.contact) ? <a className="mail" href={`mailto:${m.v.contact}`}><Mail size={13} /> {m.v.contact}</a> : <span className="dash">No contact yet</span>}
                </div>
              </article>
            ))}
          </div>
        ) : <Blank title="No members yet" text="Add each member with the subsystem they own." cta="Add members" onClick={() => edit('members')} />}
      </OvSection>

      <OvSection no="1.2" title="Contribution table" sub="Updated at each review: what each member contributed since the last one." onEdit={() => edit('contrib')}>
        {names.length ? (
          <div className="dt-wrap">
            <table className="dt matrix">
              <thead><tr><th style={{ width: 130 }}>Review</th>{names.map((n) => <th key={n}><span className="th-av"><Avatar name={n} size={22} />{n}</span></th>)}</tr></thead>
              <tbody>
                {reviews.map((rv) => (
                  <tr key={rv} className={pending(rv) ? 'later' : ''}>
                    <th scope="row">{rv}</th>
                    {names.map((n) => { const e = contrib.filter((r) => r.v.review === rv && r.v.member === n); return <td key={n}>{e.length ? e.map((x) => <p key={x.id}>{x.v.contribution}</p>) : <span className="dash">—</span>}</td> })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Blank title="Nothing recorded yet" text="Record each member’s contribution after every review." cta="Add a contribution" onClick={() => edit('contrib')} />}
      </OvSection>
    </div>
  )
}

/* ------------------------------------------------------------------ 2 Problem and Need */
export function NeedOv({ c, edit }: OvProps) {
  const need = proseOf(c, 2, 'need')
  const inputs = rowsOf(c, 2, 'inputs')
  const cand = rowsOf(c, 2, 'candfr')
  const bg = proseOf(c, 2, 'background')
  const prov = { measured: 0, datasheet: 0, assumed: 0 } as Record<string, number>
  inputs.forEach((r) => { if (r.v.provenance in prov) prov[r.v.provenance]++ })
  return (
    <div className="ov">
      <DynamicRangeDiagram inputs={inputs.map((r) => ({ parameter: r.v.parameter, value: r.v.value, provenance: r.v.provenance }))} onAdd={() => edit('inputs')} />

      <OvSection no="2.1" title="Need statement" sub="Who needs what, why, and how you know — in measurable terms." onEdit={() => edit('need')}>
        {need ? (
          <figure className="pull">
            <blockquote><Rich text={need} /></blockquote>
            <figcaption><Tag mono>{words(need)} words</Tag><span className="legend"><b className="qty">value + unit</b> quantities</span><span className="legend"><mark className="hedge">assume</mark> unsupported assumption</span></figcaption>
          </figure>
        ) : <Blank title="No need statement yet" text="Say what is wrong today, in measurable terms." cta="Write the need statement" onClick={() => edit('need')} />}
      </OvSection>

      <OvSection no="2.2" title="Quantified design inputs" sub="Numbers that constrain the design — with where each came from." onEdit={() => edit('inputs')}
        aside={inputs.length > 0 && <>
          <SourceBadge kind="calc" info="Counted automatically from the Provenance column below: how many of your numbers were measured, taken from a datasheet, or assumed.">Auto-counted</SourceBadge>
          <div className="provbar" title="Provenance of design inputs">
            {(['measured', 'datasheet', 'assumed'] as const).map((k) => prov[k] > 0 && <span key={k} className={k} style={{ flex: prov[k] }}>{prov[k]} {k}</span>)}
          </div>
        </>}>
        {inputs.length ? (
          <div className="dt-wrap">
            <table className="dt">
              <thead><tr><th>Parameter</th><th>Value and unit</th><th>Provenance<Info text="How you know the number. Measured: you took it on the bench. Datasheet: it comes from a manufacturer's datasheet. Assumed: it is your own estimate, so say what it is based on." label="About Provenance" /></th><th>Source / how obtained</th></tr></thead>
              <tbody>{inputs.map((r) => (
                <tr key={r.id}>
                  <td><b>{r.v.parameter || '—'}</b></td>
                  <td><span className="val mono">{r.v.value || '—'}</span></td>
                  <td>{r.v.provenance ? <Tag tone={r.v.provenance === 'measured' ? 'ok' : r.v.provenance === 'assumed' ? 'warn' : 'info'}>{r.v.provenance}</Tag> : <span className="dash">—</span>}</td>
                  <td>{r.v.source || <span className="dash">{r.v.provenance === 'assumed' ? 'No basis stated' : '—'}</span>}</td>
                </tr>))}</tbody>
            </table>
          </div>
        ) : <Blank title="No design inputs yet" text="Add at least three, each with its provenance." cta="Add design inputs" onClick={() => edit('inputs')} />}
        <Evidences c={c} pageId={2} sectionId="inputs" />
      </OvSection>

      <OvSection no="2.3" title="Background study" sub="What exists, what you read, and what you learned." onEdit={() => edit('background')}>
        {bg ? <ul className="bullets">{sentences(bg).map((s, i) => <li key={i}>{s}</li>)}</ul> : <Blank title="No background study yet" cta="Write the background study" onClick={() => edit('background')} />}
      </OvSection>

      <OvSection no="2.4" title="Three candidate functional requirements" sub="Vague wording is fine to start — then make it measurable." onEdit={() => edit('candfr')}
        aside={cand.length > 0 && <PageLink pageId={4} slug="functional-requirements">Next: formalise them on Page 04</PageLink>}>
        {cand.length ? (
          <div className="frgrid">
            {cand.map((r, i) => (
              <article key={r.id} className={`frc ${filled(r.v.target) ? '' : 'vague'}`}>
                <span className="n">C{i + 1}</span>
                <p>{r.v.statement}</p>
                {filled(r.v.target) ? <div className="tg"><small>Target</small><b className="mono">{r.v.target}</b></div> : <div className="tg warn"><small>Target</small><button type="button" className="linkish" onClick={() => edit('candfr')} title="Add a number with a unit so this requirement can be tested">Not yet quantified — add a target <ArrowRight size={12} /></button></div>}
                <div className="mt"><small>Measured by</small>{r.v.method || <span className="dash">—</span>}</div>
              </article>
            ))}
          </div>
        ) : <Blank title="No candidate requirements yet" cta="Add a candidate FR" onClick={() => edit('candfr')} />}
      </OvSection>
    </div>
  )
}

/* ------------------------------------------------------------------ 3 Concept Choices */
export const matrixTotals = (alts: { id: string }[], crit: ReturnType<typeof rowsOf>) => {
  const wsum = crit.reduce((a, r) => a + (parseFloat(r.v.weight) || 0), 0)
  return alts.map((a) => {
    const t = crit.reduce((s, r) => s + (parseFloat(r.v.weight) || 0) * (parseFloat(r.v[`s:${a.id}`]) || 0), 0)
    return wsum ? t / wsum : 0
  })
}

export function ConceptOv({ c, edit }: OvProps) {
  const alts = rowsOf(c, 3, 'alts')
  const crit = rowsOf(c, 3, 'matrix')
  const selIdx = alts.findIndex((a) => a.v.fate === 'Selected')
  const sel = selIdx >= 0 ? alts[selIdx] : undefined
  const totals = matrixTotals(alts, crit)
  const anyScore = alts.some((a) => crit.some((r) => parseFloat(r.v[`s:${a.id}`]) > 0))
  const letter = (i: number) => String.fromCharCode(65 + i)
  const rationale = proseOf(c, 3, 'selected')
  return (
    <div className="ov">
      <OvSection no="3.1" title="Concept Alternatives" onEdit={() => edit('alts')}>
        {alts.length ? (
          <div className="cgrid">
            {alts.map((a, i) => {
              const isSel = i === selIdx && a.v.fate === 'Selected'
              return (
                <article key={a.id} className={`ccard ${isSel ? 'sel' : ''}`}>
                  <header>
                    <Tag tone={isSel ? 'maroon' : undefined}>Concept {letter(i)}</Tag>
                    {isSel && <span className="ck-badge" aria-label="Selected concept"><Check size={14} strokeWidth={3} /></span>}
                  </header>
                  <h3>{a.v.name || 'Untitled concept'}</h3>
                  <div className="cg"><ConceptGlyph name={a.v.name || ''} index={i} /></div>
                </article>
              )
            })}
          </div>
        ) : <Blank title="No alternatives yet" text="Document at least three, including the ones you rejected." cta="Add a concept" onClick={() => edit('alts')} />}
      </OvSection>

      <div className="split-3">
        <OvSection no="3.2" title="Comparative Evaluation" onEdit={() => edit('compare')}>
          {alts.length && crit.length ? (
            <div className="dt-wrap">
              <table className="dt cmp">
                <thead>
                  <tr>
                    <th>Criteria</th>
                    {alts.map((a, i) => <th key={a.id} className={i === selIdx ? 'sel' : ''}>Concept {letter(i)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {crit.map((r) => (
                    <tr key={r.id}>
                      <td>{r.v.criterion}</td>
                      {alts.map((a, i) => (
                        <td key={a.id} className={i === selIdx ? 'sel' : ''}>
                          <span>{r.v[`t:${a.id}`] || '—'}</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                  {anyScore && (
                    <tr className="tot"><td><b>Weighted score (1–5)</b></td>{alts.map((a, i) => <td key={a.id} className={i === selIdx ? 'sel' : ''}><b className="mono">{totals[i].toFixed(2)}</b></td>)}</tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : <Blank title="No comparison matrix yet" text="List the criteria, weight them, and score each concept." cta="Build the matrix" onClick={() => edit('compare')} />}
        </OvSection>

        <OvSection no="3.3" title="Selected Concept" onEdit={() => edit('selected')}>
          {sel ? (
            <div className="pickcard">
              <div className="pk-h">
                <span className="ck-badge lg"><Check size={16} strokeWidth={3} /></span>
                <b>Concept {letter(selIdx)}: {sel.v.name}</b>
              </div>
              <hr />
              <span className="pk-sub">Rationale</span>
              {rationale ? <ul className="bullets dot">{sentences(rationale).map((s, i) => <li key={i}><Rich text={s} /></li>)}</ul> : <p className="muted">State the engineering reasons it won.</p>}
            </div>
          ) : <Blank title="No concept selected" text="Mark one concept as Selected and give its rationale." cta="Choose the concept" onClick={() => edit('alts')} />}
        </OvSection>
      </div>
    </div>
  )
}
