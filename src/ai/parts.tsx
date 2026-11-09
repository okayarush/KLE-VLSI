import { useEffect, useState, type ReactNode } from 'react'
import { AlertTriangle, CircleHelp, FileQuestion, FileWarning, Lightbulb, ScanSearch, Sparkles, Info } from 'lucide-react'
import type { IssueType } from '../state/store'
import type { Insight } from './engine'
import { getAiStatus, type AiStatus } from './groq'

/** Reserved AI hue, used ONLY for AI content (DESIGN_GUIDELINES: --ai). */
export function AIBadge({ simulated }: { simulated?: boolean }) {
  const [status, setStatus] = useState<AiStatus | null>(null)

  useEffect(() => {
    getAiStatus().then(setStatus)
  }, [])

  const isLive = simulated === false || (status?.configured ?? false)
  const label = isLive ? 'AI Mentor · Groq Llama 3.3' : 'AI · simulated preview'

  return (
    <span
      className={`ai-badge ${isLive ? 'ai-live' : ''}`}
      title={isLive ? 'Connected to Groq LPU (Llama 3.3 70B)' : 'Simulated preview mode'}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
    >
      <Sparkles size={13} />
      <span>{label}</span>
      {isLive && (
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            backgroundColor: '#10b981',
            display: 'inline-block',
          }}
          title="Online"
        />
      )}
    </span>
  )
}

export function AIBanner({ children, simulated }: { children?: ReactNode; simulated?: boolean }) {
  const [status, setStatus] = useState<AiStatus | null>(null)

  useEffect(() => {
    getAiStatus().then(setStatus)
  }, [])

  const isLive = simulated === false || (status?.configured ?? false)

  return (
    <div className="banner banner-ai" role="note">
      <Info size={18} />
      <div>
        {isLive ? (
          <b>AI Mentor active (Groq Llama 3.3 70B). </b>
        ) : (
          <b>Simulated preview (Groq key not configured). </b>
        )}
        {children ?? (
          <>
            <b>AI insight — advisory only.</b> It is not an official evaluation, carries no marks, and does not replace faculty review. Your assigned faculty decide gates and assessment.
          </>
        )}
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
