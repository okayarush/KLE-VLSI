import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Star } from 'lucide-react'
import { STEPS } from '../data/handbook'
import type { StepState } from '../state/store'

const LABEL: Record<StepState, string> = { todo: 'Not started', doing: 'In progress', done: 'Complete' }

/**
 * The signature element: the handbook's 16-step engineering design chain (H §5.2).
 * States are team-set (A-23, provisional). ★ marks steps added July 2026.
 */
export function DesignChain({ states, onChange, labels = true, size = 'md' }: {
  states: Record<number, StepState>
  onChange?: (n: number, s: StepState) => void
  labels?: boolean
  size?: 'sm' | 'md'
}) {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <ol className={`chain chain-${size}`} aria-label="Sixteen-step engineering design chain">
      {STEPS.map((s, i) => {
        const st = states[s.n] ?? 'todo'
        const interactive = !!onChange
        return (
          <motion.li key={s.n} className={`chain-node is-${st}`} initial={{ opacity: 0, y: 12, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: i * 0.035, duration: 0.45, ease: [0.22, 0.8, 0.3, 1] }}>
            <button className="chain-dot" disabled={!interactive} aria-haspopup={interactive ? 'menu' : undefined} aria-expanded={open === s.n} onClick={() => interactive && setOpen(open === s.n ? null : s.n)} title={`Step ${s.n} — ${s.name} · ${LABEL[st]}`} aria-label={`Step ${s.n}, ${s.name}, ${LABEL[st]}`}>
              {st === 'done' ? <Check size={size === 'sm' ? 12 : 16} strokeWidth={3} /> : <span className="mono">{String(s.n).padStart(2, '0')}</span>}
              {s.star && <Star className="chain-star" size={11} fill="currentColor" aria-label="added July 2026" />}
            </button>
            {labels && <span className="chain-label">{s.short}</span>}
            {open === s.n && onChange && (
              <>
                <div className="chain-scrim" onClick={() => setOpen(null)} />
                <div className="chain-menu" role="menu" aria-label={`Set state of step ${s.n}`}>
                  <b>{String(s.n).padStart(2, '0')} · {s.name}</b>
                  {(['todo', 'doing', 'done'] as StepState[]).map((o) => (
                    <button key={o} role="menuitemradio" aria-checked={st === o} className={st === o ? 'on' : ''} onClick={() => { onChange(s.n, o); setOpen(null) }}>{LABEL[o]}</button>
                  ))}
                </div>
              </>
            )}
          </motion.li>
        )
      })}
    </ol>
  )
}
