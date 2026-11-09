import { useEffect, useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { Button, Dialog } from '../../design-system'
import { PAGES } from '../../data/pages'
import { uploadEvidence } from '../../state/remote'
import { demoPreviews } from '../../lib/previews'
import { bytes } from '../../lib/progress'
import { useStore } from '../../state/store'

export interface Target { pageId: number; sectionId: string }

/**
 * Evidence attach dialog. Caption is REQUIRED (DESIGN_GUIDELINES EvidenceFigure).
 * Prototype: files stay in this browser tab; only metadata is kept. Size limits are proposed in D-09 (pending).
 */
export function AttachDialog({ open, onClose, target }: { open: boolean; onClose: () => void; target?: Target }) {
  const add = useStore((s) => s.addEvidence)
  const team = useStore((s) => s.team)
  const mode = useStore((s) => s.session?.mode)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [caption, setCaption] = useState('')
  const [pageId, setPageId] = useState(target?.pageId ?? 2)
  const [sectionId, setSectionId] = useState(target?.sectionId ?? PAGES[2].sections[0].id)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => { if (open) { setFile(null); setCaption(''); setErr(''); setBusy(false); if (target) { setPageId(target.pageId); setSectionId(target.sectionId) } } }, [open, target])

  const sections = PAGES[pageId].sections
  const valid = !!file && caption.trim().length >= 5

  const save = async () => {
    if (!file || !valid) return
    const id = crypto.randomUUID()
    if (mode === 'real' && team) {
      if (file.size > 25 * 1024 * 1024) { setErr('Files must be 25 MB or smaller.'); return }
      setBusy(true); setErr('')
      try {
        const item = await uploadEvidence(team.id, file, { id, pageId, sectionId, caption: caption.trim() })
        add(item)
        onClose()
      } catch (e) { setErr((e as Error).message || 'Upload failed. Please try again.') } finally { setBusy(false) }
      return
    }
    // demo mode: metadata only, nothing leaves the browser
    add({ id, name: file.name, mime: file.type || 'application/octet-stream', size: file.size, caption: caption.trim(), pageId, sectionId })
    demoPreviews.set(id, URL.createObjectURL(file))
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Attach evidence"
      actions={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={!valid || busy}>{busy ? 'Uploading…' : 'Attach'}</Button></>}>
      {!target && (
        <div className="grid-2" style={{ gap: 10 }}>
          <div className="field"><label htmlFor="ev-page">Page</label>
            <select id="ev-page" className="select" value={pageId} onChange={(e) => { const id = +e.target.value; setPageId(id); setSectionId(PAGES[id].sections[0].id) }}>
              {PAGES.map((p) => <option key={p.id} value={p.id}>{p.id === 0 ? 'Home' : `Page ${p.id} — ${p.title}`}</option>)}
            </select></div>
          <div className="field"><label htmlFor="ev-sec">Section</label>
            <select id="ev-sec" className="select" value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
              {sections.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select></div>
        </div>
      )}
      <button type="button" className="dropzone" onClick={() => ref.current?.click()}
        onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); setFile(e.dataTransfer.files[0] ?? null) }}>
        <Upload size={22} />
        {file ? <><b>{file.name}</b><span className="muted">{bytes(file.size)}</span></> : <><b>Choose a file or drop it here</b><span className="muted">Images, PDF, MP4/WebM video, CSV, text or ZIP — up to 25 MB.</span></>}
      </button>
      <input ref={ref} type="file" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <div className="field">
        <label htmlFor="ev-cap">Caption <span style={{ color: 'var(--danger)' }}>*</span></label>
        <textarea id="ev-cap" className="textarea" style={{ minHeight: 76 }} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="What does this show, and what should a reviewer notice? e.g. “Scope capture of Vout at gain ×10, 1 kHz sine, 200 mV in.”" />
        <span className="hint">A caption is required — evidence without explanation does not count as evidence.</span>
      </div>
      {err && <p className="hint" role="alert" style={{ color: 'var(--danger)' }}>{err}</p>}
      <p className="hint">{mode === 'real' ? 'Stored privately for your team and available whenever you return.' : 'Demo mode: the file stays in this browser tab and is not uploaded anywhere.'}</p>
    </Dialog>
  )
}
