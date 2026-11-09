import { lazy, Suspense, useState } from 'react'
import { CheckCircle2, ChevronDown, FileText, Film, ImageIcon, Paperclip, Plus, Trash2 } from 'lucide-react'
import { Button, Chip } from '../../../design-system'
import type { FieldDef, PageDef, ProseSection, RowsSection, EvidenceSection } from '../../../data/pages'
import { fmtDate, sectionProgress, words, type Content } from '../../../lib/progress'
import { demoPreviews } from '../../../lib/previews'
import { evidenceUrls } from '../../../state/remote'
import { key, useStore, type EvidenceItem, type Row } from '../../../state/store'
import { AttachDialog } from '../AttachDialog'

const RichText = lazy(() => import('./RichText'))

/* ---------- evidence strip: evidence sits BESIDE the step it supports ---------- */
export function EvidenceStrip({ page, sectionId, requiredLook }: { page: PageDef; sectionId: string; requiredLook?: boolean }) {
  const evidence = useStore((s) => s.evidence)
  const remove = useStore((s) => s.removeEvidence)
  const [open, setOpen] = useState(false)
  const mine = evidence.filter((e) => e.pageId === page.id && e.sectionId === sectionId)
  return (
    <div className="ev-strip">
      {mine.map((e) => <EvidenceFigure key={e.id} e={e} onRemove={() => remove(e.id)} />)}
      <Button variant={requiredLook && mine.length === 0 ? 'accent' : 'ghost'} size="sm" onClick={() => setOpen(true)}><Paperclip size={14} /> Attach evidence</Button>
      <AttachDialog open={open} onClose={() => setOpen(false)} target={{ pageId: page.id, sectionId }} />
    </div>
  )
}

export function EvidenceFigure({ e, onRemove }: { e: EvidenceItem; onRemove?: () => void }) {
  const url = evidenceUrls.get(e.id) ?? demoPreviews.get(e.id)
  const isImg = e.mime.startsWith('image/')
  const Icon = isImg ? ImageIcon : e.mime.startsWith('video/') ? Film : FileText
  return (
    <figure className="ev-fig">
      <div className="ev-thumb">{url && isImg ? <img src={url} alt={e.caption} /> : url ? <a href={url} target="_blank" rel="noreferrer" aria-label={`Open ${e.name}`}><Icon size={26} /></a> : <Icon size={26} />}</div>
      <figcaption><b title={e.name}>{e.name}</b><span>{e.caption}</span><span className="mono muted">{fmtDate(e.addedAt)}</span></figcaption>
      {onRemove && <button className="icon-btn ev-x" onClick={onRemove} aria-label={`Remove ${e.name}`}><Trash2 size={15} /></button>}
    </figure>
  )
}

/* ---------- shared section frame ---------- */
export function SectionFrame({ page, sec, content, children }: { page: PageDef; sec: ProseSection | RowsSection | EvidenceSection; content: Content; children: React.ReactNode }) {
  const p = sectionProgress(page, sec, content)
  return (
    <section id={sec.id} className="sec">
      <header className="sec-head">
        <div>
          <h2>{sec.title}</h2>
          <p className="muted">{sec.prompt}</p>
        </div>
        {p >= 0.999 ? <Chip tone="ok"><CheckCircle2 size={12} /> Complete</Chip> : p > 0 ? <Chip tone="warn">{Math.round(p * 100)}%</Chip> : <Chip>Not started</Chip>}
      </header>
      {children}
    </section>
  )
}

/* ---------- prose (rich text, Tiptap) ---------- */
export function ProseEditor({ page, sec }: { page: PageDef; sec: ProseSection }) {
  const k = key(page.id, sec.id)
  const text = useStore((s) => s.prose[k] ?? '')
  const set = useStore((s) => s.setProse)
  const w = words(text), min = sec.minWords ?? 20
  const label = `${page.id === 0 ? 'Home' : `Page ${page.id}`} — ${sec.title}`
  return (
    <div className="stack" style={{ gap: 8 }}>
      <Suspense fallback={<div className="textarea notebook" style={{ minHeight: 160 }} aria-busy="true" />}>
        <RichText docKey={k} title={sec.title} placeholder={sec.placeholder} onChange={(plain, doc) => set(k, plain, label, page.id, doc)} />
      </Suspense>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="hint mono">{w} word{w === 1 ? '' : 's'}{w < min ? ` · aim for about ${min}+` : ''}</span>
        {sec.wantsEvidence && <span className="hint">Evidence goes beside this text.</span>}
      </div>
    </div>
  )
}

/* ---------- weighted comparison matrix editor (Page 3) ---------- */
export function ComparisonMatrixEditor() {
  const alts = useStore((s) => s.rows['3.alts']) ?? []
  const matrix = useStore((s) => s.rows['3.matrix']) ?? []
  const { addRow, updateRow, removeRow } = useStore()
  const letter = (i: number) => String.fromCharCode(65 + i)

  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="mx-wrap">
        <table className="mx">
          <thead>
            <tr>
              <th>Criterion</th>
              <th style={{ width: 84 }}>Weight (1–5)</th>
              {alts.map((a, i) => <th key={a.id}>Concept {letter(i)} · {a.v.name || 'Untitled'}</th>)}
              <th style={{ width: 42 }} />
            </tr>
          </thead>
          <tbody>
            {matrix.map((r) => (
              <tr key={r.id}>
                <td><input className="input" value={r.v.criterion ?? ''} placeholder="e.g. Gain accuracy" onChange={(e) => updateRow('3.matrix', r.id, { criterion: e.target.value }, 3)} /></td>
                <td><input className="input mono" value={r.v.weight ?? ''} placeholder="5" onChange={(e) => updateRow('3.matrix', r.id, { weight: e.target.value }, 3)} /></td>
                {alts.map((a) => (
                  <td key={a.id}>
                    <div className="cellp">
                      <input className="input" value={r.v[`t:${a.id}`] ?? ''} placeholder="Note (e.g. High)" onChange={(e) => updateRow('3.matrix', r.id, { [`t:${a.id}`]: e.target.value }, 3)} />
                      <input className="input mono" value={r.v[`s:${a.id}`] ?? ''} placeholder="1–5" onChange={(e) => updateRow('3.matrix', r.id, { [`s:${a.id}`]: e.target.value }, 3)} />
                    </div>
                  </td>
                ))}
                <td><button className="icon-btn" aria-label="Remove criterion" onClick={() => removeRow('3.matrix', r.id)}><Trash2 size={15} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <Button variant="ghost" size="sm" onClick={() => addRow('3.matrix', { criterion: '', weight: '3' }, 3)}>
          <Plus size={15} /> Add criterion
        </Button>
      </div>
    </div>
  )
}

/* ---------- repeating rows (tables / cards) ---------- */
function FieldInput({ f, value, onChange, idBase }: { f: FieldDef; value: string; onChange: (v: string) => void; idBase: string }) {
  const id = `${idBase}-${f.id}`
  if (f.kind === 'select' && f.chip)
    return (
      <div className="field" style={f.wide ? { gridColumn: '1 / -1' } : undefined}>
        <span className="label" id={`${id}-l`}>{f.label}{f.required && ' *'}</span>
        <div className="seg" role="radiogroup" aria-labelledby={`${id}-l`}>
          {f.options!.map((o) => <button key={o} type="button" role="radio" aria-checked={value === o} className={`seg-${o} ${value === o ? 'on' : ''}`} onClick={() => onChange(o)}>{o}</button>)}
        </div>
      </div>
    )
  return (
    <div className="field" style={f.wide ? { gridColumn: '1 / -1' } : undefined}>
      <label htmlFor={id}>{f.label}{f.required && ' *'}</label>
      {f.kind === 'long' ? <textarea id={id} className="textarea" style={{ minHeight: 72 }} value={value} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} />
        : f.kind === 'select' ? <select id={id} className="select" value={value} onChange={(e) => onChange(e.target.value)}><option value="">Choose…</option>{f.options!.map((o) => <option key={o}>{o}</option>)}</select>
        : <input id={id} className="input" type={f.kind === 'date' ? 'date' : 'text'} value={value} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} />}
    </div>
  )
}

function RowCard({ page, sec, row, index, defaultOpen }: { page: PageDef; sec: RowsSection; row: Row; index: number; defaultOpen: boolean }) {
  const { updateRow, removeRow } = useStore()
  const k = key(page.id, sec.id)
  const [open, setOpen] = useState(defaultOpen)
  const missing = sec.fields.filter((f) => f.required && !(row.v[f.id] ?? '').trim())
  const title = (row.v[sec.titleField] ?? '').trim()
  const entered = sec.fields.some((f) => f.kind === 'date') ? row.v[sec.fields.find((f) => f.kind === 'date')!.id] : ''
  const backdated = !!entered && Math.abs(new Date(entered).getTime() - new Date(row.at.slice(0, 10)).getTime()) > 86400000 * 1
  return (
    <article className={`rowcard ${missing.length ? 'inc' : 'ok'}`}>
      <header>
        <button className="rowcard-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
          <ChevronDown size={16} style={{ transform: open ? undefined : 'rotate(-90deg)', transition: 'transform .2s' }} />
          <span className="mono muted">{String(index + 1).padStart(2, '0')}</span>
          <b className={title ? '' : 'muted'}>{title || `Untitled ${sec.itemLabel.toLowerCase()}`}</b>
        </button>
        <span className="row" style={{ gap: 6 }}>
          {row.v.provenance && <span className={`chip prov-${row.v.provenance}`}>{row.v.provenance}</span>}
          {missing.length ? <Chip tone="warn" title={`Missing: ${missing.map((m) => m.label).join(', ')}`}>{missing.length} to fill</Chip> : <Chip tone="ok"><CheckCircle2 size={12} /></Chip>}
          {backdated && <Chip tone="warn" title="The entry date differs from the date it was saved. Back-dated entries are flagged, not hidden.">Back-dated</Chip>}
          <span className="chip chip-mono" title="Dated when first saved">{fmtDate(row.at)}</span>
          <button className="icon-btn" aria-label={`Delete ${sec.itemLabel.toLowerCase()} ${index + 1}`} onClick={() => removeRow(k, row.id)}><Trash2 size={15} /></button>
        </span>
      </header>
      {open && (
        <div className="rowcard-body">
          {sec.fields.map((f) => <FieldInput key={f.id} f={f} idBase={row.id} value={row.v[f.id] ?? ''} onChange={(v) => updateRow(k, row.id, { [f.id]: v }, page.id)} />)}
        </div>
      )}
    </article>
  )
}

export function RowsEditor({ page, sec }: { page: PageDef; sec: RowsSection }) {
  const k = key(page.id, sec.id)
  const rows = useStore((s) => s.rows[k]) ?? []
  const add = useStore((s) => s.addRow)
  const addOne = () => {
    const seed: Record<string, string> = {}
    if (sec.fields.some((f) => f.id === 'no')) seed.no = `FR-${String(rows.length + 1).padStart(2, '0')}`
    const d = sec.fields.find((f) => f.kind === 'date'); if (d) seed[d.id] = new Date().toISOString().slice(0, 10)
    add(k, seed, page.id)
  }
  return (
    <div className="stack" style={{ gap: 10 }}>
      {rows.length === 0 && (
        <div className="empty" style={{ padding: 22 }}>
          <h4>No {sec.itemLabel.toLowerCase()}s yet</h4>
          <p>{(sec.minRows ?? 1) > 0 ? `Add at least ${sec.minRows ?? 1}.` : 'Add one if it applies.'} Each entry is dated when you first save it.</p>
        </div>
      )}
      {rows.map((r, i) => <RowCard key={r.id} page={page} sec={sec} row={r} index={i} defaultOpen={rows.length <= 3 || !!sec.fields.some((f) => f.required && !(r.v[f.id] ?? '').trim())} />)}
      <div className="row"><Button variant="ghost" size="sm" onClick={addOne}><Plus size={15} /> Add {sec.itemLabel.toLowerCase()}</Button>
        {(sec.minRows ?? 0) > 0 && <span className="hint">{Math.min(rows.length, sec.minRows!)} of {sec.minRows} expected</span>}</div>
    </div>
  )
}
