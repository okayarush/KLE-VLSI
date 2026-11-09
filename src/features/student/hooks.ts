import { useMemo } from 'react'
import { demoTeam } from '../../demo/team'
import { useStore } from '../../state/store'
import type { Content } from '../../lib/progress'
import type { Team } from '../../data/team'

export function useContent(): Content {
  const prose = useStore((s) => s.prose)
  const rows = useStore((s) => s.rows)
  const evidence = useStore((s) => s.evidence)
  return useMemo(() => ({ prose, rows, evidence }), [prose, rows, evidence])
}

/** The real team (Supabase) for real students; the fictional demo team only in demo mode. */
export function useTeam(): Team {
  const session = useStore((s) => s.session)
  const team = useStore((s) => s.team)
  const owned = useStore((s) => s.rows['1.members'])
  return useMemo(() => {
    if (session?.mode === 'demo' || !team) return demoTeam(session?.name ?? 'Student')
    // subsystem ownership is whatever the team wrote on Page 1 — never invented
    const sub = (name: string) => owned?.find((r) => (r.v.name ?? '').trim().toLowerCase() === name.trim().toLowerCase())?.v.subsystem ?? ''
    return { ...team, members: team.members.map((m) => ({ ...m, subsystem: sub(m.name) })) }
  }, [session, team, owned])
}

export const useIsDemo = () => useStore((s) => s.session?.mode === 'demo')
