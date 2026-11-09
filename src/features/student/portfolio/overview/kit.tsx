import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Pencil, Plus } from 'lucide-react'
import type { PageDef } from '../../../../data/pages'
import { skey, type Content } from '../../../../lib/progress'
import type { Row } from '../../../../state/store'
import { EvidenceFigure } from '../Sections'
import { Info, norm, pagePath, pageNo } from '../guide'

export { norm }

/** Props every page overview receives. `edit(sectionId)` jumps to that section's editing tab. */
export interface OvProps { page: PageDef; c: Content; edit: (sectionId: string) => void }

export const rowsOf = (c: Content, pageId: number, sec: string): Row[] => c.rows[skey(pageId, sec)] ?? []
export const proseOf = (c: Content, pageId: number, sec: string) => (c.prose[skey(pageId, sec)] ?? '').trim()
export const filled = (s?: string) => !!(s ?? '').trim()
export const initialsOf = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '·'

/** Numbered documentation section, e.g. “3.2 Comparative Evaluation”, with a quiet edit affordance. */
export function OvSection({ no, title, sub, onEdit, editLabel = 'Edit', children, className = '', aside }: { no?: string; title: string; sub?: string; onEdit?: () => void; editLabel?: string; children: ReactNode; className?: string; aside?: ReactNode }) {
  return (
    <section className={`ovs ${className}`}>
      <header className="ovs-h">
        <div>
          <h2>{no && <span className="no">{no}</span>}{title}</h2>
          {sub && <p>{sub}</p>}
        </div>
        <div className="ovs-r">{aside}{onEdit && <button className="ovs-edit" onClick={onEdit}><Pencil size={13} /> {editLabel}</button>}</div>
      </header>
      {children}
    </section>
  )
}

/** Empty state. `link` points to the page this depends on (shown as a link-styled action, before any "add" button). */
export function Blank({ title, text, cta, onClick, compact, link }: { title: string; text?: string; cta?: string; onClick?: () => void; compact?: boolean; link?: { to: string; label: string } }) {
  return (
    <div className={`blank ${compact ? 'compact' : ''}`}>
      <b>{title}</b>
      {text && <p>{text}</p>}
      {link && <Link className="plink" to={link.to}>{link.label}<ArrowUpRight size={12} /></Link>}
      {cta && onClick && <button className="act" style={{ height: 36, marginTop: 4 }} onClick={onClick}><Plus size={15} /> {cta}</button>}
    </div>
  )
}

export function Tag({ tone, children, mono, title }: { tone?: 'ok' | 'warn' | 'no' | 'info' | 'maroon' | 'solid'; children: ReactNode; mono?: boolean; title?: string }) {
  return <span title={title} className={`tag ${tone ?? ''} ${mono ? 'mono' : ''}`}>{children}</span>
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return <span className="av" style={{ width: size, height: size, fontSize: size * 0.34 }} aria-hidden="true">{initialsOf(name)}</span>
}

/**
 * FR reference chip: flags a reference that is not in the FR table (the same cross-check the AI makes).
 * With `link`, a missing reference becomes a link to the FR table on Page 04 that says why it is flagged.
 */
export function FrRef({ no, frs, link }: { no?: string; frs: Set<string>; link?: boolean }) {
  if (!filled(no)) return <span className="dash">—</span>
  const known = frs.size === 0 || frs.has(norm(no))
  if (!known && link) {
    return <Link to={pagePath(4)} className="tag warn mono is-link" title={`${no!.trim()} is not in the Functional Requirements table on ${pageNo(4)}. Open it to add or correct the requirement.`}>{no!.trim()} · not in FR table<ArrowUpRight size={11} /></Link>
  }
  return <Tag tone={known ? 'maroon' : 'warn'} mono title={known ? undefined : 'Not found in the Functional Requirements table'}>{no!.trim()}{!known && ' ?'}</Tag>
}

export const frSetOf = (c: Content) => new Set(rowsOf(c, 4, 'frtable').map((r) => norm(r.v.no)).filter(Boolean))

const NUM = /(\d(?:[\d.,]*\d)?(?:\s?(?:%|dB|bits?|ms|µs|ns|[kMGµmnp]?(?:Hz|V|A|Ω|F|W|s)|V\/V|×))?)/g
const HEDGE = /\b(assum\w*|approximately|probably|roughly|should be|likely|maybe)\b/gi
/** Reading-view text: quantities in maroon, unsupported hedges underlined like an editor's mark. */
export function Rich({ text, marks = true }: { text: string; marks?: boolean }) {
  if (!marks) return <>{text}</>
  const parts = text.split(new RegExp(`${HEDGE.source}|${NUM.source}`, 'gi'))
  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null
        if (new RegExp(`^(?:${HEDGE.source})$`, 'i').test(part)) return <mark key={i} className="hedge" title="Assumption — what is it based on?">{part}</mark>
        if (/\d/.test(part) && new RegExp(`^${NUM.source}$`).test(part)) return <b key={i} className="qty">{part}</b>
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

/** Splits free prose into bullet-sized sentences. */
export const sentences = (t: string) => t.split(/(?<=[.!?])\s+(?=[A-Z0-9])/).map((s) => s.trim()).filter(Boolean)

export function Evidences({ c, pageId, sectionId, onAdd, empty }: { c: Content; pageId: number; sectionId: string; onAdd?: () => void; empty?: string }) {
  const list = c.evidence.filter((e) => e.pageId === pageId && e.sectionId === sectionId)
  if (!list.length) return empty ? <Blank compact title={empty} cta="Attach evidence" onClick={onAdd} /> : null
  return <div className="ev-strip">{list.map((e) => <EvidenceFigure key={e.id} e={e} />)}</div>
}

export function Stat({ value, label, tone, sub, info }: { value: ReactNode; label: string; tone?: 'ok' | 'warn' | 'no'; sub?: string; info?: string }) {
  return <div className={`stat2 ${tone ?? ''}`}><b>{value}</b><span>{info ? <>{label.replace(/\s*\S+$/, ' ')}<span style={{ whiteSpace: 'nowrap' }}>{label.match(/\S+$/)?.[0]}<Info text={info} label={`About “${label}”`} /></span></> : label}</span>{sub && <small>{sub}</small>}</div>
}

export function PageLink({ pageId, slug, children }: { pageId: number; slug: string; children: ReactNode }) {
  return <Link className="plink" to={`/student/portfolio/${slug}`} data-p={pageId}>{children}<ArrowUpRight size={12} /></Link>
}

/** Parses the leading number out of a value such as “880 kHz”, “±2 %” or “−1.6 %”. */
export function num(s = ''): { n: number; unit: string } | null {
  const m = s.replace(/[−–]/g, '-').match(/(-?\d+(?:[.,]\d+)?)\s*([a-zA-ZµΩ%/×]*)/)
  if (!m) return null
  const mult: Record<string, number> = { k: 1e3, K: 1e3, M: 1e6, G: 1e9, m: 1e-3, µ: 1e-6, n: 1e-9 }
  const unit = m[2] || ''
  let n = parseFloat(m[1].replace(',', '.'))
  const base = /^(Hz|V|A|Ω|F|W|s)$/
  if (unit.length > 1 && base.test(unit.slice(1)) && mult[unit[0]]) n *= mult[unit[0]]
  return { n, unit: unit.length > 1 && base.test(unit.slice(1)) ? unit.slice(1) : unit }
}

export const fmtDay = (iso: string) => {
  const d = new Date(iso)
  return { day: d.toLocaleDateString('en-GB', { day: '2-digit' }), mon: d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase(), wk: d.toLocaleDateString('en-GB', { weekday: 'short' }), yr: d.getFullYear() }
}
