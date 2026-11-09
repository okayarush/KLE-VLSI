import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Calculator, Info as InfoIcon, Link2, PenLine, RefreshCw } from 'lucide-react'
import { PAGES } from '../../../data/pages'

/**
 * Small usability helpers shared by the page editor and the page overviews.
 * They add words and links to the existing UI; they do not introduce new layouts.
 */

/** Router path of a portfolio page, e.g. pagePath(4) → /student/portfolio/functional-requirements */
export const pagePath = (pageId: number) => `/student/portfolio/${PAGES[pageId].slug}`
/** “Page 04” */
export const pageNo = (pageId: number) => `Page ${String(pageId).padStart(2, '0')}`
/** Normalises an FR reference for comparison: “fr - 01” → “FR-01”. */
export const norm = (s = '') => s.trim().toUpperCase().replace(/\s+/g, '')

/* ---------------------------------------------------------------- Info (ⓘ) tooltip */

/**
 * A help tooltip that works with every input type:
 *  - mouse: hover (the tip stays open while the pointer is over it);
 *  - keyboard: appears on keyboard focus, Esc dismisses, Enter/Space toggles;
 *  - touch: tap to open, tap anywhere else to close.
 * The text is also always present (visually hidden) and linked with aria-describedby for screen readers.
 */
export function Info({ text, label = 'More information' }: { text: string; label?: string }) {
  const id = useId()
  const btn = useRef<HTMLButtonElement>(null)
  const tip = useRef<HTMLSpanElement>(null)
  const timer = useRef<number | undefined>(undefined)
  const [hover, setHover] = useState(false)
  const [focus, setFocus] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const show = (hover || focus || pinned) && !dismissed

  const place = useCallback(() => {
    const b = btn.current, t = tip.current
    if (!b || !t) return
    const r = b.getBoundingClientRect(), tw = t.offsetWidth, th = t.offsetHeight, m = 8
    const left = Math.min(Math.max(m, r.left + r.width / 2 - tw / 2), window.innerWidth - tw - m)
    const below = r.bottom + 6
    const top = below + th + m > window.innerHeight && r.top - th - 6 > m ? r.top - th - 6 : below
    setPos({ top, left })
  }, [])

  useLayoutEffect(() => { if (show) place(); else setPos(null) }, [show, place])

  useEffect(() => {
    if (!show) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setDismissed(true); setPinned(false) } }
    const onDown = (e: PointerEvent) => {
      const n = e.target as Node
      if (btn.current?.contains(n) || tip.current?.contains(n)) return
      setPinned(false)
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [show, place])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const enter = (e: React.PointerEvent) => { if (e.pointerType !== 'mouse') return; window.clearTimeout(timer.current); setHover(true); setDismissed(false) }
  const leave = (e: React.PointerEvent) => { if (e.pointerType !== 'mouse') return; window.clearTimeout(timer.current); timer.current = window.setTimeout(() => { setHover(false); setDismissed(false) }, 120) }

  return (
    <>
      {/* word joiner: keeps the icon on the same line as the word before it, so headers don't grow taller */}
      {'⁠'}
      <button
        ref={btn}
        type="button"
        className="info-btn"
        aria-label={label}
        aria-describedby={`${id}-d`}
        aria-expanded={show}
        onPointerEnter={enter}
        onPointerLeave={leave}
        onFocus={(e) => { if (e.currentTarget.matches(':focus-visible')) { setFocus(true); setDismissed(false) } }}
        onBlur={() => { setFocus(false); setDismissed(false) }}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (show) { setPinned(false); setDismissed(true) } else { setPinned(true); setDismissed(false) } }}
      >
        <InfoIcon size={13} aria-hidden="true" />
      </button>
      <span id={`${id}-d`} className="sr-only">{text}</span>
      {show && createPortal(
        <span
          ref={tip}
          role="tooltip"
          className="info-tip"
          style={{ top: pos?.top ?? 0, left: pos?.left ?? 0, visibility: pos ? 'visible' : 'hidden' }}
          onPointerEnter={enter}
          onPointerLeave={leave}
        >
          {text}
        </span>,
        document.body,
      )}
    </>
  )
}

/* ---------------------------------------------------------------- SourceBadge */

export type SourceKind = 'auto' | 'linked' | 'calc' | 'entered'
const SRC_ICON = { auto: RefreshCw, linked: Link2, calc: Calculator, entered: PenLine } as const

/**
 * Says where a piece of information comes from:
 *  auto    – drawn automatically from other entries (read-only)
 *  linked  – read from another page (read-only; pass `to` to link there)
 *  calc    – a number the app works out for you (read-only)
 *  entered – typed by you
 * A badge with `to` is a link (solid, maroon, arrow). Without it the badge is plain, dashed and not clickable.
 */
export function SourceBadge({ kind, children, to, info }: { kind: SourceKind; children: ReactNode; to?: string; info?: string }) {
  const Icon = SRC_ICON[kind]
  return (
    <span className="src-wrap">
      {to
        ? <Link to={to} className={`src ${kind} is-link`}><Icon size={11} aria-hidden="true" />{children}<ArrowUpRight size={11} aria-hidden="true" /></Link>
        : <span className={`src ${kind}`}><Icon size={11} aria-hidden="true" />{children}</span>}
      {info && <Info text={info} label="Where does this come from?" />}
    </span>
  )
}
