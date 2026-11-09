import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Lock } from 'lucide-react'
import { Lockup } from '../../brand/BrandMark'
import { Button } from '../../design-system'
import { startDemo, useStore } from '../../state/store'
import { supabase, supabaseConfigured } from '../../lib/supabase'
import { INSTITUTION } from '../../data/handbook'
import { hydrate } from './bootstrap'

const DOMAIN = '@kletech.ac.in' // access restricted to the institutional domain (PR §3)
const PASSWORD_LOGIN = import.meta.env.VITE_ENABLE_PASSWORD_LOGIN === 'true'

function nameFromEmail(email: string) {
  return email.split('@')[0].split(/[._-]+/).filter((p) => /[a-z]/i.test(p)).map((p) => p[0].toUpperCase() + p.slice(1).toLowerCase()).join(' ') || 'Student'
}

export function SignIn() {
  const session = useStore((s) => s.session)
  const nav = useNavigate()
  const loc = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const ready = useStore((s) => s.workspaceReady)
  const team = useStore((s) => s.team)
  const dest = (loc.state as { from?: string } | null)?.from ?? '/student'
  // Redirect exactly once, straight to the final destination, and only after the workspace has loaded.
  // (Redirecting to /student first made this still-mounted component keep cancelling RequireStudent's /onboarding redirect.)
  if (session && ready) return <Navigate to={session.mode === 'real' && !team ? '/onboarding' : dest} replace />

  const demo = () => { const e = `aarav.rao${DOMAIN}`; startDemo(nameFromEmail(e), e); nav(dest, { replace: true }) }
  const submit = async (ev: FormEvent) => {
    ev.preventDefault()
    const v = email.trim().toLowerCase()
    if (!v.endsWith(DOMAIN) || v.length <= DOMAIN.length) { setErr(`Please use your KLE Tech institutional address (name${DOMAIN}).`); return }
    if (!supabaseConfigured) { setErr('Sign-in is not configured yet (missing Supabase settings). You can still explore the demo project.'); return }
    setBusy(true)
    if (PASSWORD_LOGIN && password) {
      const { error } = await supabase.auth.signInWithPassword({ email: v, password })
      if (error) { setErr(error.message); setBusy(false); return }
      await hydrate(); setBusy(false); return // the redirect above fires once the workspace is ready
    }
    const { error } = await supabase.auth.signInWithOtp({ email: v, options: { shouldCreateUser: true, emailRedirectTo: window.location.origin + '/signin' } })
    setBusy(false)
    if (error) setErr(error.message); else setSent(true)
  }

  return (
    <main className="auth">
      <aside className="auth-side" data-theme="light">
        <div className="auth-header">
          <Lockup compact />
          <div className="auth-header-meta">
            <span className="auth-header-programme">{INSTITUTION.programme}</span>
            <span className="auth-header-year">{INSTITUTION.year.replace('Academic Year ', '')}</span>
          </div>
        </div>

        <div className="auth-intro">
          <p className="eyebrow" style={{ color: '#9a1b24', fontWeight: 700, letterSpacing: '0.12em' }}>STUDENT WORKSPACE</p>
          <h2 style={{ marginTop: 8, color: '#161414', fontFamily: 'var(--font-display, Georgia, serif)' }}>
            Your project, <em style={{ color: '#9a1b24', fontStyle: 'italic' }}>one honest record</em>.
          </h2>
          <p style={{ color: '#59504c', marginTop: 10, maxWidth: '46ch', lineHeight: 1.55, fontSize: '14.5px' }}>
            Sign in to reach your team’s portfolio, your notebook, and your mentor.
          </p>
        </div>

        {/* Hero: the full campus building, framed rather than cropped */}
        <div className="auth-hero">
          <img
            src="/images/updated%20kle%20campus%20image.png"
            alt="KLE Technological University campus"
            className="auth-hero-img"
          />
          <div className="auth-hero-caption">
            <span className="campus-badge-dot" />
            <span>KLE Technological University Campus</span>
          </div>
        </div>
      </aside>
      <section className="auth-form">
        <form className="auth-card" onSubmit={submit} noValidate>
          <div><p className="eyebrow">Sign in</p><h1 style={{ marginTop: 8 }}>Welcome back</h1></div>
          <div className="field">
            <label htmlFor="email">KLE Tech email</label>
            <input id="email" className="input" type="email" inputMode="email" autoComplete="email" placeholder={`name${DOMAIN}`} value={email} onChange={(e) => { setEmail(e.target.value); setErr(''); setSent(false) }} aria-invalid={!!err} aria-describedby="email-msg" />
            <span id="email-msg" className="hint" style={{ color: err ? 'var(--danger)' : undefined }} role={err ? 'alert' : undefined}>{err || `Access is limited to ${DOMAIN} accounts.`}</span>
          </div>
          {PASSWORD_LOGIN && (
            <div className="field">
              <label htmlFor="pw">Password (test accounts)</label>
              <input id="pw" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          )}
          {sent && <p className="hint" role="status">Check your inbox — we sent a sign-in link to {email.trim().toLowerCase()}.</p>}
          <Button type="submit" size="lg" disabled={busy}>{busy ? 'Please wait…' : PASSWORD_LOGIN && password ? 'Sign in' : 'Email me a sign-in link'} <ArrowRight size={17} /></Button>
          <div className="divider" style={{ margin: 0 }} />
          <Button type="button" variant="ghost" onClick={demo}>Explore the demo project (presentation data)</Button>
          <p className="hint row" style={{ alignItems: 'flex-start', gap: 8 }}><Lock size={14} style={{ flex: 'none', marginTop: 2 }} /> Your portfolio starts blank and is saved to your team’s private workspace. The demo project is separate sample data and is never mixed with yours.</p>
        </form>
      </section>
    </main>
  )
}
