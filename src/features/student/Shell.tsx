import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bell, CheckCircle2, ChevronDown, Home, LogOut, Menu, RotateCcw, Search, X } from 'lucide-react'
import { INSTITUTION, firstReviewOf, pagesLiveAt } from '../../data/handbook'
import { PAGES } from '../../data/pages'
import { ago, pageProgress } from '../../lib/progress'
import { useStore } from '../../state/store'
import { signOutAll } from '../auth/bootstrap'
import { useContent, useTeam } from './hooks'

const NAV = [
  { to: '/student', label: 'Dashboard', end: true },
  { to: '/student/portfolio', label: 'Portfolio' },
  { to: '/student/team', label: 'My team' },
  { to: '/student/evidence', label: 'Evidence' },
  { to: '/student/mentor', label: 'AI Mentor' },
  { to: '/student/submit', label: 'Review & submit' },
]
const MORE = [
  { to: '/student/analysis', label: 'AI analysis' },
  { to: '/student/feedback', label: 'Faculty feedback' },
]

export const initials = (name = 'S') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || 'S'

/** Closes a popover on outside click / Escape. */
function usePopover() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const down = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', down); document.addEventListener('keydown', key)
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key) }
  }, [open])
  return { open, setOpen, ref }
}

function SearchPop() {
  const { open, setOpen, ref } = usePopover()
  const [q, setQ] = useState('')
  const nav = useNavigate()
  const hits = useMemo(() => {
    const t = q.trim().toLowerCase()
    const out: { to: string; title: string; sub: string }[] = []
    for (const p of PAGES) {
      const pageLabel = p.id === 0 ? 'Home' : `${String(p.id).padStart(2, '0')} ${p.title}`
      if (!t || `${p.title} ${p.tagline}`.toLowerCase().includes(t)) out.push({ to: `/student/portfolio/${p.slug}`, title: pageLabel, sub: p.tagline })
      if (t) for (const s of p.sections) if (s.title.toLowerCase().includes(t)) out.push({ to: `/student/portfolio/${p.slug}#${s.id}`, title: s.title, sub: `in ${p.title}` })
    }
    return out.slice(0, 9)
  }, [q])
  return (
    <div className="ws-pop-wrap" ref={ref}>
      <button className="icon-btn" aria-label="Search the portfolio" aria-expanded={open} onClick={() => { setOpen(!open); setQ('') }}><Search size={20} /></button>
      {open && (
        <div className="ws-pop" style={{ width: 340 }} role="dialog" aria-label="Search the portfolio">
          <div className="ws-search-box"><Search size={16} /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search pages and sections…" aria-label="Search pages and sections" onKeyDown={(e) => { if (e.key === 'Enter' && hits[0]) { nav(hits[0].to); setOpen(false) } }} /></div>
          <div className="ws-pop-list">
            {hits.map((h) => <Link key={h.to} to={h.to} onClick={() => setOpen(false)}><span><b style={{ fontWeight: 600, display: 'block' }}>{h.title}</b><span className="muted" style={{ fontSize: 12 }}>{h.sub}</span></span></Link>)}
            {hits.length === 0 && <div className="ws-pop-empty">Nothing matches “{q}”.</div>}
          </div>
        </div>
      )}
    </div>
  )
}

function BellPop() {
  const { open, setOpen, ref } = usePopover()
  const mentor = useStore((s) => s.mentor)
  const activity = useStore((s) => s.activity)
  const openQs = mentor.flatMap((m) => m.questions).filter((q) => q.status === 'open')
  return (
    <div className="ws-pop-wrap" ref={ref}>
      <button className="icon-btn" aria-label={`Notifications${openQs.length ? `, ${openQs.length} unanswered mentor question${openQs.length === 1 ? '' : 's'}` : ''}`} aria-expanded={open} onClick={() => setOpen(!open)}>
        <Bell size={20} />{openQs.length > 0 && <i className="ws-bell-n" />}
      </button>
      {open && (
        <div className="ws-pop" style={{ width: 330 }}>
          <span className="eyebrow pop-h">Needs your attention</span>
          {openQs.length ? <Link to="/student/mentor" onClick={() => setOpen(false)}><span><b style={{ fontWeight: 600, display: 'block' }}>{openQs.length} unanswered AI Mentor question{openQs.length === 1 ? '' : 's'}</b><span className="muted" style={{ fontSize: 12 }}>Open the mentor to reply</span></span></Link> : <div className="ws-pop-empty">Nothing waiting for you.</div>}
          <span className="eyebrow pop-h" style={{ marginTop: 6 }}>Recent activity</span>
          <div className="ws-pop-list">
            {activity.slice(0, 5).map((a, i) => <div key={i} className="ws-pop-empty" style={{ padding: '7px 10px', display: 'flex', justifyContent: 'space-between', gap: 10, color: 'var(--text)' }}><span>{a.text}</span><span className="muted mono" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{ago(a.at)}</span></div>)}
          </div>
        </div>
      )}
    </div>
  )
}

export function StudentShell() {
  const [drawer, setDrawer] = useState(false)
  const account = usePopover()
  const project = usePopover()
  const loc = useLocation()
  const team = useTeam()
  const c = useContent()
  const { session, resetDemo, completed } = useStore()
  const isDemo = session?.mode === 'demo'
  const live = pagesLiveAt(team.currentReview)
  const inPortfolioPage = /^\/student\/portfolio\/[^/]+/.test(loc.pathname)
  const activeSlug = inPortfolioPage ? loc.pathname.split('/')[3] : ''

  useEffect(() => setDrawer(false), [loc.pathname])
  useEffect(() => { if (!inPortfolioPage) window.scrollTo({ top: 0 }) }, [loc.pathname, inPortfolioPage])

  return (
    <div className={`ws ${isDemo ? 'has-banner' : ''}`}>
      <a className="skip" href="#main">Skip to content</a>
      {isDemo && <div className="demo-banner" role="status"><b>Demo project</b> — fictional presentation data. Your real portfolio is separate. <button type="button" onClick={async () => { await signOutAll(); window.location.assign('/signin') }}>Exit demo</button></div>}

      <header className="ws-top">
        <button className="icon-btn ws-menu-btn" aria-label="Open navigation" onClick={() => setDrawer(true)}><Menu size={22} /></button>
        <Link to="/student" className="ws-brand" aria-label="KLE Technological University — workspace home">
          <img className="ws-logo" src="/images/kle technological navbar.png" alt="KLE Technological University" />
          <span className="ws-brand-sep" />
          <span className="ws-brand-t"><b>{INSTITUTION.programme}</b><span>Semester V &nbsp;|&nbsp; AY 2026–27</span></span>
        </Link>
        <nav className="ws-nav" aria-label="Workspace">
          {NAV.map((n) => <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'on' : '')}>{n.label}</NavLink>)}
        </nav>
        <div className="ws-tools">
          <SearchPop />
          <BellPop />
          <div className="ws-pop-wrap" ref={account.ref}>
            <button className="ws-avatar" aria-haspopup="menu" aria-expanded={account.open} aria-label="Account menu" onClick={() => account.setOpen(!account.open)}>{initials(session?.name)}</button>
            {account.open && (
              <div className="ws-pop" role="menu">
                <div className="ws-pop-id"><b>{session?.name}</b><span className="muted">{session?.email}</span></div>
                {MORE.map((m) => <Link key={m.to} to={m.to} role="menuitem" onClick={() => account.setOpen(false)}>{m.label}</Link>)}
                {isDemo && <button role="menuitem" onClick={() => { resetDemo(); account.setOpen(false) }}><RotateCcw size={15} /> Reset demo data</button>}
                <button role="menuitem" onClick={async () => { await signOutAll(); window.location.assign('/') /* full navigation: avoids the route guard redirecting to /signin */ }}><LogOut size={15} /> Sign out</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {drawer && <div className="scrim" onClick={() => setDrawer(false)} />}
      <aside className={`ws-side ${drawer ? 'open' : ''}`} aria-label="Portfolio navigation">
        <div className="ws-switch" ref={project.ref}>
          <button aria-haspopup="menu" aria-expanded={project.open} onClick={() => project.setOpen(!project.open)}>
            <span><b>{team.artefact}</b><span>{team.name}</span></span>
            <ChevronDown size={17} style={{ flex: 'none', transition: 'rotate .2s', rotate: project.open ? '180deg' : '0deg' }} />
          </button>
          {project.open && (
            <div className="ws-pop" role="menu">
              <div className="ws-pop-id"><span className="eyebrow">Theme {team.theme.n}</span><b style={{ marginTop: 5 }}>{team.theme.name}</b></div>
              {[...NAV, ...MORE].map((n) => <Link key={n.to} to={n.to} role="menuitem" onClick={() => project.setOpen(false)}>{n.label}</Link>)}
            </div>
          )}
        </div>

        <div className="ws-mobile-nav">
          <span className="ws-side-h" style={{ paddingLeft: 12 }}>Workspace</span>
          {[...NAV, ...MORE].map((n) => <NavLink key={n.to} to={n.to} end={'end' in n && typeof n.end === 'boolean' ? n.end : undefined} className={({ isActive }) => `ws-item ${isActive ? 'on' : ''}`}><span className="t">{n.label}</span></NavLink>)}
          <div className="ws-sep" style={{ margin: '8px 2px' }} />
        </div>

        <div className="ws-side-h">Portfolio</div>
        <nav className="ws-list" aria-label="Portfolio pages">
          {PAGES.map((p) => {
            const st = pageProgress(p, c).status
            const done = !!completed[p.id]
            const isNew = live.includes(p.id) && firstReviewOf(p.id).id === team.currentReview
            const on = p.slug === activeSlug
            return (
              <Link key={p.id} to={`/student/portfolio/${p.slug}`} className={`ws-item ${on ? 'on' : ''}`} aria-current={on ? 'page' : undefined}>
                {p.id === 0 ? <Home className="home-ic" size={18} /> : <span className="no">{String(p.id).padStart(2, '0')}</span>}
                <span className="t">{p.title}</span>
                {done ? <span className="st" title="Marked complete"><CheckCircle2 size={15} /></span>
                  : st === 'progress' ? <span className="st prog" title="In progress" />
                  : isNew ? <span className="st newp" title={`New for ${firstReviewOf(p.id).label}`} /> : null}
              </Link>
            )
          })}
        </nav>
        <div className="ws-campus" aria-hidden="true"><img src="/images/kle-campus-sketch.png" alt="" /></div>
        <button className="icon-btn" style={{ display: drawer ? 'grid' : 'none', position: 'absolute', right: 8, top: 8 }} aria-label="Close navigation" onClick={() => setDrawer(false)}><X size={18} /></button>
      </aside>

      <motion.main key={inPortfolioPage ? 'portfolio' : loc.pathname} id="main" className={`ws-main ${inPortfolioPage ? '' : 'ws-pagewrap'}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.26, ease: [0.22, 0.8, 0.3, 1] }}>
        {inPortfolioPage ? <Outlet /> : <div className="ws-content"><Outlet /></div>}
      </motion.main>
    </div>
  )
}
