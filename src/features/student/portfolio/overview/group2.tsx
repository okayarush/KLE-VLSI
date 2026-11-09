import { Link } from 'react-router-dom'
import { ArrowRight, CalendarClock, CheckCircle2, Clock, Lock, ShieldCheck } from 'lucide-react'
import { fmtDate } from '../../../../lib/progress'
import { Info, SourceBadge, pageNo, pagePath } from '../guide'
import { CourseKnowledgeGraph, DesignLinkageDiagram, TraceabilityWebDiagram } from './art'
import { Blank, Evidences, FrRef, OvSection, Stat, Tag, filled, frSetOf, norm, rowsOf, sentences, type OvProps } from './kit'

const STATUS_TONE: Record<string, 'ok' | 'warn' | 'no'> = {
  'Target confirmed and sizes calculation': 'ok',
  'Under review — team not yet able to size this requirement': 'warn',
  'Deferred with reason': 'no',
}

/* ------------------------------------------------------------------ 4 Functional Requirements */
export function FrOv({ page, c, edit }: OvProps) {
  const frs = rowsOf(c, 4, 'frtable')
  const blocks = rowsOf(c, 5, 'blocks').map((r) => norm(r.v.fr))
  const calcs = rowsOf(c, 6, 'calcs').map((r) => norm(r.v.fr))
  const valid = rowsOf(c, 9, 'validation').map((r) => norm(r.v.fr))
  const count = (s: string) => frs.filter((r) => r.v.status === s).length
  const noReason = frs.filter((r) => r.v.status !== 'Target confirmed and sizes calculation' && r.v.status && !filled(r.v.reason)).length
  const cand = rowsOf(c, 2, 'candfr')
  const trace = () => [
    ['Block', blocks, 5, 'an architecture block', 'cite it as the Governing FR of a block'],
    ['Calc', calcs, 6, 'a calculation', 'cite it as the Linked FR of a calculation'],
    ['Valid', valid, 9, 'a validation row', 'add a validation row for it'],
  ] as const
  return (
    <div className="ov">
      {page.note && <div className="freeze"><span className="fz-ic"><Lock size={18} /></span><div><b>Faculty freeze at Review 3</b><p>{page.note}</p></div></div>}

      <div className="stats">
        <Stat value={frs.length} label="Functional requirements" sub="at least 3 expected" info="Counted automatically from the requirements table below. To change it, add or remove rows in the table." />
        <Stat value={count('Target confirmed and sizes calculation')} label="Target confirmed" tone="ok" info="Counted automatically: rows whose Status is “Target confirmed and sizes calculation”." />
        <Stat value={count('Under review — team not yet able to size this requirement')} label="Under review" tone="warn" info="Counted automatically: rows whose Status is “Under review”. These need a reason." />
        <Stat value={count('Deferred with reason')} label="Deferred" tone={noReason ? 'no' : undefined} sub={noReason ? `${noReason} without a reason` : undefined} info="Counted automatically: rows whose Status is “Deferred with reason”. Each one needs its reason filled in." />
      </div>

      <TraceabilityWebDiagram frNos={frs.map((r) => r.v.no).filter(Boolean)} inputCount={rowsOf(c, 2, 'inputs').length} blockCount={blocks.filter(Boolean).length} calcCount={calcs.filter(Boolean).length} validCount={valid.filter(Boolean).length} onAdd={() => edit('frtable')} />

      <OvSection no="4.1" title="Functional Requirements Table" sub="Quantified statements of what the system must do — target, method, source and status on every row." onEdit={() => edit('frtable')} editLabel="Edit table">
        {frs.length ? (
          <div className="dt-wrap">
            <table className="dt frt">
              <thead><tr>
                <th style={{ width: 84 }}>FR No.</th><th>Statement</th>
                <th style={{ width: 150 }}>Target<Info label="About Target" text="A number with a unit that shows whether the requirement is met, for example ≥ 40 dB or 880 kHz ± 2 %. “no target” means the row is not quantified yet." /></th>
                <th style={{ width: 170 }}>Measurement method<Info label="About Measurement method" text="How you will measure it on the bench, for example an oscilloscope sweep at 1 kHz." /></th>
                <th style={{ width: 120 }}>Source<Info label="About Source" text="Where the requirement came from: a user need, the theme specification, a device datasheet, or a design standard." /></th>
                <th style={{ width: 190 }}>Status<Info label="About Status" text="Target confirmed: you can size a calculation from it. Under review: you cannot size it yet. Deferred: postponed. The last two need a reason, shown under the status." /></th>
                <th style={{ width: 112 }}>Traced to<Info label="About Traced to" text={`Worked out automatically; you do not type it. A green chip means a block (${pageNo(5)}), calculation (${pageNo(6)}) or validation row (${pageNo(9)}) cites this FR. A dashed chip is a link: it opens the page where you can add the missing link.`} /></th>
              </tr></thead>
              <tbody>
                {frs.map((r) => (
                  <tr key={r.id}>
                    <td><Tag tone="maroon" mono>{r.v.no || '—'}</Tag></td>
                    <td>{r.v.statement || <span className="dash">—</span>}</td>
                    <td>{filled(r.v.target) ? <b className="val mono">{r.v.target}</b> : <span className="dash">no target</span>}</td>
                    <td>{r.v.method || <span className="dash">—</span>}</td>
                    <td>{r.v.source ? <Tag>{r.v.source}</Tag> : <span className="dash">—</span>}</td>
                    <td>
                      {r.v.status ? <Tag tone={STATUS_TONE[r.v.status]} title={r.v.status}><span className="wrapt">{r.v.status}</span></Tag> : <span className="dash">—</span>}
                      {r.v.status && r.v.status !== 'Target confirmed and sizes calculation' && (filled(r.v.reason) ? <small className="reason">{r.v.reason}</small> : <small className="reason miss">Reason missing</small>)}
                    </td>
                    <td><span className="trace">{trace().map(([l, list, pg, what, how]) => {
                      const no = norm(r.v.no)
                      if (no && list.includes(no)) return <i key={l} className="on" title={`${l}: linked — ${what} on ${pageNo(pg)} cites ${r.v.no}`}>{l}</i>
                      if (!no) return <i key={l} title={`${l}: give this row an FR number first`}>{l}</i>
                      return <Link key={l} to={pagePath(pg)} aria-label={`${l} not linked yet. Open ${pageNo(pg)} and ${how}`} title={`${l}: not linked yet — open ${pageNo(pg)} and ${how}`}>{l}</Link>
                    })}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Blank title="No requirements yet"
            text={cand.length ? `You have ${cand.length} candidate requirement${cand.length === 1 ? '' : 's'} on ${pageNo(2)}. They are not copied across automatically, so re-enter each one here with a target, method, source and status.` : `Add at least three quantified requirements. ${pageNo(2)} has a place to draft candidate requirements first.`}
            link={{ to: pagePath(2), label: cand.length ? `Open your candidates on ${pageNo(2)}` : `Draft candidates on ${pageNo(2)}` }}
            cta="Add the first FR" onClick={() => edit('frtable')} />}
        <p className="hint">“Traced to” shows whether an architecture block (Page 5), a calculation (Page 6) and a validation row (Page 9) cite each requirement.</p>
      </OvSection>
    </div>
  )
}

/* ------------------------------------------------------------------ 5 Architecture */
export function ArchOv({ c, edit }: OvProps) {
  const frTableEmpty = rowsOf(c, 4, 'frtable').length === 0
  const blocks = rowsOf(c, 5, 'blocks')
  const decisions = rowsOf(c, 5, 'subalts')
  const frs = frSetOf(c)
  const decided = new Set(decisions.map((d) => (d.v.block ?? '').trim().toLowerCase()))
  const undecided = blocks.filter((b) => !decided.has((b.v.block ?? '').trim().toLowerCase()))
  return (
    <div className="ov">
      <OvSection no="5.1" title="Block diagram" sub="Drawn from your block table; attach your own captioned diagram alongside." onEdit={() => edit('diagram')} editLabel="Attach diagram"
        aside={blocks.length > 0 && <SourceBadge kind="auto" info="This diagram is drawn automatically from the Blocks table (5.2). To change it, edit the blocks. “Attach diagram” is separate: it adds your own captioned drawing as evidence.">Auto-drawn from 5.2</SourceBadge>}>
        {blocks.length ? (
          <div className="bd" role="img" aria-label={`Block diagram: ${blocks.map((b) => b.v.block).join(', then ')}`}>
            <div className="bd-io"><small>In</small><b>{blocks[0].v.inputs || '—'}</b></div>
            {blocks.map((b, i) => (
              <div key={b.id} className="bd-seg">
                <span className="bd-arrow"><ArrowRight size={18} /></span>
                <div className="bd-box">
                  <header><span className="mono">{String(i + 1).padStart(2, '0')}</span><FrRef no={b.v.fr} frs={frs} link /></header>
                  <b>{b.v.block || 'Unnamed block'}</b>
                  <dl><dt>in</dt><dd>{b.v.inputs || '—'}</dd><dt>out</dt><dd>{b.v.outputs || '—'}</dd></dl>
                </div>
              </div>
            ))}
            <span className="bd-arrow"><ArrowRight size={18} /></span>
            <div className="bd-io out"><small>Out</small><b>{blocks[blocks.length - 1].v.outputs || '—'}</b></div>
          </div>
        ) : <Blank title="No blocks yet" text={`List each block with its inputs, outputs and governing FR to draw the diagram.${frTableEmpty ? ` Governing FRs come from the requirements table on ${pageNo(4)}, which has none yet.` : ''}`}
            link={frTableEmpty ? { to: pagePath(4), label: `Define requirements on ${pageNo(4)} first` } : undefined}
            cta="Add a block" onClick={() => edit('blocks')} />}
        <Evidences c={c} pageId={5} sectionId="diagram" empty="No captioned block diagram attached" onAdd={() => edit('diagram')} />
      </OvSection>

      <OvSection no="5.2" title="Blocks and governing requirements" sub="For each block: what goes in, what comes out, and which FR governs it." onEdit={() => edit('blocks')}>
        {blocks.length ? (
          <div className="dt-wrap">
            <table className="dt">
              <thead><tr><th>Block</th><th>Inputs</th><th>Outputs</th><th>Governing FR<Info label="About Governing FR" text={`The requirement that sets this block's targets. The chip is checked automatically against the FR table on ${pageNo(4)}: if the number isn't there it turns amber and becomes a link to that table.`} /></th></tr></thead>
              <tbody>{blocks.map((b) => <tr key={b.id}><td><b>{b.v.block}</b></td><td className="mono sm">{b.v.inputs || '—'}</td><td className="mono sm">{b.v.outputs || '—'}</td><td><FrRef no={b.v.fr} frs={frs} link /></td></tr>)}</tbody>
            </table>
          </div>
        ) : <Blank compact title="Nothing to show yet" />}
        {blocks.length > 0 && frTableEmpty && <Blank compact title="Governing FRs can't be checked yet" text={`They are matched against the requirements table on ${pageNo(4)}, which is empty.`} link={{ to: pagePath(4), label: `Add requirements on ${pageNo(4)}` }} />}
      </OvSection>

      <OvSection no="5.3" title="Subsystem alternatives and selections" sub="At least one alternative per block, and why you chose what you chose." onEdit={() => edit('subalts')}>
        <div className="decs">
          {decisions.map((d) => (
            <article key={d.id} className="dec">
              <header><b>{d.v.block}</b></header>
              <div className="dec-b"><div><small>Alternative(s) considered</small><p>{d.v.alt}</p></div><ArrowRight size={20} /><div className="chosen"><small>Selected and why</small><p>{d.v.choice}</p></div></div>
            </article>
          ))}
        </div>
        {undecided.length > 0 && <Blank compact title={`No alternative recorded for: ${undecided.map((b) => b.v.block).join(', ')}`} cta="Add a decision" onClick={() => edit('subalts')} />}
        {!decisions.length && !undecided.length && <Blank title="No subsystem decisions yet" cta="Add a decision" onClick={() => edit('subalts')} />}
      </OvSection>
    </div>
  )
}

/* ------------------------------------------------------------------ 6 Design and Calculations */
export function CalcOv({ c, edit }: OvProps) {
  const calcs = rowsOf(c, 6, 'calcs')
  const bom = rowsOf(c, 6, 'bom')
  const reasons = c.prose['6.reasons']?.trim() ?? ''
  const frs = frSetOf(c)
  const lines = (t = '') => t.split(/\n+/).map((x) => x.trim()).filter(Boolean)
  return (
    <div className="ov">
      <OvSection no="6.1" title="Calculation cards" sub="Each calculation linked to an FR, with assumptions stated and the result dated before measurement." onEdit={() => edit('calcs')}>
        {calcs.length ? (
          <div className="calcs">
            {calcs.map((r, i) => (
              <article key={r.id} className="calc">
                <header>
                  <span className="cn">{String(i + 1).padStart(2, '0')}</span>
                  <h3>{r.v.title || 'Untitled calculation'}</h3>
                  <div className="cm"><FrRef no={r.v.fr} frs={frs} />{r.v.course && <Tag>{r.v.course}</Tag>}{r.v.date && <Tag mono title="Date predicted — before measurement"><CalendarClock size={12} /> {fmtDate(r.v.date)}</Tag>}</div>
                </header>
                <div className="calc-b">
                  <div className="as"><small>Assumptions</small>{r.v.assumptions ? <ul>{sentences(r.v.assumptions.replace(/\n/g, ' ')).map((s, k) => <li key={k}>{s}</li>)}</ul> : <span className="dash">None stated</span>}</div>
                  <div className="eq"><small>Working</small><pre>{lines(r.v.working).map((l, k) => <span key={k} className={k === lines(r.v.working).length - 1 ? 'last' : ''}>{l}{'\n'}</span>)}</pre></div>
                </div>
                <footer><small>Result</small><b className="mono">{r.v.result || '—'}</b></footer>
              </article>
            ))}
          </div>
        ) : <Blank title="No calculations yet" text="Each key component is sized by a calculation linked to a requirement." cta="Add a calculation" onClick={() => edit('calcs')} />}
        <Evidences c={c} pageId={6} sectionId="calcs" />
      </OvSection>

      <div className="two">
        <OvSection no="6.2" title="Component reasons" sub="Why each key component was chosen." onEdit={() => edit('reasons')}>
          {reasons ? <ul className="bullets dot">{sentences(reasons).map((s, i) => <li key={i}>{s}</li>)}</ul> : <Blank compact title="No reasons written yet" cta="Write the reasons" onClick={() => edit('reasons')} />}
        </OvSection>
        <OvSection no="6.3" title="Schematic and constraints" onEdit={() => edit('schematic')} editLabel="Attach">
          <DesignLinkageDiagram calcs={rowsOf(c, 6, 'calcs').map((r) => ({ title: r.v.title, fr: r.v.fr }))} parts={bom.map((b) => ({ part: b.v.part, value: b.v.value, trace: b.v.trace }))} />
          <Evidences c={c} pageId={6} sectionId="schematic" onAdd={() => edit('schematic')} />
        </OvSection>
      </div>

      <OvSection no="6.4" title="Bill of materials" sub="Each part traces back to a calculation or a stated assumption." onEdit={() => edit('bom')} aside={bom.length > 0 && <Tag tone={bom.every((b) => filled(b.v.trace)) ? 'ok' : 'warn'}>{bom.filter((b) => filled(b.v.trace)).length} of {bom.length} traced</Tag>}>
        {bom.length ? (
          <div className="dt-wrap">
            <table className="dt">
              <thead><tr><th>Part</th><th>Value / rating</th><th style={{ width: 60 }}>Qty</th><th>Traces to</th></tr></thead>
              <tbody>{bom.map((b) => <tr key={b.id}><td><b>{b.v.part}</b></td><td>{b.v.value || '—'}</td><td className="mono">{b.v.qty || '—'}</td><td>{filled(b.v.trace) ? <span className="tr"><CheckCircle2 size={14} /> {b.v.trace}</span> : <Tag tone="warn">Untraced</Tag>}</td></tr>)}</tbody>
            </table>
          </div>
        ) : <Blank title="No parts yet" cta="Add a part" onClick={() => edit('bom')} />}
      </OvSection>
    </div>
  )
}

/* ------------------------------------------------------------------ 7 Foundation Integration Map */
const hue = (s = '') => [...s].reduce((a, ch) => a + ch.charCodeAt(0), 0) % 6

export function MapOv({ page, c, edit }: OvProps) {
  const map = rowsOf(c, 7, 'map')
  const cards = rowsOf(c, 7, 'cards')
  const frs = frSetOf(c)
  const courses = [...new Set(map.map((r) => r.v.course).filter(Boolean))]
  const measured = map.filter((r) => filled(r.v.measured)).length
  return (
    <div className="ov">
      {page.note && <div className="freeze soft"><span className="fz-ic"><Clock size={18} /></span><div><b>Measured Result is filled after Step 13</b><p>{page.note}</p></div></div>}
      <div className="stats">
        <Stat value={map.length} label="Mapped decisions" />
        <Stat value={`${measured}/${map.length}`} label="With a measured result" tone={measured === map.length && map.length ? 'ok' : undefined} />
        <Stat value={courses.length} label="Courses applied" />
        <Stat value={cards.filter((x) => x.v.level === 'Verified').length} label="Verified decision cards" tone="ok" sub={`${cards.filter((x) => x.v.level === 'Applied').length} applied`} />
      </div>

      <CourseKnowledgeGraph rows={map.map((r) => ({ course: r.v.course, decision: r.v.decision, measured: r.v.measured }))} />

      <OvSection no="7.1" title="Integration map" sub="Decision · Block · FR · Calculation · Course · Measured result." onEdit={() => edit('map')}>
        {map.length ? (
          <div className="dt-wrap">
            <table className="dt">
              <thead><tr><th>Decision</th><th>Block</th><th style={{ width: 80 }}>FR</th><th>Calculation</th><th>Course</th><th>Measured result</th></tr></thead>
              <tbody>{map.map((r) => (
                <tr key={r.id}>
                  <td><b>{r.v.decision}</b></td><td>{r.v.block || '—'}</td><td><FrRef no={r.v.fr} frs={frs} /></td><td>{r.v.calc || '—'}</td>
                  <td>{r.v.course ? <span className={`course h${hue(r.v.course)}`}>{r.v.course}</span> : <span className="dash">—</span>}</td>
                  <td>{filled(r.v.measured) ? <b className="val mono">{r.v.measured}</b> : <Tag><Clock size={11} /> Awaiting Step 13</Tag>}</td>
                </tr>))}</tbody>
            </table>
          </div>
        ) : <Blank title="Map is empty" text="Record each significant decision against its block, FR, calculation and course." cta="Add a row" onClick={() => edit('map')} />}
      </OvSection>

      <OvSection no="7.2" title="Decision cards" sub="One card for each significant decision — why this, and not the alternative." onEdit={() => edit('cards')}>
        {cards.length ? (
          <div className="dcards">
            {cards.map((d) => (
              <article key={d.id} className={`dcard ${d.v.level === 'Verified' ? 'ver' : ''}`}>
                <header>{d.v.level === 'Verified' ? <Tag tone="solid"><ShieldCheck size={12} /> Verified</Tag> : <Tag tone="maroon">Applied</Tag>}<FrRef no={d.v.fr} frs={frs} /></header>
                <h3>{d.v.decision}</h3>
                <p>{d.v.why}</p>
              </article>
            ))}
          </div>
        ) : <Blank title="No decision cards yet" cta="Add a decision card" onClick={() => edit('cards')} />}
        <Evidences c={c} pageId={7} sectionId="cards" />
      </OvSection>
    </div>
  )
}
