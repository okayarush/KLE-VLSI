import { num } from './kit'
import type { ReactNode } from 'react'

/* =====================================================================
   Editorial Technical Illustrations & Engineering Schematics
   Drawn as crisp inline SVG in currentColor + institutional KLE accents.
   ===================================================================== */

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
const Dot = ({ x, y, fill = '#fff' }: { x: number; y: number; fill?: string }) => <circle cx={x} cy={y} r={3.2} fill={fill} stroke="currentColor" strokeWidth={1.4} />
const Pins = ({ x, y, w, h, n }: { x: number; y: number; w: number; h: number; n: number }) => (
  <g {...S} strokeWidth={1.35}>
    {Array.from({ length: n }, (_, i) => {
      const t = (i + 0.5) / n
      return (
        <g key={i}>
          <path d={`M${x + w * t} ${y} v-8`} />
          <path d={`M${x + w * t} ${y + h} v8`} />
          <path d={`M${x} ${y + h * t} h-8`} />
          <path d={`M${x + w} ${y + h * t} h8`} />
        </g>
      )
    })}
  </g>
)

/* ---------------- Header Band Artwork (PageArt) ---------------- */

function Chip({ label }: { label: string }) {
  return (
    <g transform="translate(115 24)">
      <g transform="rotate(-8 100 60) skewX(-6)">
        <rect x={46} y={20} width={124} height={86} rx={6} {...S} fill="#fff" fillOpacity=".88" />
        <rect x={60} y={32} width={96} height={62} rx={3} {...S} strokeWidth={1.1} />
        <Pins x={46} y={20} w={124} h={86} n={7} />
        <text x={108} y={69} textAnchor="middle" fontSize={15} fontWeight={700} fill="currentColor" stroke="none" fontFamily="Inter, sans-serif" letterSpacing="2">{label}</text>
      </g>
      <g {...S} strokeWidth={1.15} opacity=".78">
        <path d="M-34 70 h42 l16 -16 h30" />
        <path d="M-52 100 h62 l14 -12 h26" />
        <path d="M-12 26 h48 l20 18" />
        <path d="M-64 52 h52" />
      </g>
      <Dot x={-34} y={70} /><Dot x={-52} y={100} /><Dot x={-12} y={26} /><Dot x={-64} y={52} />
    </g>
  )
}

const Blocks = () => (
  <g transform="translate(36 38)">
    {[0, 1, 2].map((i) => (
      <g key={i}>
        <rect x={i * 108} y={i === 1 ? 24 : 0} width={82} height={52} rx={5} {...S} fill="#fff" fillOpacity=".88" />
        <path d={`M${i * 108 + 14} ${i === 1 ? 50 : 26} h54`} {...S} strokeWidth={1.1} opacity=".55" />
        {i < 2 && <path d={`M${i * 108 + 82} ${i === 0 ? 26 : 50} h26 ${i === 0 ? 'v24' : 'v-24'}`} {...S} />}
      </g>
    ))}
    <path d="M-22 26 h22 M298 26 h22" {...S} />
    <Dot x={-22} y={26} /><Dot x={320} y={26} />
  </g>
)

const Table = () => (
  <g transform="translate(58 20) rotate(-4 120 60)">
    <rect x={0} y={0} width={250} height={116} rx={6} {...S} fill="#fff" fillOpacity=".88" />
    <path d="M0 26 h250 M70 0 v116 M150 0 v116" {...S} strokeWidth={1.1} />
    {[44, 62, 80, 98].map((y) => <path key={y} d={`M10 ${y} h50 M80 ${y} h58 M160 ${y} h30`} {...S} strokeWidth={1.2} opacity=".5" />)}
    <path d="M10 13 h40 M80 13 h50 M160 13 h50" {...S} strokeWidth={2.2} />
    <path d="M82 100 l7 7 l16 -16" {...S} strokeWidth={2.4} />
  </g>
)

const Amp = () => (
  <g transform="translate(68 18)">
    <path d="M60 20 v82 l86 -41 z" {...S} fill="#fff" fillOpacity=".88" />
    <path d="M70 44 h12 M70 78 h12 M76 38 v12" {...S} strokeWidth={1.2} />
    <path d="M0 44 h60 M0 78 h24 v26 h48 M146 61 h60" {...S} />
    <path d="M176 61 v-52 h-70 v14" {...S} strokeWidth={1.3} />
    <path d="M106 23 l-5 8 l10 8 l-10 8" {...S} strokeWidth={1.3} />
    <Dot x={0} y={44} /><Dot x={206} y={61} /><Dot x={24} y={104} />
  </g>
)

const Graph = () => (
  <g transform="translate(66 22)">
    <path d="M0 0 v116 h250" {...S} />
    <path d="M10 92 C40 20, 70 20, 100 62 S160 112, 240 30" {...S} strokeWidth={2} />
    <path d="M10 100 C40 40, 76 38, 104 74 S166 118, 240 44" {...S} strokeWidth={1.4} strokeDasharray="5 5" opacity=".7" />
    {[40, 80, 120, 160, 200].map((x) => <path key={x} d={`M${x} 116 v5`} {...S} strokeWidth={1.1} />)}
    <Dot x={100} y={62} /><Dot x={240} y={30} />
  </g>
)

const Scope = () => (
  <g transform="translate(84 14)">
    <rect x={0} y={0} width={204} height={128} rx={10} {...S} fill="#fff" fillOpacity=".88" />
    <rect x={14} y={14} width={128} height={100} rx={4} {...S} strokeWidth={1.1} />
    <path d="M14 64 h128 M78 14 v100" {...S} strokeWidth={0.7} opacity=".5" />
    <path d="M18 64 q10 -38 20 0 t20 0 t20 0 t20 0 t20 0 t12 0" {...S} strokeWidth={1.9} />
    {[34, 62, 90].map((y) => <circle key={y} cx={172} cy={y} r={9} {...S} strokeWidth={1.2} />)}
    <path d="M167 34 h10 M172 57 v10" {...S} strokeWidth={1.2} />
  </g>
)

const Notebook = () => (
  <g transform="translate(94 14) rotate(-5 90 70)">
    <rect x={0} y={0} width={170} height={130} rx={6} {...S} fill="#fff" fillOpacity=".92" />
    <path d="M22 0 v130" {...S} strokeWidth={1.1} />
    {[0, 1, 2, 3, 4, 5].map((i) => <circle key={i} cx={11} cy={16 + i * 20} r={3.5} {...S} strokeWidth={1.2} />)}
    {[28, 46, 64, 82, 100].map((y, i) => <path key={y} d={`M36 ${y} h${i === 4 ? 50 : 112}`} {...S} strokeWidth={1.2} opacity=".6" />)}
    <path d="M120 118 l30 -52 l8 5 l-30 52 l-12 4 z" {...S} fill="#fff" />
  </g>
)

const Loop = () => (
  <g transform="translate(98 16)">
    <path d="M30 60 a54 54 0 0 1 100 -22" {...S} strokeWidth={2} /><path d="M132 14 l-2 26 l-24 -8" {...S} strokeWidth={2} />
    <path d="M130 70 a54 54 0 0 1 -100 22" {...S} strokeWidth={2} /><path d="M28 116 l2 -26 l24 8" {...S} strokeWidth={2} />
    <path d="M62 52 l36 36 M98 52 l-36 36" {...S} strokeWidth={1.4} opacity=".55" />
    <Dot x={30} y={60} /><Dot x={130} y={70} />
  </g>
)

const PlayArt = () => (
  <g transform="translate(82 18)">
    <rect x={0} y={0} width={210} height={122} rx={10} {...S} fill="#fff" fillOpacity=".9" />
    <path d="M86 36 v50 l44 -25 z" {...S} strokeWidth={2} />
    <path d="M16 106 h178" {...S} strokeWidth={1.1} opacity=".5" /><path d="M16 106 h90" {...S} strokeWidth={2.4} /><Dot x={106} y={106} />
  </g>
)

const Folder = () => (
  <g transform="translate(68 28)">
    <path d="M0 18 q0 -10 10 -10 h56 l14 16 h130 q10 0 10 10 v70 q0 10 -10 10 h-200 q-10 0 -10 -10 z" {...S} fill="#fff" fillOpacity=".9" />
    <path d="M0 40 h220" {...S} strokeWidth={1.1} opacity=".6" />
    <path d="M40 66 h60 M40 82 h90" {...S} strokeWidth={1.4} opacity=".55" />
    <path d="M150 62 a12 12 0 0 1 17 0 l8 8 a12 12 0 0 1 -17 0 M164 84 a12 12 0 0 1 -17 0 l-8 -8 a12 12 0 0 1 17 0" {...S} strokeWidth={1.8} />
  </g>
)

const People = () => (
  <g transform="translate(78 20)">
    {[0, 1, 2].map((i) => <g key={i} transform={`translate(${i * 78} ${i === 1 ? 0 : 14})`}><circle cx={40} cy={26} r={17} {...S} fill="#fff" fillOpacity=".9" /><path d="M8 100 q0 -44 32 -44 q32 0 32 44 z" {...S} fill="#fff" fillOpacity=".9" /></g>)}
    <path d="M0 114 h240" {...S} strokeWidth={1.1} opacity=".5" />
  </g>
)

const Target = () => (
  <g transform="translate(108 14)">
    {[60, 42, 24].map((r) => <circle key={r} cx={80} cy={64} r={r} {...S} fill="#fff" fillOpacity=".5" />)}
    <circle cx={80} cy={64} r={6} fill="currentColor" />
    <path d="M80 64 l62 -50 m-14 0 h14 v14" {...S} strokeWidth={2} />
  </g>
)

const Web = () => (
  <g transform="translate(68 16)">
    {([[20, 30], [110, 14], [210, 36], [60, 100], [150, 92], [240, 108]] as const).map(([x, y], i) => <circle key={i} cx={x} cy={y} r={11} {...S} fill="#fff" fillOpacity=".95" />)}
    <path d="M30 34 l70 -16 M121 18 l78 16 M25 41 l30 52 M110 25 l35 58 M214 46 l22 52 M71 100 l68 -6 M161 92 l70 14" {...S} strokeWidth={1.2} opacity=".7" />
  </g>
)

const CheckArt = () => (
  <g transform="translate(102 12)">
    <rect x={0} y={8} width={150} height={124} rx={8} {...S} fill="#fff" fillOpacity=".9" />
    <rect x={44} y={0} width={62} height={20} rx={5} {...S} fill="#fff" />
    {[40, 66, 92].map((y) => <g key={y}><path d={`M18 ${y} l6 6 l10 -12`} {...S} strokeWidth={2} /><path d={`M46 ${y} h84`} {...S} strokeWidth={1.2} opacity=".55" /></g>)}
  </g>
)

const PathArt = () => (
  <g transform="translate(68 30)">
    <path d="M0 96 h60 l30 -60 h70 l30 36 h50" {...S} strokeWidth={2} />
    <path d="M230 52 l20 20 l-20 20" {...S} strokeWidth={2} />
    <Dot x={0} y={96} /><Dot x={90} y={36} /><Dot x={160} y={36} />
    <path d="M90 36 v-24 M160 36 v-24" {...S} strokeWidth={1.2} opacity=".6" />
  </g>
)

const ART: Record<number, ReactNode> = {
  1: <People />, 2: <Target />, 3: <Chip label="IC" />, 4: <Table />, 5: <Blocks />, 6: <Amp />, 7: <Web />, 8: <Scope />,
  9: <Graph />, 10: <Loop />, 11: <Notebook />, 12: <CheckArt />, 13: <PathArt />, 14: <PlayArt />, 15: <Folder />,
}

/** Decorative page-header art: maroon ribbon + tinted line drawing. */
export function PageArt({ pageId }: { pageId: number }) {
  return (
    <div className="ph-art" aria-hidden="true">
      <i className="rib thin" /><i className="rib" />
      {pageId === 0
        ? <img src="/images/kle-campus-sketch.png" alt="" style={{ position: 'absolute', right: '14%', bottom: 0, height: '96%', width: 'auto', maxWidth: 'none', mixBlendMode: 'multiply', opacity: 0.78 }} />
        : <svg viewBox="0 0 400 160" preserveAspectRatio="xMidYMid meet">{ART[pageId]}</svg>}
    </div>
  )
}

/* =====================================================================
   DATA-DRIVEN DIAGRAMS
   Everything below is drawn from what the team has actually entered. With no data,
   each diagram renders a dashed "ghost" with neutral placeholder labels — never sample values.
   ===================================================================== */

const INK = '#1e1618', MUTED = '#6f6265', MAROON = '#9a1b24', LINE = '#d8c7c2', GHOST = '#cdbfba', GHOST_TXT = '#a79a96'
const MONO = 'JetBrains Mono, monospace'
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s)
const gh = { stroke: GHOST, strokeWidth: 1.4, strokeDasharray: '5 4', fill: '#fffdfc' }

function Diag({ eyebrow, note, children, h, label }: { eyebrow: string; note?: ReactNode; children: ReactNode; h: number; label: string }) {
  return (
    <div className="diag-card" role="img" aria-label={label}>
      <div className="diag-head">
        <span className="eyebrow">{eyebrow}</span>
        {note && <span className="mono muted" style={{ fontSize: 11 }}>{note}</span>}
      </div>
      <svg viewBox={`0 0 760 ${h}`} className="diag-svg">{children}</svg>
    </div>
  )
}
const Arrow = ({ x, y, w = 34, color = MAROON, ghost }: { x: number; y: number; w?: number; color?: string; ghost?: boolean }) =>
  <path d={`M${x} ${y} h${w} m-6 -5 l6 5 l-6 5`} fill="none" stroke={ghost ? GHOST : color} strokeWidth="1.6" strokeDasharray={ghost ? '4 3' : undefined} />

/* ---------------- Concept Alternative glyph (Page 03) ---------------- */

/** Neutral concept thumbnail: input → labelled concept block → output. It never guesses a technology from the name. */
export function ConceptGlyph({ name, index = 0 }: { name: string; index?: number }) {
  const letter = String.fromCharCode(65 + index)
  return (
    <svg className="cglyph" viewBox="0 0 230 88" role="img" aria-label={`Concept ${letter}: ${name || 'untitled'}`}>
      <g transform="translate(18 44)">
        <path d="M0 0 h42" {...S} /><Dot x={0} y={0} />
        <rect x={42} y={-26} width={96} height={52} rx={6} {...S} fill="#fff" />
        <text x={90} y={-4} textAnchor="middle" fontSize={11} fontWeight={700} fill="currentColor" stroke="none" fontFamily={MONO}>CONCEPT</text>
        <text x={90} y={14} textAnchor="middle" fontSize={16} fontWeight={700} fill={MAROON} stroke="none" fontFamily="Inter, sans-serif">{letter}</text>
        <path d="M138 0 h50" {...S} /><path d="M181 -5 l7 5 l-7 5" {...S} /><Dot x={188} y={0} />
      </g>
    </svg>
  )
}

/* ---------------- Page 00: signal chain from the Page 5 blocks ---------------- */

export function SignalChainBlueprint({ blocks, themeLabel }: { blocks: { name: string; fr: string }[]; themeLabel: string }) {
  const shown = blocks.slice(0, 4)
  const ghost = shown.length === 0
  const items = ghost ? [{ name: 'Block A', fr: '' }, { name: 'Block B', fr: '' }, { name: 'Block C', fr: '' }] : shown
  const n = items.length, gap = 40, w = Math.min(190, (724 - gap * (n - 1)) / n)
  return (
    <Diag eyebrow="System architecture · at a glance" note={themeLabel} h={118} label={ghost ? 'Architecture strip: add blocks on Page 5 to see your signal chain' : `Signal chain of ${blocks.length} blocks`}>
      <defs><pattern id="bp-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="#eadfdb" strokeWidth="0.6" /></pattern></defs>
      <rect x="0" y="0" width="760" height="118" rx="8" fill="url(#bp-grid)" />
      {items.map((b, i) => {
        const x = 18 + i * (w + gap)
        return (
          <g key={i}>
            <g transform={`translate(${x} 22)`}>
              <rect width={w} height={70} rx={8} {...(ghost ? gh : { fill: i % 2 ? '#fff' : '#fbeeed', stroke: MAROON, strokeWidth: 1.6 })} />
              <text x={14} y={22} fontSize="9.5" fontWeight="700" fill={ghost ? GHOST_TXT : MAROON} fontFamily={MONO}>{`BLOCK ${String(i + 1).padStart(2, '0')}`}</text>
              <text x={14} y={42} fontSize="13" fontWeight="700" fill={ghost ? GHOST_TXT : INK} fontFamily="Inter, sans-serif">{ghost ? b.name : clip(b.name || 'Unnamed block', Math.floor(w / 8))}</text>
              <text x={14} y={58} fontSize="10.5" fill={ghost ? GHOST_TXT : MUTED} fontFamily={MONO}>{ghost ? 'FR — · — · —' : b.fr ? `governs: ${b.fr}` : 'no FR linked'}</text>
            </g>
            {i < n - 1 && <Arrow x={x + w + 3} y={57} w={gap - 8} ghost={ghost} />}
          </g>
        )
      })}
      {blocks.length > 4 && <text x={742} y={110} textAnchor="end" fontSize="10.5" fill={MUTED} fontFamily={MONO}>+{blocks.length - 4} more block{blocks.length - 4 === 1 ? '' : 's'} on Page 5</text>}
      {ghost && <text x={380} y={110} textAnchor="middle" fontSize="10.5" fill={GHOST_TXT} fontFamily={MONO}>Your blocks appear here once you add them on Page 5</text>}
    </Diag>
  )
}

/* ---------------- Page 01: ownership topology from the member rows ---------------- */

export function SubsystemTopologyDiagram({ members }: { members: { name: string; subsystem: string }[] }) {
  const real = members.filter((m) => m.name?.trim())
  const ghost = real.length === 0
  const items = ghost ? [1, 2, 3].map((i) => ({ name: `Member ${i}`, subsystem: 'Owned subsystem' })) : real.slice(0, 6)
  const n = items.length, gap = 16, w = Math.min(200, (724 - gap * (n - 1)) / n)
  const owned = real.filter((m) => m.subsystem?.trim()).length
  return (
    <Diag eyebrow="Hardware subsystem ownership" note={ghost ? 'no members yet' : `${real.length} member${real.length === 1 ? '' : 's'} · ${owned} with an owned subsystem`} h={132} label={ghost ? 'Add members on Page 1 to see who owns which subsystem' : 'Subsystem ownership map'}>
      <path d={`M${18 + w / 2} 92 H${18 + (n - 1) * (w + gap) + w / 2}`} fill="none" stroke={ghost ? GHOST : MAROON} strokeWidth="1.6" strokeDasharray="4 3" />
      <text x={380} y={118} textAnchor="middle" fontSize="10.5" fill={ghost ? GHOST_TXT : MUTED} fontFamily={MONO}>{ghost ? 'Shared signal path — appears once members and subsystems are added' : 'shared project record'}</text>
      {items.map((m, i) => (
        <g key={i} transform={`translate(${18 + i * (w + gap)} 14)`}>
          <rect width={w} height={66} rx={8} {...(ghost ? gh : { fill: m.subsystem?.trim() ? '#fff' : '#fffdfc', stroke: m.subsystem?.trim() ? LINE : GHOST, strokeWidth: 1.5, strokeDasharray: m.subsystem?.trim() ? undefined : '5 4' })} />
          <circle cx={26} cy={33} r={14} fill={ghost ? '#fffdfc' : '#fbeeed'} stroke={ghost ? GHOST : MAROON} strokeWidth="1.3" />
          <text x={26} y={37} textAnchor="middle" fontSize="10.5" fontWeight="700" fill={ghost ? GHOST_TXT : MAROON} fontFamily={MONO}>{ghost ? '?' : (m.name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase() || '·')}</text>
          <text x={50} y={29} fontSize="11.5" fontWeight="700" fill={ghost ? GHOST_TXT : INK}>{clip(m.name, Math.floor((w - 56) / 6.5))}</text>
          <text x={50} y={46} fontSize="10.5" fill={ghost || !m.subsystem?.trim() ? GHOST_TXT : MUTED} fontFamily={MONO}>{m.subsystem?.trim() ? clip(m.subsystem, Math.floor((w - 56) / 6.2)) : ghost ? 'Owned subsystem' : 'subsystem not set'}</text>
        </g>
      ))}
    </Diag>
  )
}

/* ---------------- Page 02: design-input provenance & span ---------------- */

const rawNum = (s = '') => { const m = s.replace(/[−–]/g, '-').match(/-?\d+(?:[.,]\d+)?/); return m ? parseFloat(m[0].replace(',', '.')) : NaN }
/** Span ratio of a range such as “10 mV – 2 V”; only when both ends parse with the same unit (or the first has none). */
function spanOf(value = ''): number | null {
  const parts = value.split(/\s*(?:–|—|\bto\b|(?<=[A-Za-zµΩ%\d])\s-\s)\s*/)
  if (parts.length !== 2) return null
  const a = num(parts[0]), b = num(parts[1])
  if (!a || !b) return null
  let lo = a.n, hi = b.n
  if (!a.unit) { lo = rawNum(parts[0]); hi = rawNum(parts[1]) } else if (a.unit !== b.unit) return null
  if (!(lo > 0) || !(hi > 0)) return null
  const r = Math.max(hi, lo) / Math.min(hi, lo)
  return r > 1 ? r : null
}

export function DynamicRangeDiagram({ inputs }: { inputs: { parameter: string; value: string; provenance: string }[] }) {
  const real = inputs.filter((r) => r.parameter?.trim() || r.value?.trim())
  const ghost = real.length === 0
  const items = ghost ? [1, 2, 3].map((i) => ({ parameter: `Parameter ${i}`, value: '— —', provenance: '' })) : real.slice(0, 6)
  const count = (k: string) => real.filter((r) => r.provenance === k).length
  const h = 48 + items.length * 30
  const color = (p: string) => (p === 'measured' ? '#1b8a57' : p === 'assumed' ? '#a8630a' : p === 'datasheet' ? '#2457a6' : GHOST_TXT)
  return (
    <Diag eyebrow="Design inputs · what constrains the design" note={ghost ? 'no inputs yet' : `${count('measured')} measured · ${count('datasheet')} datasheet · ${count('assumed')} assumed`} h={h} label={ghost ? 'Add quantified design inputs on Page 2' : 'Design inputs with provenance'}>
      {items.map((r, i) => {
        const y = 16 + i * 30, span = ghost ? null : spanOf(r.value)
        const bar = span ? Math.min(250, 40 + Math.log10(span) * 70) : 0
        return (
          <g key={i} transform={`translate(14 ${y})`}>
            <rect width={732} height={24} rx={5} {...(ghost ? gh : { fill: '#fff', stroke: '#eadfdb' })} />
            <text x={12} y={16} fontSize="11.5" fontWeight="600" fill={ghost ? GHOST_TXT : INK}>{clip(r.parameter || 'Unnamed parameter', 30)}</text>
            <text x={270} y={16} fontSize="11.5" fill={ghost ? GHOST_TXT : INK} fontFamily={MONO}>{clip(r.value || '—', 22)}</text>
            <text x={430} y={16} fontSize="10.5" fontWeight="700" fill={color(r.provenance)} fontFamily={MONO}>{ghost ? '' : r.provenance || 'no provenance'}</text>
            {span && <><rect x={500} y={8} width={bar} height={8} rx={4} fill={MAROON} opacity=".75" /><text x={506 + bar} y={16} fontSize="10.5" fill={MUTED} fontFamily={MONO}>{span >= 10 ? Math.round(span) : span.toFixed(1)}:1 span</text></>}
          </g>
        )
      })}
    </Diag>
  )
}

/* ---------------- Page 04: traceability from the FR table ---------------- */

export function TraceabilityWebDiagram({ frNos, inputCount, blockCount, calcCount, validCount }: { frNos: string[]; inputCount: number; blockCount: number; calcCount: number; validCount: number }) {
  const n = frNos.length, ghost = n === 0
  const dim = (c: number) => (c === 0 ? GHOST_TXT : MAROON)
  return (
    <Diag eyebrow="Requirement traceability" note="Each FR is linked forward when a block (P5), calculation (P6) or validation row (P9) cites it" h={110} label={ghost ? 'Add functional requirements to see traceability' : `${n} requirements traced to blocks, calculations and validation`}>
      <path d="M174 55 h68 M392 38 l72 -14 M392 55 h72 M392 72 l72 14" fill="none" stroke={ghost ? GHOST : MAROON} strokeWidth="1.6" strokeDasharray={ghost ? '4 3' : undefined} />
      <g transform="translate(18 22)">
        <rect width="156" height="66" rx="8" {...(inputCount ? { fill: '#fff', stroke: LINE, strokeWidth: 1.4 } : gh)} />
        <text x="14" y="24" fontSize="10" fontWeight="700" fill={MUTED} fontFamily={MONO}>PAGE 02 · INPUTS</text>
        <text x="14" y="46" fontSize="13" fontWeight="700" fill={inputCount ? INK : GHOST_TXT}>{inputCount} design input{inputCount === 1 ? '' : 's'}</text>
      </g>
      <g transform="translate(242 18)">
        <rect width="150" height="74" rx="9" {...(ghost ? gh : { fill: '#fbeeed', stroke: MAROON, strokeWidth: 1.8 })} />
        <text x="14" y="24" fontSize="10" fontWeight="700" fill={ghost ? GHOST_TXT : MAROON} fontFamily={MONO}>PAGE 04 · FR TABLE</text>
        <text x="14" y="45" fontSize="14" fontWeight="700" fill={ghost ? GHOST_TXT : INK}>{ghost ? 'No FRs yet' : `${n} requirement${n === 1 ? '' : 's'}`}</text>
        <text x="14" y="62" fontSize="10.5" fill={ghost ? GHOST_TXT : '#7a1520'} fontFamily={MONO}>{ghost ? 'FR-— … FR-—' : n === 1 ? clip(frNos[0] || '—', 18) : `${clip(frNos[0] || '—', 8)} … ${clip(frNos[n - 1] || '—', 8)}`}</text>
      </g>
      {([['Page 05 · Architecture blocks', blockCount, 'citing an FR', 6], ['Page 06 · Sizing calculations', calcCount, 'citing an FR', 41], ['Page 09 · Predicted vs measured', validCount, 'rows', 76]] as const).map(([t, c, w, y]) => (
        <g key={t} transform={`translate(464 ${y})`}>
          <rect width="276" height="28" rx="6" {...(c ? { fill: '#fff', stroke: LINE } : gh)} />
          <text x="12" y="18" fontSize="11" fontWeight="600" fill={c ? INK : GHOST_TXT}>{t}</text>
          <text x="264" y="18" textAnchor="end" fontSize="11" fontWeight="700" fill={dim(c)} fontFamily={MONO}>{c} {w}</text>
        </g>
      ))}
    </Diag>
  )
}

/* ---------------- Page 06: calculation ↔ BOM linkage ---------------- */

export function DesignLinkageDiagram({ calcs, parts }: { calcs: { title: string; fr: string }[]; parts: { part: string; value: string; trace: string }[] }) {
  const L = calcs.filter((c) => c.title?.trim()).slice(0, 5), R = parts.filter((p) => p.part?.trim()).slice(0, 6)
  const ghost = L.length === 0 && R.length === 0
  const left = ghost ? [{ title: 'Calculation', fr: '' }, { title: 'Calculation', fr: '' }] : L
  const right = ghost ? [{ part: 'Part', value: '', trace: '' }, { part: 'Part', value: '', trace: '' }, { part: 'Part', value: '', trace: '' }] : R
  const rows = Math.max(left.length, right.length), h = 52 + rows * 36
  const links: [number, number][] = []
  if (!ghost) right.forEach((p, j) => left.forEach((c, i) => {
    const t = (p.trace || '').toLowerCase()
    if (t && ((c.title && t.includes(c.title.trim().toLowerCase())) || (c.fr?.trim() && t.includes(c.fr.trim().toLowerCase())))) links.push([i, j])
  }))
  const traced = new Set(links.map(([, j]) => j)).size
  return (
    <Diag eyebrow="Design linkage · calculations to parts" note={ghost ? 'nothing linked yet' : `${L.length} calc${L.length === 1 ? '' : 's'} · ${R.length} part${R.length === 1 ? '' : 's'} · ${traced} traced`} h={h} label={ghost ? 'Add calculations and a bill of materials to see how they link' : 'Calculation to part linkage'}>
      {links.map(([i, j], k) => <path key={k} d={`M268 ${34 + i * 36} C 330 ${34 + i * 36}, 330 ${34 + j * 36}, 392 ${34 + j * 36}`} fill="none" stroke={MAROON} strokeWidth="1.5" opacity=".8" />)}
      {left.map((c, i) => (
        <g key={`l${i}`} transform={`translate(18 ${18 + i * 36})`}>
          <rect width={250} height={32} rx={6} {...(ghost ? gh : { fill: '#fbeeed', stroke: MAROON, strokeWidth: 1.3 })} />
          <text x={12} y={20} fontSize="11" fontWeight="700" fill={ghost ? GHOST_TXT : '#7a1520'}>{clip(c.title, 28)}</text>
          {c.fr?.trim() && <text x={238} y={20} textAnchor="end" fontSize="10" fontWeight="700" fill={MAROON} fontFamily={MONO}>{clip(c.fr, 8)}</text>}
        </g>
      ))}
      {right.map((p, j) => {
        const lk = links.some(([, jj]) => jj === j)
        return (
          <g key={`r${j}`} transform={`translate(392 ${18 + j * 36})`}>
            <rect width={350} height={32} rx={6} {...(ghost ? gh : lk ? { fill: '#fff', stroke: LINE, strokeWidth: 1.3 } : { ...gh, stroke: '#d9b88a' })} />
            <text x={12} y={20} fontSize="11" fontWeight="600" fill={ghost ? GHOST_TXT : INK}>{clip(p.part, 22)}{p.value ? ` · ${clip(p.value, 24)}` : ''}</text>
            {!ghost && !lk && <text x={338} y={20} textAnchor="end" fontSize="10" fill="#a8630a" fontFamily={MONO}>{p.trace?.trim() ? 'traces elsewhere' : 'untraced'}</text>}
          </g>
        )
      })}
    </Diag>
  )
}

/* ---------------- Page 07: course → decision → measured ---------------- */

export function CourseKnowledgeGraph({ rows }: { rows: { course: string; decision: string; measured: string }[] }) {
  const real = rows.filter((r) => r.decision?.trim() || r.course?.trim()).slice(0, 4)
  const ghost = real.length === 0
  const items = ghost ? [0, 1, 2].map(() => ({ course: 'Foundation course', decision: 'Design decision', measured: '' })) : real
  const h = 20 + items.length * 40 + 14
  return (
    <Diag eyebrow="Course-to-hardware integration" note="Theory → design decision → bench result" h={h} label={ghost ? 'Add integration map rows to connect courses to decisions' : 'Course to decision graph'}>
      {items.map((r, i) => {
        const y = 12 + i * 40, m = r.measured?.trim()
        return (
          <g key={i} transform={`translate(16 ${y})`}>
            <path d="M194 16 C 245 16, 245 16, 284 16" fill="none" stroke={ghost ? GHOST : MAROON} strokeWidth="1.5" strokeDasharray={ghost ? '4 3' : undefined} />
            <path d="M474 16 h58" fill="none" stroke={ghost || !m ? GHOST : '#1b8a57'} strokeWidth="1.5" strokeDasharray="4 3" />
            <rect width="194" height="32" rx="6" {...(ghost || !r.course?.trim() ? gh : { fill: '#fbeeed', stroke: MAROON, strokeWidth: 1.3 })} />
            <text x="12" y="20" fontSize="11" fontWeight="700" fill={ghost || !r.course?.trim() ? GHOST_TXT : '#7a1520'}>{clip(r.course?.trim() || (ghost ? r.course : 'course not set'), 24)}</text>
            <rect x="284" width="190" height="32" rx="6" {...(ghost ? gh : { fill: '#fff', stroke: LINE, strokeWidth: 1.3 })} />
            <text x="296" y="20" fontSize="11" fontWeight="600" fill={ghost ? GHOST_TXT : INK}>{clip(r.decision || 'Design decision', 24)}</text>
            <rect x="532" width="196" height="32" rx="6" {...(m ? { fill: '#e1f4ea', stroke: '#1b8a57', strokeWidth: 1.3 } : gh)} />
            <text x="544" y="20" fontSize="10.5" fontWeight={m ? 700 : 400} fill={m ? '#1b8a57' : GHOST_TXT} fontFamily={MONO}>{m ? clip(m, 24) : 'not measured yet'}</text>
          </g>
        )
      })}
    </Diag>
  )
}

/* ---------------- Page 08: verification funnel from counts ---------------- */

export function VerificationFunnel({ sims, tests, measured, integrationWords, deviations }: { sims: number; tests: number; measured: number; integrationWords: number; deviations: number }) {
  const stages = [
    { t: 'Simulation', big: `${sims}`, sub: sims === 1 ? 'testbench / sim' : 'testbenches / sims', on: sims > 0 },
    { t: 'Subsystem tests', big: `${tests}`, sub: `${measured} with a measured value`, on: tests > 0 },
    { t: 'Integration', big: integrationWords ? 'written' : '—', sub: integrationWords ? `${integrationWords} words` : 'not written yet', on: integrationWords > 0 },
    { t: 'Deviations', big: `${deviations}`, sub: deviations ? 'recorded' : 'none recorded', on: deviations > 0 },
  ]
  const empty = stages.every((s) => !s.on)
  return (
    <Diag eyebrow="Verification progress" note={empty ? 'nothing recorded yet' : 'counts from your Page 8 records'} h={108} label="Verification stages with counts from your records">
      {stages.map((s, i) => {
        const x = 18 + i * 184
        return (
          <g key={s.t}>
            <g transform={`translate(${x} 14)`}>
              <rect width={150} height={80} rx={9} {...(s.on ? { fill: i === 1 ? '#fbeeed' : '#fff', stroke: MAROON, strokeWidth: 1.5 } : gh)} />
              <text x={14} y={22} fontSize="9.5" fontWeight="700" fill={s.on ? MAROON : GHOST_TXT} fontFamily={MONO}>{s.t.toUpperCase()}</text>
              <text x={14} y={52} fontSize="22" fontWeight="700" fill={s.on ? INK : GHOST_TXT} fontFamily={MONO}>{s.big}</text>
              <text x={14} y={70} fontSize="10.5" fill={s.on ? MUTED : GHOST_TXT} fontFamily={MONO}>{s.sub}</text>
            </g>
            {i < 3 && <Arrow x={x + 152} y={54} w={28} ghost={!s.on} />}
          </g>
        )
      })}
    </Diag>
  )
}

/* ---------------- Page 09: deviation chart from validation rows ---------------- */

export function DeviationChart({ rows }: { rows: { fr: string; predicted: string; measured: string }[] }) {
  const pts: { fr: string; p: string; m: string; dev: number }[] = []
  const skipped: string[] = []
  rows.forEach((r) => {
    if (!r.predicted?.trim() && !r.measured?.trim()) return
    const p = num(r.predicted), m = num(r.measured)
    if (p && m && p.unit === m.unit && p.n !== 0) pts.push({ fr: r.fr || '—', p: r.predicted.trim(), m: r.measured.trim(), dev: ((m.n - p.n) / Math.abs(p.n)) * 100 })
    else skipped.push(r.fr || '—')
  })
  const shown = pts.slice(0, 6), ghost = shown.length === 0
  const max = Math.max(5, ...shown.map((x) => Math.abs(x.dev))), R = Math.min(100, Math.ceil((max * 1.15) / 5) * 5)
  const cx = 520, half = 190, scale = half / R
  const top = 18, rowsN = Math.max(shown.length, ghost ? 3 : 0), axisY = top + rowsN * 26 + 8
  const h = axisY + 24 + (skipped.length ? 18 : 0)
  const rowsToDraw = ghost ? [0, 1, 2].map(() => null) : shown
  return (
    <Diag eyebrow="Deviation from prediction" note={ghost ? 'needs numeric predicted and measured values' : `(measured − predicted) ÷ predicted · axis ±${R}%`} h={h} label={ghost ? 'Enter predicted and measured values to see deviations' : 'Deviation of measured values from predictions'}>
      <line x1={cx} y1={10} x2={cx} y2={axisY} stroke={ghost ? GHOST : INK} strokeWidth="1.2" strokeDasharray={ghost ? '4 3' : undefined} />
      <line x1={cx - half} y1={axisY} x2={cx + half} y2={axisY} stroke={ghost ? GHOST : LINE} strokeWidth="1" />
      {rowsToDraw.map((d, i) => {
        const y = top + i * 26
        if (!d) return <g key={i}><text x={14} y={y + 12} fontSize="11" fill={GHOST_TXT} fontFamily={MONO}>FR-—</text><rect x={cx - 70} y={y + 3} width={140} height={10} rx={5} {...gh} /></g>
        const raw = Math.abs(d.dev) * scale, w = Math.min(raw, half), clipped = raw > half
        return (
          <g key={i}>
            <text x={14} y={y + 12} fontSize="11.5" fontWeight="700" fill={INK} fontFamily={MONO}>{clip(d.fr, 9)}</text>
            <text x={104} y={y + 12} fontSize="10.5" fill={MUTED} fontFamily={MONO}>{clip(`${d.p} → ${d.m}`, 30)}</text>
            <rect x={d.dev >= 0 ? cx : cx - w} y={y + 2} width={Math.max(w, 2)} height={12} rx={3} fill={MAROON} opacity=".85" />
            {clipped && <text x={d.dev >= 0 ? cx + w + 3 : cx - w - 3} y={y + 12} textAnchor={d.dev >= 0 ? 'start' : 'end'} fontSize="10" fill={MAROON}>▸ beyond axis</text>}
            <text x={745} y={y + 12} textAnchor="end" fontSize="10.5" fontWeight="700" fill={INK} fontFamily={MONO}>{`${d.dev >= 0 ? '+' : ''}${Math.abs(d.dev) >= 1000 ? Math.round(d.dev) : d.dev.toFixed(1)}%`}</text>
          </g>
        )
      })}
      <text x={cx - half} y={axisY + 14} fontSize="10" fill={MUTED} fontFamily={MONO}>−{R}%</text>
      <text x={cx} y={axisY + 14} textAnchor="middle" fontSize="10" fill={MUTED} fontFamily={MONO}>0</text>
      <text x={cx + half} y={axisY + 14} textAnchor="end" fontSize="10" fill={MUTED} fontFamily={MONO}>+{R}%</text>
      {skipped.length > 0 && <text x={14} y={h - 6} fontSize="10.5" fill="#a8630a" fontFamily={MONO}>Not plottable (non-numeric or mixed units): {clip(skipped.join(', '), 70)}</text>}
    </Diag>
  )
}

/* ---------------- Page 10: debugging loop with real cycle counts ---------------- */

export function DebuggingLoopDiagram({ cycles }: { cycles: Record<string, string>[] }) {
  const total = cycles.length
  const count = (f: string) => cycles.filter((c) => (c[f] ?? '').trim()).length
  const nodes = [
    { n: '01', t: 'Symptom', f: 'symptom', x: 24, y: 20 },
    { n: '02', t: 'Isolation test', f: 'test', x: 274, y: 20 },
    { n: '03', t: 'Root cause', f: 'cause', x: 524, y: 20 },
    { n: '06', t: 'Learning', f: 'learning', x: 24, y: 88 },
    { n: '05', t: 'Re-measurement', f: 'remeasure', x: 274, y: 88 },
    { n: '04', t: 'Correction', f: 'fix', x: 524, y: 88 },
  ]
  return (
    <Diag eyebrow="Closed-loop debugging" note={total ? `${total} cycle${total === 1 ? '' : 's'} · ${cycles.filter((c) => c.state === 'Closed').length} closed` : 'no failure cycles yet'} h={150} label="Six-step debugging loop with the number of cycles that completed each step">
      <path d="M224 44 h50 M474 44 h50 M624 68 v20 M524 112 h-50 M274 112 h-50 M124 88 v-20" fill="none" stroke={total ? MAROON : GHOST} strokeWidth="1.8" strokeDasharray={total ? undefined : '4 3'} />
      {nodes.map((nd) => {
        const c = count(nd.f), on = c > 0
        return (
          <g key={nd.n} transform={`translate(${nd.x} ${nd.y})`}>
            <rect width="200" height="48" rx="8" {...(on ? { fill: '#fff', stroke: c === total ? MAROON : LINE, strokeWidth: 1.5 } : gh)} />
            <circle cx="24" cy="24" r="13" fill={on ? MAROON : '#e8dedb'} />
            <text x="24" y="28" textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff" fontFamily={MONO}>{nd.n}</text>
            <text x="46" y="21" fontSize="11.5" fontWeight="700" fill={on ? INK : GHOST_TXT}>{nd.t}</text>
            <text x="46" y="36" fontSize="10" fill={on ? MUTED : GHOST_TXT} fontFamily={MONO}>{total ? `${c} of ${total} cycle${total === 1 ? '' : 's'}` : 'none yet'}</text>
          </g>
        )
      })}
    </Diag>
  )
}

/* ---------------- Page 14: DRAFT poster preview, generated only from entered data ---------------- */

export interface PosterData {
  team: string; artefact: string; themeLine: string; need: string; frs: { no: string; target: string }[]; blocks: string[]
  results: { fr: string; predicted: string; measured: string }[]; lesson: string
}
const firstSentence = (t: string, max = 150) => clip((t.trim().split(/(?<=[.!?])\s+/)[0] ?? '').trim(), max)

export function PosterMiniature({ data }: { data: PosterData }) {
  const need = firstSentence(data.need), lesson = firstSentence(data.lesson)
  const box = (n: number, title: string, body: ReactNode | null, missing: string) => (
    <div className={`p-box ${body ? '' : 'missing'}`}><b>{n}. {title}</b>{body ? <span>{body}</span> : <span><i>Missing — {missing}</i></span>}</div>
  )
  const filledFrs = data.frs.filter((f) => f.no.trim())
  return (
    <div className="poster-mock" aria-label="Draft preview of the A1 summary poster, generated from your portfolio">
      <div className="poster-draft" role="note">Draft preview · auto-generated from your portfolio — not your final poster</div>
      <div className="poster-head">
        <span className="mono" style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase' }}>KLE Technological University</span>
        <h4>{data.artefact || <i>Artefact not set</i>}</h4>
        <small>{data.team || 'Team name missing'} · {data.themeLine}</small>
      </div>
      <div className="poster-grid">
        {box(1, 'Need & specs', need || filledFrs.length ? <>{need}{filledFrs.length > 0 && <><br />{filledFrs.slice(0, 3).map((f) => `${f.no}${f.target ? `: ${f.target}` : ''}`).join(' · ')}</>}</> : null, 'write the need statement (Page 2) and add requirements (Page 4)')}
        {box(2, 'Architecture', data.blocks.length ? data.blocks.slice(0, 5).join(' → ') : null, 'add blocks on Page 5')}
        {box(3, 'Validation', data.results.length ? data.results.slice(0, 3).map((r) => `${r.fr || '—'}: ${r.predicted || '?'} → ${r.measured || '?'}`).join(' · ') : null, 'add predicted vs measured rows on Page 9')}
        {box(4, 'Key learning', lesson || null, 'write the lessons on Page 13')}
      </div>
    </div>
  )
}
