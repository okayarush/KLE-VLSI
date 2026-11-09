import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Plus, X } from 'lucide-react'
import { Lockup, ProductName } from '../../brand/BrandMark'
import { Button } from '../../design-system'
import { THEMES } from '../../data/handbook'
import { supabase } from '../../lib/supabase'
import { hydrate } from '../auth/bootstrap'
import { useStore } from '../../state/store'

/** First sign-in: create the team workspace. The portfolio it opens is completely blank. */
export function Onboarding() {
  const nav = useNavigate()
  const session = useStore((s) => s.session)
  const [name, setName] = useState('')
  const [theme, setTheme] = useState(1)
  const [artefact, setArtefact] = useState(THEMES[0].artefacts[0])
  const [invites, setInvites] = useState<string[]>([])
  const [draft, setDraft] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const addInvite = () => {
    const v = draft.trim().toLowerCase()
    if (!v) return
    if (!v.endsWith('@kletech.ac.in')) { setErr('Teammates must use their @kletech.ac.in address.'); return }
    if (!invites.includes(v) && v !== session?.email) setInvites([...invites, v])
    setDraft(''); setErr('')
  }
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setErr('Give your team a name.'); return }
    setBusy(true)
    const { data, error } = await supabase.rpc('create_team', { p_name: name, p_theme: theme, p_artefact: artefact })
    if (error) { setErr(error.message); setBusy(false); return }
    for (const em of invites) await supabase.rpc('invite_member', { p_team: data, p_email: em })
    await hydrate(); setBusy(false); nav('/student', { replace: true })
  }

  return (
    <main className="auth">
      <aside className="auth-side" data-theme="dark">
        <ProductName />
        <div>
          <p className="eyebrow" style={{ color: '#f4a259' }}>New workspace</p>
          <h2 style={{ marginTop: 10 }}>Start your <em>engineering notebook</em>.</h2>
          <p style={{ color: '#b7c2e2', marginTop: 14, maxWidth: '46ch' }}>Your team’s portfolio begins blank. Everything you write and upload is saved privately for your team.</p>
        </div>
        <Lockup inverse />
      </aside>
      <section className="auth-form">
        <form className="auth-card" onSubmit={submit} noValidate>
          <div><p className="eyebrow">Signed in as {session?.email}</p><h1 style={{ marginTop: 8 }}>Create your team</h1></div>
          <div className="field"><label htmlFor="tn">Team name</label><input id="tn" className="input" value={name} onChange={(e) => { setName(e.target.value); setErr('') }} placeholder="e.g. Team Gamma" /></div>
          <div className="field"><label htmlFor="th">Theme</label>
            <select id="th" className="select" value={theme} onChange={(e) => { const n = Number(e.target.value); setTheme(n); setArtefact(THEMES[n - 1].artefacts[0]) }}>
              {THEMES.map((t) => <option key={t.n} value={t.n}>Theme {t.n} — {t.name}</option>)}
            </select></div>
          <div className="field"><label htmlFor="ar">Artefact</label>
            <select id="ar" className="select" value={artefact} onChange={(e) => setArtefact(e.target.value)}>
              {THEMES[theme - 1].artefacts.map((a) => <option key={a}>{a}</option>)}
            </select></div>
          <div className="field"><label htmlFor="inv">Invite teammates (optional)</label>
            <div className="row" style={{ gap: 8 }}>
              <input id="inv" className="input" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addInvite() } }} placeholder="name@kletech.ac.in" />
              <Button type="button" variant="ghost" onClick={addInvite}><Plus size={15} /> Add</Button>
            </div>
            {invites.length > 0 && <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 6 }}>{invites.map((i) => <span key={i} className="chip">{i}<button type="button" className="icon-btn" aria-label={`Remove ${i}`} onClick={() => setInvites(invites.filter((x) => x !== i))}><X size={12} /></button></span>)}</div>}
            <span className="hint">They join automatically when they sign in with that address.</span></div>
          {err && <p className="hint" role="alert" style={{ color: 'var(--danger)' }}>{err}</p>}
          <Button type="submit" size="lg" disabled={busy}>{busy ? 'Creating…' : 'Open my blank portfolio'} <ArrowRight size={17} /></Button>
        </form>
      </section>
    </main>
  )
}
