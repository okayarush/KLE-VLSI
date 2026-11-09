import { useEffect, useId, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'

type BtnVariant = 'primary' | 'accent' | 'ghost' | 'quiet' | 'ai' | 'danger'
export function Button({ variant = 'primary', size, className = '', ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'lg' }) {
  return <button {...p} className={`btn btn-${variant} ${size ? `btn-${size}` : ''} ${className}`} />
}

export function Chip({ tone, children, mono, title }: { tone?: 'ok' | 'warn' | 'danger' | 'info' | 'accent' | 'ai'; children: ReactNode; mono?: boolean; title?: string }) {
  return <span title={title} className={`chip ${tone ? `chip-${tone}` : ''} ${mono ? 'chip-mono' : ''}`}>{children}</span>
}

export function Card({ children, className = '', hover, style }: { children: ReactNode; className?: string; hover?: boolean; style?: React.CSSProperties }) {
  return <section style={style} className={`card ${hover ? 'card-hover' : ''} ${className}`}>{children}</section>
}

export function CardTitle({ title, action, icon }: { title: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return <div className="card-title"><h3 className="row" style={{ gap: 8 }}>{icon}{title}</h3>{action}</div>
}

export function Ring({ pct, size = 132, stroke = 10, label, sub }: { pct: number; size?: number; stroke?: number; label?: ReactNode; sub?: string }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const reduce = useReducedMotion()
  const id = useId()
  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={`${Math.round(pct)} percent`}>
      <svg width={size} height={size}>
        <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f4a259" /><stop offset="1" stopColor="#c2570c" /></linearGradient></defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${id})`} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: reduce ? c * (1 - pct / 100) : c }} animate={{ strokeDashoffset: c * (1 - pct / 100) }} transition={{ duration: 1.1, ease: [0.22, 0.8, 0.3, 1] }} />
      </svg>
      <div className="ring-label"><b>{label ?? `${Math.round(pct)}%`}</b>{sub && <span>{sub}</span>}</div>
    </div>
  )
}

export function Bar({ pct, label = 'Progress' }: { pct: number; label?: string }) {
  return <div className="bar" role="progressbar" aria-label={label} aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${pct}%` }} /></div>
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return <div className="empty"><h4>{title}</h4>{children && <p>{children}</p>}{action}</div>
}

export function Dialog({ open, onClose, title, children, actions }: { open: boolean; onClose: () => void; title: string; children: ReactNode; actions?: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="dialog-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
          <motion.div role="dialog" aria-modal="true" aria-label={title} className="dialog" initial={{ y: 24, scale: 0.97, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 12, opacity: 0 }} transition={{ duration: 0.25, ease: [0.22, 0.8, 0.3, 1] }}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h3>{title}</h3>
              <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="stack">{children}</div>
            {actions && <div className="actions">{actions}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Reveal({ children, delay = 0, className, y = 14 }: { children: ReactNode; delay?: number; className?: string; y?: number }) {
  return <motion.div className={className} initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.55, delay, ease: [0.22, 0.8, 0.3, 1] }}>{children}</motion.div>
}

export function Toast({ show, children }: { show: boolean; children: ReactNode }) {
  return <AnimatePresence>{show && <motion.div className="toast" role="status" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}>{children}</motion.div>}</AnimatePresence>
}
