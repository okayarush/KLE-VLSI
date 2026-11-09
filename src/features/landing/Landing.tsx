import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'
import { ArrowRight, BookOpen, ChartColumn, CirclePlay, Layers, NotebookPen, Sparkles } from 'lucide-react'
import { INSTITUTION, STEPS } from '../../data/handbook'

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin)

const LOGOS = ['/images/kle%20technological%20navbar.png', '/brand/kle-tech-logo.svg', '/brand/kle-tech-logo.png']

/** Official logo if the file exists in public/brand/. It is never recreated; without it the name is set in type. */
function useLogo() {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    ;(async () => {
      for (const u of LOGOS) {
        const ok = await new Promise<boolean>((res) => { const i = new Image(); i.onload = () => res(i.naturalWidth > 0); i.onerror = () => res(false); i.src = u })
        if (ok && live) { setSrc(u); return }
      }
    })()
    return () => { live = false }
  }, [])
  return src
}

/* ------------------------------------------------------------------ header */
function Header() {
  const logo = useLogo()
  const bar = useRef<HTMLElement>(null)
  const head = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(bar.current, { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } })
      ScrollTrigger.create({ start: 8, onToggle: (s) => head.current?.classList.toggle('is-scrolled', s.isActive) })
    })
    return () => ctx.revert()
  }, [])
  return (
    <header className="l-header" ref={head}>
      <Link to="/" className="l-brand" aria-label="KLE Technological University — home">
        {logo ? <img src={logo} alt="KLE Technological University" height={46} /> : <span className="l-wordmark"><b>KLE Technological</b><b>University</b></span>}
      </Link>
      <span className="l-sep" aria-hidden="true" />
      <div className="l-school">
        <b>{INSTITUTION.school}</b>
        <span>ECE <i aria-hidden="true">|</i> {INSTITUTION.departments[1]}</span>
      </div>
      <nav className="l-nav" aria-label="Sections">
        <a href="#overview">Overview</a><a href="#journey">The Journey</a><a href="#portfolio">Portfolio</a><a href="#ai-mentor">AI Mentor</a>
      </nav>
      <Link className="l-cta" to="/signin">Access My Portfolio <ArrowRight size={15} /></Link>
      <i className="l-progress" ref={bar as React.RefObject<HTMLElement>} aria-hidden="true" />
    </header>
  )
}

/* -------------------------------------------------------------------- hero */
const FEATURES = [
  { icon: Layers, a: '16-Step', b: 'Design Chain' },
  { icon: BookOpen, a: '15 Portfolio', b: 'Pages + Home' },
  { icon: Sparkles, a: 'AI-Guided', b: 'Documentation' },
  { icon: ChartColumn, a: 'Review &', b: 'Feedback' },
]

function Words({ text }: { text: string }) {
  return <>{text.split(' ').map((w, i, a) => <span key={i}><span className="w"><span className="w-in">{w}</span></span>{i < a.length - 1 ? ' ' : ''}</span>)}</>
}

function Hero() {
  const root = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const q = gsap.utils.selector(root)
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.from(q('.l-eyebrow'), { autoAlpha: 0, y: 14, duration: 0.6 })
        .from(q('.w-in'), { yPercent: 115, duration: 0.9, stagger: 0.07 }, '-=0.35')
        .from(q('.hero-sub, .hero-cta > *'), { autoAlpha: 0, y: 16, duration: 0.7, stagger: 0.09 }, '-=0.5')
        .from(q('.hero-features li'), { autoAlpha: 0, y: 12, duration: 0.6, stagger: 0.08 }, '-=0.4')
      gsap.from(q('.hero-art img'), { autoAlpha: 0, x: 36, scale: 1.04, duration: 1.4, ease: 'power3.out', delay: 0.15 })
      // slow parallax: the photograph travels less than the page
      gsap.to(q('.hero-art img'), { yPercent: 7, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true } })
    })
    return () => mm.revert()
  }, [])
  return (
    <section id="overview" className="hero" ref={root}>
      <div className="hero-copy">
        <p className="l-eyebrow">Semester V · Academic Year 2026–27</p>
        <h1><Words text="Foundation Integration" /><br /><Words text="Mini Project" /> <em><span className="w"><span className="w-in">Portfolio</span></span></em></h1>
        <p className="hero-sub">Document your engineering journey — from need to demonstration. Build, integrate and defend a working system by bringing together the foundations you’ve learned.</p>
        <div className="hero-cta">
          <Link to="/signin" className="l-btn l-btn-solid">Access My Portfolio <ArrowRight size={15} /></Link>
          <a href="#journey" className="l-btn l-btn-line"><CirclePlay size={17} strokeWidth={1.6} /> Explore the Journey</a>
        </div>
        <ul className="hero-features">
          {FEATURES.map((f) => <li key={f.a}><f.icon size={30} strokeWidth={1.25} aria-hidden="true" /><span><b>{f.a}</b><b>{f.b}</b></span></li>)}
        </ul>
      </div>
      <div className="hero-art">
        <img src="/images/kle-campus-hero.webp" width={1536} height={1024} alt="KLE Technological University campus building lit at dusk" fetchPriority="high" />
      </div>
    </section>
  )
}

/* ----------------------------------------------------- the 16-step chain */
/** 8 columns on desktop, 4 on tablet, a vertical list on phones. Rows alternate direction. */
function useCols() {
  const get = () => (window.matchMedia('(min-width: 1000px)').matches ? 8 : window.matchMedia('(min-width: 600px)').matches ? 4 : 1)
  const [cols, setCols] = useState(get)
  useEffect(() => {
    const qs = [window.matchMedia('(min-width: 1000px)'), window.matchMedia('(min-width: 600px)')]
    const on = () => setCols(get())
    qs.forEach((q) => q.addEventListener('change', on))
    return () => qs.forEach((q) => q.removeEventListener('change', on))
  }, [])
  return cols
}

const UNLIT = { borderColor: '#d9d1cd', color: '#5d5a60', backgroundColor: '#ffffff' }
const LIT = { borderColor: '#a21617', color: '#8d1517', backgroundColor: '#ffffff' }

function JourneyChain() {
  const cols = useCols()
  const root = useRef<HTMLOListElement>(null)
  const vertical = cols === 1
  useLayoutEffect(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const ol = root.current!
      const card = ol.closest('.l-card')!
      const nodes = Array.from(ol.querySelectorAll<HTMLElement>('.jc-node'))
      const q = (el: Element, s: string) => el.querySelector(s)
      const dots = nodes.map((n) => q(n, '.jc-dot')!)
      const labels = nodes.map((n) => q(n, '.jc-label')!)
      gsap.set(dots, UNLIT)
      gsap.set(labels, { color: '#6d6a70' })
      nodes.forEach((n) => {
        const link = q(n, '.jc-link i'), fill = q(n, '.jc-turn .fill'), out = q(n, '.jc-out'), stub = q(n, '.jc-in')
        if (link) gsap.set(link, vertical ? { scaleY: 0 } : { scaleX: 0 })
        if (fill) gsap.set(fill, { drawSVG: '0%' })
        if (out) gsap.set(out, { autoAlpha: 0.35 })
        if (stub) gsap.set(stub, { autoAlpha: 0.5 })
      })
      const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: card, start: 'top 62%', end: 'bottom 40%', scrub: 0.8 } })
      nodes.forEach((n, i) => {
        tl.to(dots[i], { ...LIT, duration: 0.35 }, i).to(labels[i], { color: '#14202b', duration: 0.35 }, i)
        const stub = q(n, '.jc-in'), link = q(n, '.jc-link i'), fill = q(n, '.jc-turn .fill'), out = q(n, '.jc-out')
        if (stub) tl.to(stub, { autoAlpha: 1, duration: 0.3 }, i)
        if (link) tl.to(link, vertical ? { scaleY: 1, duration: 0.65 } : { scaleX: 1, duration: 0.65 }, i + 0.3)
        if (fill) tl.to(fill, { drawSVG: '100%', duration: 0.65 }, i + 0.3)
        if (out) tl.to(out, { autoAlpha: 1, duration: 0.5 }, i + 0.35)
      })
      tl.eventCallback('onUpdate', () => {
        const head = Math.min(15, Math.floor(tl.time() + 0.15))
        nodes.forEach((n, i) => n.classList.toggle('is-head', i === head && tl.time() > 0.05))
      })
      // the card rises into place before the chain starts to draw
      gsap.from(card, { autoAlpha: 0, y: 46, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: card, start: 'top 92%' } })
      gsap.from(card.querySelectorAll('.l-card-head > *'), { autoAlpha: 0, y: 14, duration: 0.7, stagger: 0.1, ease: 'power3.out', scrollTrigger: { trigger: card, start: 'top 86%' } })
    })
    return () => mm.revert()
  }, [cols, vertical])

  return (
    <ol ref={root} className={`jc ${vertical ? 'jc-v' : ''}`} style={{ ['--cols' as string]: cols }} aria-label="Sixteen-step engineering design chain">
      {STEPS.map((s, i) => {
        const row = Math.floor(i / cols), pos = i % cols, rtl = !vertical && row % 2 === 1
        const col = rtl ? cols - 1 - pos : pos
        const last = i === STEPS.length - 1
        const rowEnd = !vertical && pos === cols - 1 && !last
        return (
          <li key={s.n} className={`jc-node ${rtl ? 'rtl' : ''}`} style={vertical ? undefined : { gridColumn: col + 1, gridRow: row + 1 }}>
            {i === 0 && !vertical && <span className="jc-in" aria-hidden="true" />}
            {!last && !rowEnd && <span className="jc-link" aria-hidden="true"><i /></span>}
            {rowEnd && (
              <svg className="jc-turn" viewBox="0 0 66 92" preserveAspectRatio="none" aria-hidden="true">
                <path className="base" d="M0 1 H41 A25 25 0 0 1 66 26 V66 A25 25 0 0 1 41 91 H0" />
                <path className="fill" d="M0 1 H41 A25 25 0 0 1 66 26 V66 A25 25 0 0 1 41 91 H0" />
              </svg>
            )}
            {last && !vertical && <span className="jc-out" aria-hidden="true" />}
            <span className="jc-dot" title={`Step ${s.n} — ${s.name}${s.star ? ' (added July 2026)' : ''}`}>
              <span>{String(s.n).padStart(2, '0')}</span>
              {s.star && <i className="jc-star" role="img" aria-label="added July 2026">★</i>}
            </span>
            <span className="jc-label">{s.short}</span>
          </li>
        )
      })}
    </ol>
  )
}

function Journey() {
  return (
    <section id="journey" className="journey">
      <div className="l-card">
        <div className="l-card-head">
          <div>
            <p className="l-eyebrow">The engineering journey</p>
            <h2 className="l-h2-lg">The 16-Step Engineering Design Chain</h2>
          </div>
          <p className="l-card-note">A structured, evidence-driven process from problem identification to final demonstration.</p>
        </div>
        <JourneyChain />
      </div>
    </section>
  )
}

/* ----------------------------------------------------------------- features */
const CARDS = [
  { id: 'portfolio', icon: NotebookPen, title: 'Portfolio Workspace', text: 'Create a structured, evidence-based project portfolio across Home and fifteen pages.' },
  { id: 'ai-mentor', icon: Sparkles, title: 'AI Mentor', text: 'Get contextual guidance, practise technical questions and improve your documentation.' },
  { id: 'readiness', icon: ChartColumn, title: 'Review Readiness', text: 'See what each review expects and what is still missing — advisory only.' },
  { id: 'evidence', icon: Layers, title: 'Engineering Evidence', text: 'Upload designs, calculations, tests and validation results in one place.' },
]

/**
 * A pen-and-line study of the actual campus photograph: the photo is run through an edge filter, so nothing here is
 * drawn by hand or invented.
 */
function Sketch() {
  return (
    <>
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
        <filter id="kle-sketch" colorInterpolationFilters="sRGB" x="0" y="0" width="100%" height="100%">
          <feColorMatrix type="saturate" values="0" />
          <feGaussianBlur stdDeviation="0.55" />
          <feConvolveMatrix order="3" kernelMatrix="-1 -1 -1 -1 8 -1 -1 -1 -1" divisor="1" bias="0.5" preserveAlpha="true" edgeMode="duplicate" />
          <feComponentTransfer>
            <feFuncR type="table" tableValues="0.55 0.8 1 1 1 0.8 0.55" />
            <feFuncG type="table" tableValues="0.45 0.78 1 1 1 0.78 0.45" />
            <feFuncB type="table" tableValues="0.45 0.78 1 1 1 0.78 0.45" />
          </feComponentTransfer>
        </filter>
      </svg>
      <div className="sketch" aria-hidden="true"><img src="/images/kle-campus-hero.webp" alt="" loading="lazy" width={1536} height={1024} /></div>
    </>
  )
}

function Features() {
  const root = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const q = gsap.utils.selector(root)
      const st = { trigger: root.current, start: 'top 78%' }
      gsap.from(q('.feat-head h2 .w-in'), { yPercent: 115, duration: 0.9, stagger: 0.08, ease: 'power3.out', scrollTrigger: st })
      gsap.from(q('.l-rule'), { scaleX: 0, transformOrigin: 'left', duration: 0.8, delay: 0.5, ease: 'power3.out', scrollTrigger: st })
      q('.fcard').forEach((c: Element, i: number) => {
        const trigger = { trigger: c, start: 'top 90%' }
        gsap.from(c, { autoAlpha: 0, y: 34, duration: 0.8, delay: (i % 2) * 0.1, ease: 'power3.out', scrollTrigger: trigger })
        gsap.from(c.querySelectorAll('.fcard-icon svg *'), { drawSVG: '0%', duration: 1.1, delay: 0.25 + (i % 2) * 0.1, ease: 'power2.inOut', scrollTrigger: trigger })
      })
      gsap.fromTo(q('.sketch'), { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', ease: 'none', scrollTrigger: { trigger: root.current, start: 'top 70%', end: 'bottom 75%', scrub: 0.8 } })
    })
    return () => mm.revert()
  }, [])
  return (
    <section className="feat" ref={root}>
      <div className="feat-inner">
        <div className="feat-head">
          <h2><Words text="More than a project." /><br /><Words text="A complete" /><br /><Words text="engineering record." /></h2>
          <span className="l-rule" aria-hidden="true" />
        </div>
        <div className="fcards">
          {CARDS.map((c) => (
            <article key={c.id} id={c.id} className="fcard">
              <span className="fcard-icon"><c.icon size={30} strokeWidth={1.6} aria-hidden="true" /></span>
              <div><h3>{c.title}</h3><p>{c.text}</p></div>
            </article>
          ))}
        </div>
      </div>
      <Sketch />
    </section>
  )
}

/* ------------------------------------------------------------------ footer */
function Board() {
  return (
    <svg className="board" viewBox="0 0 620 230" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M0 150 H120 L160 110 H300 L340 70 H470 L500 40 H620" />
        <path d="M0 190 H90 L130 150 H260 L300 190 H400 L440 150 H620" />
        <path d="M80 230 V200 L120 170 H220" />
        <path d="M250 0 V40 L280 70 H380" />
        <path d="M430 230 V190 L470 150" />
      </g>
      <g fill="#3a1d22" stroke="currentColor" strokeWidth="1.1">{[[160, 110], [340, 70], [500, 40], [130, 150], [300, 190], [440, 150], [380, 70]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3.6" />)}</g>
    </svg>
  )
}

function Footer() {
  const root = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const q = gsap.utils.selector(root)
      const st = { trigger: root.current, start: 'top 85%' }
      gsap.from(q('.foot-bar'), { scaleY: 0, transformOrigin: 'top', duration: 0.8, ease: 'power3.out', scrollTrigger: st })
      gsap.from(q('.foot-text > *'), { autoAlpha: 0, y: 16, duration: 0.8, stagger: 0.12, delay: 0.2, ease: 'power3.out', scrollTrigger: st })
      gsap.from(q('.board g path'), { drawSVG: '0%', duration: 2, stagger: 0.15, ease: 'power2.inOut', scrollTrigger: st })
      gsap.from(q('.board circle'), { scale: 0, transformOrigin: 'center', duration: 0.5, stagger: 0.1, delay: 0.9, ease: 'back.out(2)', scrollTrigger: st })
    })
    return () => mm.revert()
  }, [])
  return (
    <footer className="foot" ref={root}>
      <div className="foot-main">
        <div className="foot-dept">
          <span className="foot-bar" aria-hidden="true" />
          <div className="foot-text">
            <p className="foot-eyebrow">Department of</p>
            <p className="foot-name">{INSTITUTION.departments.map((d) => <span key={d}>{d}</span>)}</p>
          </div>
        </div>
        <Board />
      </div>
      <p className="foot-note">{INSTITUTION.school} · {INSTITUTION.university}, {INSTITUTION.city} · Prototype — demo data only; AI features are simulated previews.</p>
    </footer>
  )
}

export function Landing() {
  return (
    <div className="landing">
      <a className="skip-link" href="#journey">Skip to content</a>
      <Header />
      <main>
        <Hero />
        <Journey />
        <Features />
      </main>
      <Footer />
    </div>
  )
}
