import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, Loader2, Save, Sparkles, X } from 'lucide-react'
import { Bar } from '../../../design-system'
import { AIPanel } from '../../../ai/AIPanel'
import { PAGES, pageBySlug, type SectionDef } from '../../../data/pages'
import { firstReviewOf } from '../../../data/handbook'
import { overall, pageProgress, sectionGap, sectionProgress } from '../../../lib/progress'
import { useStore } from '../../../state/store'
import { useContent } from '../hooks'
import { PAGE_OVERVIEWS, PageArt } from './overview'
import { ComparisonMatrixEditor, EvidenceStrip, ProseEditor, RowsEditor } from './Sections'
import { Info } from './guide'

/** Editorial display titles & descriptions matching the KLE UI specification. */
const PAGE_META: Record<number, { heading?: string; lede: string; tabs?: Record<string, string> }> = {
  0: {
    heading: 'Project Overview',
    lede: 'Your shared engineering record across all six reviews — tracking the 16-step design chain, artefact architecture, and review gate readiness.',
  },
  1: {
    heading: 'Team & Subsystem Ownership',
    lede: 'Define clear hardware and RTL subsystem boundaries for each member and maintain a review-by-review record of individual engineering contributions.',
  },
  2: {
    heading: 'Problem & Engineering Need',
    lede: 'Quantify what is inadequate today using measured bench data and datasheet constraints before proposing a circuit or architecture.',
  },
  3: {
    heading: 'Concept Selection',
    lede: 'Explore multiple solution approaches, compare their feasibility, and justify the selected concept with engineering reasoning and evidence.',
    tabs: {
      alts: 'Alternatives',
      compare: 'Comparison',
      selected: 'Selected Concept',
      scope: 'Scope: In and Out',
    },
  },
  4: {
    heading: 'Functional Requirements',
    lede: 'Quantified, testable statements of what the system must achieve — linking every requirement forward to an architecture block, calculation, and validation test.',
  },
  5: {
    heading: 'Architecture & Subsystems',
    lede: 'Partition the system into functional blocks with explicit signal interfaces, governing requirements, and documented subsystem trade-offs.',
  },
  6: {
    heading: 'Design & Calculations',
    lede: 'Size every critical component from first principles and foundation coursework, stating your assumptions and dating predictions prior to measurement.',
  },
  7: {
    heading: 'Foundation Integration Map',
    lede: 'Trace how concepts from Analog Circuits, Digital System Design, and Linear ICs directly govern your hardware sizing and verified bench results.',
  },
  8: {
    heading: 'Build & Verification',
    lede: 'Progress systematically from SPICE and RTL testbench simulation to subsystem bench checks, full system integration, and documented build deviations.',
  },
  9: {
    heading: 'Predicted vs Measured',
    lede: 'Compare dated analytical predictions against benchtop oscilloscope measurements for every functional requirement and explain physical discrepancies.',
  },
  10: {
    heading: 'Failures and Fixes',
    lede: 'Document real hardware and timing bugs through a closed-loop engineering cycle: symptom, isolation test, root cause, fix, and bench re-measurement.',
  },
  11: {
    heading: 'Engineering Notebook',
    lede: 'A chronological, server-dated laboratory record of weekly objectives, sizing decisions, coursework applied, and lessons learned.',
  },
  12: {
    heading: 'Review Record',
    lede: 'Verbatim faculty panel observations from each review gate paired with your team’s technical response and the exact portfolio pages updated.',
  },
  13: {
    heading: 'Reflections & Forward Links',
    lede: 'Individual engineering reflections on what changed in your thinking, advice for the next cohort, and links to advanced courses and the Minor Project.',
  },
  14: {
    heading: 'Final Demonstration',
    lede: 'Present the working hardware artefact with a timestamped requirement walkthrough video and a single-page A1 technical summary poster.',
  },
  15: {
    heading: 'Project Files',
    lede: 'Central archival index linking to your formal technical report, Verilog RTL repository, schematic capture, and SPICE simulation models.',
  },
}

function shortTabLabel(pageId: number, sec: SectionDef): string {
  const custom = PAGE_META[pageId]?.tabs?.[sec.id]
  if (custom) return custom
  return sec.title.replace(/\s*\(.*?\)\s*/g, '').trim()
}

export function PageEditor() {
  const { slug } = useParams()
  const page = pageBySlug(slug)
  const loc = useLocation()
  const c = useContent()
  const { completed, toggleComplete, markSaved } = useStore()
  const saveStatus = useStore((st) => st.saveStatus)
  const [tab, setTab] = useState<string>('overview')
  const [aiOpen, setAiOpen] = useState(false)

  useEffect(() => {
    if (!page) return
    const hash = loc.hash.replace(/^#/, '')
    if (hash && page.sections.some((s) => s.id === hash)) {
      setTab(hash)
    } else {
      setTab('overview')
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [page?.id, loc.hash])

  if (!page) return <Navigate to="/student/portfolio" replace />

  const first = firstReviewOf(page.id)
  const prev = PAGES[page.id - 1]
  const next = PAGES[page.id + 1]
  const meta = PAGE_META[page.id] ?? { heading: page.title, lede: page.tagline }
  const displayTitle = meta.heading ?? page.title
  const isCompleted = !!completed[page.id]
  const OvComponent = PAGE_OVERVIEWS[page.id]
  const activeSection = page.sections.find((s) => s.id === tab)

  // Portfolio completion across all 16 pages (Home + 15), computed from what the team has actually written
  const totalPages = PAGES.length
  const pp = pageProgress(page, c)
  const readyCount = PAGES.filter((p) => pageProgress(p, c).status === 'ready').length
  const doneCount = readyCount
  const pctComplete = overall(c)
  const canComplete = pp.status === 'ready'
  const todo = page.sections.flatMap((sec, i) => (pp.parts[i] < 0.999 ? [`${shortTabLabel(page.id, sec)} (${sectionGap(page, sec, c)})`] : []))
  const completeHelp = isCompleted
    ? 'This page is marked complete. Click “Completed” to reopen it as a draft.'
    : canComplete
      ? 'Every section is filled in. Click to mark this page complete; you can reopen it later.'
      : `Not available yet. Still to do: ${todo.join('; ')}.`

  const handleSave = () => { void markSaved() }

  const handleGoSection = (sectionId?: string) => {
    setAiOpen(false)
    if (sectionId && page.sections.some((s) => s.id === sectionId)) {
      setTab(sectionId)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <div className="pg">
      {/* Top Breadcrumb + Draft / Save / Mark as Complete bar (spans full workspace width above main + AI Mentor) */}
      <div className="pg-bar">
        <div className="crumb">
          <span className="pill">{first.label}</span>
          <span className="sl">/</span>
          <b>{displayTitle}</b>
        </div>
        <div className="pg-actions">
          <span className={`state-pill ${isCompleted ? 'complete' : ''}`}>
            <i />
            {isCompleted ? 'Complete' : 'Draft'}
          </span>
          <button type="button" className="act" onClick={handleSave}>
            {saveStatus === 'saving' ? <Loader2 size={15} className="spin" /> : saveStatus === 'saved' ? <Check size={15} /> : <Save size={15} />}
            <span className="lb" role="status">{saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving…' : saveStatus === 'error' ? 'Retry save' : 'Save'}</span>
          </button>
          <button
            type="button"
            className={`act solid ${isCompleted ? 'done' : ''}`}
            disabled={!isCompleted && !canComplete}
            onClick={() => toggleComplete(page.id)}
          >
            <Check size={15} strokeWidth={2.6} />
            <span className="lb">{isCompleted ? 'Completed' : 'Mark as Complete'}</span>
          </button>
          <Info text={completeHelp} label={isCompleted ? 'About reopening this page' : 'Why can’t I mark this page complete?'} />
        </div>
      </div>

      <div className="pg-main">
        {/* Page Header Band with Number Badge, Serif Title, Lede, and Line Art */}
        <header className="ph">
          <div className="ph-no">{page.id === 0 ? 'H' : String(page.id).padStart(2, '0')}</div>
          <div className="ph-txt">
            <div className="ph-eyebrow">
              <span>PORTFOLIO</span>
              <span className="dotsep">•</span>
              <span>{page.title.toUpperCase()}</span>
            </div>
            <h1>{displayTitle}</h1>
            <p className="lede">{meta.lede}</p>
          </div>
          <PageArt pageId={page.id} />
        </header>

        {/* Horizontal Tab Bar: Overview + Section Tabs */}
        <div className="ph-ptabs" role="tablist" aria-label="Page sections">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'overview'}
            className={`ptab ${tab === 'overview' ? 'on' : ''}`}
            onClick={() => setTab('overview')}
          >
            Overview
          </button>
          {page.sections.map((sec) => {
            const sp = sectionProgress(page, sec, c)
            return (
              <button
                key={sec.id}
                type="button"
                role="tab"
                aria-selected={tab === sec.id}
                className={`ptab ${tab === sec.id ? 'on' : ''}`}
                onClick={() => setTab(sec.id)}
              >
                {shortTabLabel(page.id, sec)}
                {sp >= 0.99 ? <i className="tick" title="Complete" /> : sp > 0 ? <i className="tick part" title="In progress" /> : null}
              </button>
            )
          })}
        </div>

        {/* Main Content Body: Animated Overview or Section Editor */}
        <div className="pg-body">
          <AnimatePresence mode="wait">
            {tab === 'overview' || !activeSection ? (
              <motion.div
                key={`${page.id}-overview`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: [0.22, 0.8, 0.3, 1] }}
              >
                {OvComponent && <OvComponent page={page} c={c} edit={(secId) => setTab(secId)} />}
              </motion.div>
            ) : (
              <motion.div
                key={`${page.id}-${activeSection.id}`}
                className="ed"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: [0.22, 0.8, 0.3, 1] }}
              >
                <div className="ed-head">
                  <div>
                    <span className="eyebrow">Editing Section</span>
                    <h2>{activeSection.title}</h2>
                    <p>{activeSection.prompt}</p>
                  </div>
                  <button type="button" className="act" onClick={() => setTab('overview')}>
                    <ArrowLeft size={15} /> Back to Overview
                  </button>
                </div>

                {page.id === 3 && activeSection.id === 'compare' && (
                  <div className="ed-card">
                    <h3 style={{ font: '700 17px var(--font-display)' }}>Weighted Comparison Matrix</h3>
                    <p className="muted" style={{ fontSize: 13 }}>Score each concept from 1 to 5 on every weighted criterion. The Overview tab renders the comparative evaluation table automatically.</p>
                    <ComparisonMatrixEditor />
                  </div>
                )}

                <div className="ed-card">
                  {activeSection.type === 'prose' && <ProseEditor page={page} sec={activeSection} />}
                  {activeSection.type === 'rows' && <RowsEditor page={page} sec={activeSection} />}
                  {activeSection.type === 'evidence' && <p className="hint">{activeSection.hint}</p>}
                  {(activeSection.type === 'evidence' || activeSection.wantsEvidence) && (
                    <EvidenceStrip page={page} sectionId={activeSection.id} requiredLook={activeSection.type === 'evidence'} />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right Contextual AI Mentor Aside */}
      <div className={`pg-aside ${aiOpen ? 'open' : ''}`}>
        <button className="icon-btn mp-close" aria-label="Close AI Mentor" onClick={() => setAiOpen(false)}>
          <X size={18} />
        </button>
        <AIPanel page={page} content={c} onGo={handleGoSection} />
      </div>

      {/* Sticky Bottom Navigation & Progress Footer (spans full workspace width) */}
      <footer className="pg-foot">
        {prev ? (
          <Link className="fn prev" to={`/student/portfolio/${prev.slug}`}>
            <ArrowLeft size={18} />
            <div className="tx">
              <b>Previous</b>
              <small>{prev.id === 0 ? '00 Home' : `${String(prev.id).padStart(2, '0')} ${prev.title}`}</small>
            </div>
          </Link>
        ) : (
          <span />
        )}

        <div className="fp">
          <div className="fp-row">
            <div className="fp-lbl">
              <b>Portfolio Progress</b>
              <small>{doneCount} of {totalPages} pages ready</small>
            </div>
            <div className="fp-bar">
              <Bar pct={pctComplete} />
              <span>{Math.round(pctComplete)}%</span>
            </div>
          </div>
        </div>

        {next ? (
          <Link className="fn next" to={`/student/portfolio/${next.slug}`}>
            <div>
              <b>Next <ArrowRight size={14} /></b>
              <small>{String(next.id).padStart(2, '0')} {next.title}</small>
            </div>
            <ArrowRight size={18} />
          </Link>
        ) : (
          <Link className="fn next" to="/student/submit">
            <div>
              <b>Review &amp; Submit <ArrowRight size={14} /></b>
              <small>Final readiness check</small>
            </div>
            <ArrowRight size={18} />
          </Link>
        )}
      </footer>

      <button className="mp-fab" aria-label="Open AI Mentor" onClick={() => setAiOpen(true)}>
        <Sparkles size={18} /> AI Mentor
      </button>
      {aiOpen && <div className="scrim" onClick={() => setAiOpen(false)} />}
    </div>
  )
}
