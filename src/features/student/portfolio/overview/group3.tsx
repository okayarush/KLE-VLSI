import { ArrowRight, Check, Clock, Lightbulb, TriangleAlert } from 'lucide-react'
import { words } from '../../../../lib/progress'
import { DebuggingLoopDiagram, DeviationChart, VerificationFunnel } from './art'
import { Blank, Evidences, FrRef, OvSection, Rich, Stat, Tag, filled, fmtDay, frSetOf, norm, num, proseOf, rowsOf, type OvProps } from './kit'

/* ------------------------------------------------------------------ 8 Build and Verification */
function devTone(dev = ''): 'ok' | 'warn' | 'no' | undefined {
  const m = dev.replace(/[−–]/g, '-').match(/(-?\d+(?:\.\d+)?)\s*%/)
  if (!m) return undefined
  const a = Math.abs(parseFloat(m[1]))
  return a <= 2 ? 'ok' : a <= 10 ? 'warn' : 'no'
}

export function BuildOv({ c, edit }: OvProps) {
  const sims = rowsOf(c, 8, 'sim')
  const tests = rowsOf(c, 8, 'tests')
  const devs = rowsOf(c, 8, 'deviations')
  const integ = proseOf(c, 8, 'integration')
  const stages = [
    { k: 'sim', t: 'Simulation', n: sims.length, ok: sims.length > 0, unit: 'testbenches' },
    { k: 'tests', t: 'Subsystem tests', n: tests.length, ok: tests.some((r) => filled(r.v.measured)), unit: 'records' },
    { k: 'integration', t: 'Integration', n: words(integ) ? 1 : 0, ok: words(integ) >= 30, unit: 'evidence' },
    { k: 'deviations', t: 'Deviations', n: devs.length, ok: devs.length > 0, unit: 'recorded' },
  ]
  return (
    <div className="ov">
      <ol className="pipe" aria-label="Build and verification stages">
        {stages.map((s, i) => (
          <li key={s.k} className={s.ok ? 'ok' : ''}>
            <button onClick={() => edit(s.k)}><span className="pn">{s.ok ? <Check size={16} strokeWidth={3} /> : i + 1}</span><b>{s.t}</b><small>{s.n} {s.unit}</small></button>
          </li>
        ))}
      </ol>

      <VerificationFunnel sims={sims.length} tests={tests.length} measured={tests.filter((r) => filled(r.v.measured)).length} integrationWords={words(integ)} deviations={devs.length} />

      <OvSection no="8.1" title="Simulation / testbench results" sub="What you simulated, with what stimulus, and what happened." onEdit={() => edit('sim')}>
        {sims.length ? (
          <div className="simgrid">
            {sims.map((r) => (
              <article key={r.id} className="sim">
                <header><span className="sg">SIM</span><b>{r.v.block}</b></header>
                {r.v.setup && <p className="su"><small>Stimulus and setup</small>{r.v.setup}</p>}
                <p className="rs"><small>Result</small><Rich text={r.v.result || ''} /></p>
              </article>
            ))}
          </div>
        ) : <Blank title="No simulations recorded" text="Record the critical block’s simulation before the build." cta="Add a simulation" onClick={() => edit('sim')} />}
        <Evidences c={c} pageId={8} sectionId="sim" />
      </OvSection>

      <OvSection no="8.2" title="Subsystem test records" sub="Parameter · Instrument · Predicted · Measured · Deviation · Remarks." onEdit={() => edit('tests')}>
        {tests.length ? (
          <div className="dt-wrap">
            <table className="dt">
              <thead><tr><th>Parameter</th><th>Instrument</th><th className="r">Predicted</th><th className="r">Measured</th><th className="r">Deviation</th><th>Remarks</th></tr></thead>
              <tbody>{tests.map((r) => (
                <tr key={r.id}>
                  <td><b>{r.v.parameter}</b></td><td>{r.v.instrument || '—'}</td>
                  <td className="r"><span className="pred mono">{r.v.predicted || '—'}</span></td>
                  <td className="r">{filled(r.v.measured) ? <b className="meas mono">{r.v.measured}</b> : <Tag><Clock size={11} /> Pending</Tag>}</td>
                  <td className="r">{filled(r.v.deviation) ? <Tag tone={devTone(r.v.deviation)} mono>{r.v.deviation}</Tag> : <span className="dash">—</span>}</td>
                  <td>{r.v.remarks || <span className="dash">—</span>}</td>
                </tr>))}</tbody>
            </table>
          </div>
        ) : <Blank title="No test records yet" cta="Add a test record" onClick={() => edit('tests')} />}
        <Evidences c={c} pageId={8} sectionId="tests" />
      </OvSection>

      <div className="two">
        <OvSection no="8.3" title="Integration evidence" onEdit={() => edit('integration')}>
          {integ ? <p className="narr big"><Rich text={integ} /></p> : <Blank compact title="Not written yet" cta="Describe the integration" onClick={() => edit('integration')} />}
          <Evidences c={c} pageId={8} sectionId="integration" />
        </OvSection>
        <OvSection no="8.4" title="Deviations from the plan" onEdit={() => edit('deviations')}>
          {devs.length ? <div className="stack-sm">{devs.map((d) => <article key={d.id} className="devi"><TriangleAlert size={17} /><div><b>{d.v.what}</b><p>{d.v.why}</p></div></article>)}</div>
            : <Blank compact title="No deviations recorded" text="If the build differs from the schematic or design, record where and why. Leave this empty if it matches." cta="Record a deviation" onClick={() => edit('deviations')} />}
        </OvSection>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ 9 Predicted vs Measured */
export function ValidationOv({ c, edit }: OvProps) {
  const rows = rowsOf(c, 9, 'validation')
  const frTable = rowsOf(c, 4, 'frtable')
  const frs = frSetOf(c)
  const done = new Set(rows.map((r) => norm(r.v.fr)))
  const todo = frTable.filter((r) => !done.has(norm(r.v.no)))
  const covered = frTable.length ? frTable.length - todo.length : 0
  const pass = rows.filter((r) => r.v.result === 'Pass').length
  const fail = rows.filter((r) => r.v.result === 'Fail').length
  const pairs = rows.map((r) => ({ r, p: num(r.v.predicted), m: num(r.v.measured) })).filter((x) => x.p && x.m)
  const pct = frTable.length ? (covered / frTable.length) * 100 : 0
  return (
    <div className="ov">
      <div className="stats">
        <div className="stat2 ringstat">
          <svg viewBox="0 0 44 44" width="56" height="56" aria-hidden="true"><circle cx="22" cy="22" r="18" fill="none" stroke="var(--surface-3)" strokeWidth="5" /><circle cx="22" cy="22" r="18" fill="none" stroke="var(--maroon)" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(pct / 100) * 113} 113`} transform="rotate(-90 22 22)" /></svg>
          <div><b>{covered}<small>/{frTable.length}</small></b><span>FRs validated</span></div>
        </div>
        <Stat value={pass} label="Pass" tone="ok" />
        <Stat value={fail} label="Fail" tone={fail ? 'no' : undefined} />
        <Stat value={todo.length} label="Awaiting a row" tone={todo.length ? 'warn' : 'ok'} sub={todo.length ? todo.map((t) => t.v.no).slice(0, 3).join(', ') : 'every FR covered'} />
      </div>

      <DeviationChart rows={rows.map((r) => ({ fr: r.v.fr, predicted: r.v.predicted, measured: r.v.measured }))} />

      <OvSection no="9.1" title="Predicted against measured" sub="Each pair is scaled to its own larger value, so a short bar never means a small number." >
        {pairs.length ? (
          <div className="pm">
            <div className="pm-key"><span><i className="p" /> Predicted</span><span><i className="m" /> Measured</span></div>
            {pairs.map(({ r, p, m }) => {
              const max = Math.max(p!.n, m!.n) || 1
              return (
                <div key={r.id} className="pm-row">
                  <div className="pm-l"><Tag tone="maroon" mono>{r.v.fr}</Tag><small>{r.v.target}</small></div>
                  <div className="pm-bars">
                    <div className="b p"><i style={{ width: `${(p!.n / max) * 100}%` }} /><span className="mono">{r.v.predicted}</span></div>
                    <div className="b m"><i style={{ width: `${(m!.n / max) * 100}%` }} /><span className="mono">{r.v.measured}</span></div>
                  </div>
                  <div className="pm-d">{r.v.deviation && <Tag mono>{r.v.deviation}</Tag>}</div>
                </div>
              )
            })}
          </div>
        ) : <Blank compact title="Nothing to plot yet" text="Rows with numeric predicted and measured values are drawn here." />}
      </OvSection>

      <OvSection no="9.2" title="Validation sheet" sub="One row per functional requirement: prediction, measurement, deviation, explanation." onEdit={() => edit('validation')} editLabel="Edit sheet">
        <div className="dt-wrap">
          <table className="dt">
            <thead><tr><th style={{ width: 84 }}>FR</th><th>Target</th><th className="r">Predicted</th><th className="r">Measured</th><th className="r">Deviation</th><th>Explanation of any discrepancy</th><th style={{ width: 80 }}>Result</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><FrRef no={r.v.fr} frs={frs} /></td><td>{r.v.target || '—'}</td>
                  <td className="r"><span className="pred mono">{r.v.predicted || '—'}</span></td><td className="r"><b className="meas mono">{r.v.measured || '—'}</b></td>
                  <td className="r">{r.v.deviation ? <Tag mono tone={devTone(r.v.deviation)}>{r.v.deviation}</Tag> : '—'}</td>
                  <td>{r.v.explain || <span className="dash">—</span>}</td>
                  <td>{r.v.result ? <Tag tone={r.v.result === 'Pass' ? 'ok' : 'no'}>{r.v.result}</Tag> : <span className="dash">—</span>}</td>
                </tr>
              ))}
              {todo.map((t) => (
                <tr key={t.id} className="ghost"><td><Tag mono>{t.v.no}</Tag></td><td>{t.v.target}</td><td colSpan={5}><button className="linkish" onClick={() => edit('validation')}>Not yet validated — add the row <ArrowRight size={13} /></button></td></tr>
              ))}
              {!rows.length && !todo.length && <tr><td colSpan={7}><Blank compact title="No validation rows yet" cta="Add a row" onClick={() => edit('validation')} /></td></tr>}
            </tbody>
          </table>
        </div>
        <Evidences c={c} pageId={9} sectionId="validation" />
      </OvSection>
    </div>
  )
}

/* ------------------------------------------------------------------ 10 Failures and Fixes */
export function FailOv({ c, edit }: OvProps) {
  const cycles = rowsOf(c, 10, 'debug')
  const closed = cycles.filter((r) => r.v.state === 'Closed').length
  const remeasured = cycles.some((r) => filled(r.v.remeasure))
  const steps: [string, string][] = [['test', 'Test that isolated it'], ['cause', 'Root cause'], ['fix', 'Correction'], ['remeasure', 'Re-measurement'], ['learning', 'What you learned']]
  return (
    <div className="ov">
      <div className="stats">
        <Stat value={cycles.length} label="Failure cycles" sub="Review 5 expects 2 · Final Review 3" tone={cycles.length >= 3 ? 'ok' : undefined} />
        <Stat value={closed} label="Closed" tone="ok" />
        <Stat value={cycles.length - closed} label="Open" tone={cycles.length - closed ? 'warn' : undefined} />
        <Stat value={remeasured ? 'Yes' : 'Not yet'} label="Improvement re-measured" tone={remeasured ? 'ok' : 'warn'} />
      </div>

      <DebuggingLoopDiagram cycles={cycles.map((r) => r.v)} />

      <OvSection no="10.1" title="Debugging log" sub="Symptom → test → root cause → correction → re-measurement → learning." onEdit={() => edit('debug')}>
        {cycles.length ? (
          <div className="cycles">
            {cycles.map((r, i) => (
              <article key={r.id} className={`cycle ${r.v.state === 'Closed' ? 'closed' : ''}`}>
                <header>
                  <span className="cn">{String(i + 1).padStart(2, '0')}</span>
                  <div><small>Symptom</small><h3>{r.v.symptom || 'Untitled failure'}</h3></div>
                  <Tag tone={r.v.state === 'Closed' ? 'ok' : 'warn'}>{r.v.state || 'Open'}</Tag>
                </header>
                <ol className="flow">
                  {steps.map(([k, label], si) => (
                    <li key={k} className={filled(r.v[k]) ? '' : 'miss'}>
                      <span className="fl">{si + 2}. {label}{k === 'learning' && <Lightbulb size={12} />}</span>
                      <p>{r.v[k] || <span className="dash">{k === 'remeasure' ? 'Not re-measured yet' : '—'}</span>}</p>
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
        ) : <Blank title="No failure cycles yet" text="Every honest build has some. Record the symptom, then follow it through." cta="Log a failure" onClick={() => edit('debug')} />}
        <Evidences c={c} pageId={10} sectionId="debug" />
      </OvSection>
    </div>
  )
}

/* ------------------------------------------------------------------ 11 Engineering Notebook */
export function NotebookOv({ page, c, edit }: OvProps) {
  const entries = [...rowsOf(c, 11, 'entries')].sort((a, b) => (b.v.date || '').localeCompare(a.v.date || ''))
  const weekStart = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x.getTime() }
  const thisWeek = weekStart(new Date())
  const weeks = Array.from({ length: 10 }, (_, i) => thisWeek - (9 - i) * 7 * 86400000)
  const inWeek = (w: number) => entries.filter((e) => e.v.date && weekStart(new Date(e.v.date)) === w).length
  return (
    <div className="ov">
      {page.note && <div className="freeze soft"><span className="fz-ic"><Clock size={18} /></span><div><b>Dated by the server when saved</b><p>{page.note}</p></div></div>}
      <OvSection no="11.1" title="Weekly rhythm" sub="One entry a week is the habit the handbook asks for." aside={<Tag mono>{entries.length} entries</Tag>}>
        <div className="weeks">{weeks.map((w, i) => { const n = inWeek(w); return <span key={w} className={`wk ${n ? 'on' : ''} ${w === thisWeek ? 'now' : ''}`} title={`Week of ${new Date(w).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}: ${n} entr${n === 1 ? 'y' : 'ies'}`}><i>{n || ''}</i><small>{w === thisWeek ? 'now' : `−${9 - i}w`}</small></span> })}</div>
      </OvSection>
      <OvSection no="11.2" title="Notebook entries" sub="Objective · decision or calculation · course used · learning · next action." onEdit={() => edit('entries')} editLabel="Add entry">
        {entries.length ? (
          <ol className="journal">
            {entries.map((e) => {
              const d = e.v.date ? fmtDay(e.v.date) : null
              const back = !!e.v.date && Math.abs(new Date(e.v.date).getTime() - new Date(e.at.slice(0, 10)).getTime()) > 86400000
              return (
                <li key={e.id}>
                  <div className="jd">{d ? <><b>{d.day}</b><span>{d.mon}</span><small>{d.wk}</small></> : <span>undated</span>}</div>
                  <article className="je">
                    <header><h3>{e.v.objective || 'Untitled entry'}</h3><span className="row">{back && <Tag tone="warn" title="Entry date differs from the date it was saved. Back-dated entries are flagged, not hidden.">Back-dated</Tag>}{e.v.course && <Tag>{e.v.course}</Tag>}</span></header>
                    {e.v.decision && <p><Rich text={e.v.decision} /></p>}
                    {e.v.learning && <p className="lrn"><Lightbulb size={15} /> <span><small>Learning</small>{e.v.learning}</span></p>}
                    {e.v.next && <p className="nxt"><ArrowRight size={14} /> <span><small>Next</small>{e.v.next}</span></p>}
                  </article>
                </li>
              )
            })}
          </ol>
        ) : <Blank title="The notebook is empty" text="Add your first dated entry — what you set out to do, what you decided, and what you learned." cta="Write an entry" onClick={() => edit('entries')} />}
        <Evidences c={c} pageId={11} sectionId="entries" />
      </OvSection>
    </div>
  )
}
