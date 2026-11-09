import type { ReactNode } from 'react'
import { AlertTriangle, CircleHelp, FileQuestion, FileWarning, Lightbulb, ScanSearch, Sparkles, Info } from 'lucide-react'
import type { IssueType } from '../state/store'
import type { Insight } from './engine'

/** Reserved AI hue, used ONLY for AI content (DESIGN_GUIDELINES: --ai). */
export function AIBadge({ simulated = true }: { simulated?: boolean }) {
  return (
    <span className="ai-badge" title={simulated ? 'Simulated preview — real AI is not connected yet' : undefined}>
      <Sparkles size={13} /> AI {simulated && <i>· simulated preview</i>}
    </span>
  )
}

export function AIBanner({ children }: { children?: ReactNode }) {
  return (
    <div className="banner banner-ai" role="note">
      <Info size={18} />
      <div>
        <b>Simulated preview — real AI is not connected yet.</b> {children ?? <><b>AI insight — advisory only.</b> It is not an official evaluation, carries no marks, and does not replace faculty review. Your assigned faculty decide gates and assessment.</>}
      </div>
    </div>
  )
}

export const ISSUE_ICON: Record<IssueType, typeof AlertTriangle> = {
  'Unsupported assumption': CircleHelp,
  'Possible error': AlertTriangle,
  'Open design choice': Lightbulb,
  'Needs context': FileQuestion,
  Incomplete: FileWarning,
  'Missing evidence': ScanSearch,
}

export function IssueChip({ type }: { type: IssueType }) {
  const Icon = ISSUE_ICON[type]
  return <span className="chip chip-ai"><Icon size={12} /> {type}</span>
}

export function InsightCard({ i, onOpen, onDismiss, compact }: { i: Insight; onOpen?: () => void; onDismiss?: () => void; compact?: boolean }) {
  return (
    <article className={`insight ${compact ? 'insight-compact' : ''}`}>
      <div className="row wrap" style={{ gap: 8 }}>
        <IssueChip type={i.type} />
        {i.sectionTitle && !compact && <span className="muted" style={{ fontSize: 12 }}>{i.sectionTitle}</span>}
      </div>
      <b className="insight-title">{i.title}</b>
      {i.quote && <blockquote className="insight-quote">“{i.quote}”</blockquote>}
      <p className="muted">{i.detail}</p>
      {i.question && <p className="insight-q"><CircleHelp size={14} /> {i.question}</p>}
      {(onOpen || onDismiss) && (
        <div className="row" style={{ gap: 6 }}>
          {onOpen && <button className="btn btn-quiet btn-sm" onClick={onOpen}>Go to section</button>}
          {onDismiss && <button className="btn btn-quiet btn-sm" onClick={onDismiss}>Dismiss</button>}
        </div>
      )}
    </article>
  )
}
