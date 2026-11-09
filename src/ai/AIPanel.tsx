import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronRight, FileText, Lightbulb, MessageSquare, ShieldCheck, Sparkles } from 'lucide-react'
import type { PageDef } from '../data/pages'
import { sectionProgress, type Content } from '../lib/progress'
import { useStore } from '../state/store'
import { insightsForPage } from './engine'

interface CheckItem {
  id: string
  label: string
  ok: boolean
  sectionId?: string
}

const SUGGESTIONS: Record<number, string> = {
  0: 'Keep the dated project update current before each review so faculty can see what changed since the last gate.',
  1: 'Ensure every team member has a clearly bounded hardware or RTL subsystem and a recorded contribution for the current review.',
  2: 'Replace any assumed design input (such as source impedance) with a bench measurement or datasheet figure before sizing components.',
  3: 'Include a brief calculation or reference showing the expected performance range and how it meets the functional requirements.',
  4: 'State the reason for any deferred or under-review functional requirement so the table is ready for the Review 3 freeze.',
  5: 'Verify that every block in your architecture cites a valid FR number from Page 4 and records at least one rejected alternative.',
  6: 'Link every BOM part back to a sizing calculation or stated assumption, and date predictions before bench measurements.',
  7: 'After completing performance validation on Page 9, fill in the Measured Result column to upgrade Applied cards to Verified.',
  8: 'Attach oscilloscope captures beside your subsystem test records and explain any deviation greater than 2% from prediction.',
  9: 'Add a validation row for every Functional Requirement in Page 4, explaining probe loading or component tolerance discrepancies.',
  10: 'Close open failure cycles by recording the bench re-measurement after applying the fix.',
  11: 'Maintain a weekly notebook habit and avoid back-dating entries—the server records the save timestamp alongside your entry date.',
  12: 'Quote each faculty observation verbatim and link directly to the portfolio page you updated in response.',
  13: 'Have every team member record an individual reflection in their own words and connect your work to upcoming courses.',
  14: 'Add video timestamps for every Functional Requirement in your walkthrough so reviewers can jump straight to each proof.',
  15: 'Include direct HTTPS links to your formal report, Verilog RTL repository, schematic, and SPICE simulation files.',
}

function checksForPage(page: PageDef, c: Content): CheckItem[] {
  if (page.id === 3) {
    const alts = c.rows['3.alts'] ?? []
    const crit = c.rows['3.matrix'] ?? []
    const ev = c.evidence.some((e) => e.pageId === 3)
    return [
      { id: 'c1', label: 'Multiple concepts documented', ok: alts.length >= 3, sectionId: 'alts' },
      { id: 'c2', label: 'Comparison criteria defined', ok: crit.length >= 3, sectionId: 'compare' },
      { id: 'c3', label: 'Concept selected with a written rationale', ok: alts.some((a) => a.v.fate === 'Selected') && (c.prose['3.selected'] ?? '').trim().split(/\s+/).filter(Boolean).length >= 40, sectionId: 'selected' },
      { id: 'c4', label: 'Sketches or references attached as evidence', ok: ev, sectionId: 'alts' },
    ]
  }

  const out: CheckItem[] = page.sections.map((sec) => {
    const p = sectionProgress(page, sec, c)
    return {
      id: sec.id,
      label: `${sec.title} ${p >= 0.99 ? 'documented' : 'needs detail'}`,
      ok: p >= 0.99,
      sectionId: sec.id,
    }
  })

  const insights = insightsForPage(page, c)
  for (const ins of insights.slice(0, 2)) {
    out.push({
      id: ins.id,
      label: ins.title,
      ok: false,
      sectionId: ins.sectionId,
    })
  }
  return out.slice(0, 5)
}

export function AIPanel({ page, content, onGo }: { page: PageDef; content: Content; onGo: (sectionId?: string) => void }) {
  const [tab, setTab] = useState<'insights' | 'questions' | 'improve'>('insights')
  const [busy, setBusy] = useState(false)
  const dismissed = useStore((s) => s.dismissedInsights)
  const dismiss = useStore((s) => s.dismissInsight)
  const mentor = useStore((s) => s.mentor)

  useEffect(() => {
    setBusy(true)
    const t = setTimeout(() => setBusy(false), 420)
    return () => clearTimeout(t)
  }, [page.id])

  const insights = useMemo(
    () => insightsForPage(page, content).filter((i) => !dismissed.includes(i.id)),
    [page, content, dismissed],
  )
  const checks = useMemo(() => checksForPage(page, content), [page, content])
  const pageQuestions = useMemo(() => {
    const fromSessions = mentor.filter((m) => m.pageId === page.id).flatMap((m) => m.questions)
    return fromSessions
  }, [mentor, page.id])

  const suggestion = SUGGESTIONS[page.id] ?? insights[0]?.detail ?? 'Keep documenting your engineering reasoning with measured quantities and dated evidence.'

  return (
    <aside className="mp" aria-label="AI Mentor contextual assistant">
      <div className="mp-head">
        <div className="mp-title">
          <h2><Sparkles size={20} /> AI Mentor <span className="chip chip-ai" style={{ fontSize: 10, marginLeft: 6 }}>Simulated preview</span></h2>
          <span className={`mp-ready ${busy ? 'busy' : ''}`} aria-live="polite">
            <i /> {busy ? 'Reading page…' : 'Simulated'}
          </span>
        </div>

        <div className="mp-tabs" role="tablist" aria-label="AI Mentor views">
          <button role="tab" aria-selected={tab === 'insights'} className={`mp-tab ${tab === 'insights' ? 'on' : ''}`} onClick={() => setTab('insights')}>
            Insights
          </button>
          <button role="tab" aria-selected={tab === 'questions'} className={`mp-tab ${tab === 'questions' ? 'on' : ''}`} onClick={() => setTab('questions')}>
            Questions{pageQuestions.length > 0 && <span className="n">{pageQuestions.length}</span>}
          </button>
          <button role="tab" aria-selected={tab === 'improve'} className={`mp-tab ${tab === 'improve' ? 'on' : ''}`} onClick={() => setTab('improve')}>
            Improve
          </button>
        </div>
      </div>

      <div className="mp-body">
        {tab === 'insights' && (
          <>
            <section className="mp-card" aria-label="Page Analysis">
              <h3><FileText size={17} /> Page Analysis</h3>
              <ul className="mp-checks">
                {checks.map((c) => (
                  <li key={c.id}>
                    <span className={`ic ${c.ok ? 'ok' : 'open'}`} aria-hidden="true">
                      {c.ok && <Check size={12} strokeWidth={3} />}
                    </span>
                    <button type="button" onClick={() => onGo(c.sectionId)}>
                      {c.label}
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mp-card" aria-label="Suggested Improvement">
              <h3><Lightbulb size={18} className="lb" /> Suggested Improvement</h3>
              <p className="mp-sugg">
                <q>{suggestion}</q>
              </p>
            </section>

            <Link to="/student/mentor" className="mp-ask">
              <MessageSquare size={17} />
              <span>Ask a Question</span>
              <ChevronRight size={17} className="go" />
            </Link>
          </>
        )}

        {tab === 'questions' && (
          <>
            {pageQuestions.length > 0 ? (
              pageQuestions.map((q) => (
                <div key={q.id} className="mp-q">
                  <span className="qt">{q.type}</span>
                  {q.quote && <blockquote>“{q.quote}”</blockquote>}
                  <p>{q.text}</p>
                  <div className="acts">
                    <Link to="/student/mentor" className="act" style={{ height: 32, padding: '0 12px', fontSize: 12.5, textDecoration: 'none' }}>
                      Reply in Mentor <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="mp-card">
                <h3><MessageSquare size={17} /> Socratic Questions</h3>
                <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.55 }}>
                  {insights.find((i) => i.question)?.question ?? 'Walk through your strongest engineering trade-off on this page: what measurement or calculation would falsify your choice?'}
                </p>
                <div style={{ marginTop: 12 }}>
                  <Link to="/student/mentor" className="mp-ask">
                    <MessageSquare size={16} />
                    <span>Open Socratic Session</span>
                    <ChevronRight size={16} className="go" />
                  </Link>
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'improve' && (
          <>
            {insights.length > 0 ? (
              insights.map((ins) => (
                <div key={ins.id} className="mp-q">
                  <span className="qt">{ins.type}</span>
                  <b style={{ fontSize: 13.5 }}>{ins.title}</b>
                  {ins.quote && <blockquote>“{ins.quote}”</blockquote>}
                  <p>{ins.detail}</p>
                  <div className="acts">
                    {ins.sectionId && (
                      <button type="button" className="act" style={{ height: 30, padding: '0 10px', fontSize: 12 }} onClick={() => onGo(ins.sectionId)}>
                        Edit section
                      </button>
                    )}
                    <button type="button" className="act" style={{ height: 30, padding: '0 10px', fontSize: 12 }} onClick={() => dismiss(ins.id)}>
                      Dismiss
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="mp-card">
                <h3><Check size={17} /> All Automated Checks Clear</h3>
                <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.55 }}>
                  Nothing flagged by client-side checks on this page. Consider adding a captioned figure or measurement trace to strengthen your evidence.
                </p>
              </div>
            )}
          </>
        )}

        <p className="mp-note">
          <ShieldCheck size={14} />
          <span>Advisory only. No marks. AI never edits your pages, and faculty decide all assessment.</span>
        </p>
      </div>
    </aside>
  )
}
