import { useState } from 'react'
import { INSTITUTION } from '../data/handbook'

/**
 * Official KLE Tech identity. The university logo is NEVER recreated here (DESIGN_GUIDELINES §5).
 * Drop the official file at  web/public/brand/kle-tech-logo.svg  (or .png) and it is picked up
 * automatically; until then a typographic lockup of the official names is shown.
 */
const CANDIDATES = ['/brand/kle-tech-logo.svg', '/brand/kle-tech-logo.png']

export function UniversityLogo({ height = 44 }: { height?: number }) {
  const [i, setI] = useState(0)
  if (i >= CANDIDATES.length) return null
  return <img src={CANDIDATES[i]} height={height} style={{ height, width: 'auto' }} alt="KLE Technological University logo" onError={() => setI(i + 1)} />
}

export function Lockup({ compact, inverse }: { compact?: boolean; inverse?: boolean }) {
  const [i, setI] = useState(0)
  return (
    <div className={`lockup ${inverse ? 'lockup-inverse' : ''}`}>
      {i < CANDIDATES.length && (
        <div style={{ background: '#ffffff', borderRadius: 6, padding: '3px 8px', display: 'inline-flex', alignItems: 'center' }}>
          <img src={CANDIDATES[i]} style={{ height: compact ? 30 : 38, width: 'auto' }} alt="KLE Technological University logo" onError={() => setI(i + 1)} />
        </div>
      )}
      <div className="lockup-text">
        <span className="lockup-uni">{INSTITUTION.university}</span>
        {!compact && <span className="lockup-dept">{INSTITUTION.department}</span>}
      </div>
    </div>
  )
}

/** The product's own glyph (not the university's): a signal trace through the design chain. */
export function ProductGlyph({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="var(--primary)" />
      <path d="M6 22h5l3-10 4 14 3-9h5" fill="none" stroke="#f4a259" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** The header wordmark is the official KLE Tech logo (same file as the landing navbar). */
export function ProductName({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const height = size === 'lg' ? 44 : 38
  return (
    <div style={{ background: '#ffffff', borderRadius: 8, padding: '5px 12px', display: 'inline-flex', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
      <img src="/images/kle%20technological%20navbar.png" alt="KLE Technological University — Integration Portfolio" height={height} style={{ height, width: 'auto', display: 'block' }} />
    </div>
  )
}
