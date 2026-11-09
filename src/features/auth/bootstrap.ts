import { supabase, supabaseConfigured } from '../../lib/supabase'
import { THEMES, type ReviewId } from '../../data/handbook'
import type { Team } from '../../data/team'
import { loadAll } from '../../state/remote'
import { useStore, type FacultyReview } from '../../state/store'

const nameOf = (email: string, full?: string) => full?.trim() || email.split('@')[0].split(/[._-]+/).filter(Boolean).map((p) => p[0].toUpperCase() + p.slice(1).toLowerCase()).join(' ') || 'Student'

/**
 * Loads the signed-in student's team + workspace from Supabase into the store.
 * Guarded against overlap: sign-in calls this explicitly, and Supabase's own `onAuthStateChange`
 * also fires a SIGNED_IN event for the same login, which would otherwise race a second, concurrent
 * run — each re-render it causes re-fires any pending <Navigate> effect and can repeatedly abort a
 * lazy route chunk that's still loading. Overlapping calls instead await the one already in flight.
 */
let inflight: Promise<void> | null = null
export function hydrate(): Promise<void> {
  if (inflight) return inflight
  inflight = hydrateNow().finally(() => { inflight = null })
  return inflight
}
async function hydrateNow(): Promise<void> {
  const st = useStore.getState()
  const { data } = await supabase.auth.getSession()
  const user = data.session?.user
  if (!user) { if (st.session?.mode === 'real') st.signOut(); useStore.setState({ booting: false }); return }
  try {
    await supabase.rpc('claim_invites')
    const prof = await supabase.from('profiles').select('full_name,email').eq('id', user.id).maybeSingle()
    const email = prof.data?.email ?? user.email ?? ''
    const name = nameOf(email, prof.data?.full_name)
    useStore.setState({ session: { email, name, mode: 'real', userId: user.id } })
    const mem = await supabase.from('team_members').select('team_id').eq('user_id', user.id).maybeSingle()
    if (!mem.data) { useStore.getState().loadWorkspace(null); useStore.setState({ booting: false }); return }
    const tid = mem.data.team_id as string
    const [team, members, content, reviews] = await Promise.all([
      supabase.from('teams').select('*').eq('id', tid).single(),
      supabase.from('team_members').select('user_id, role, profiles(full_name,email)').eq('team_id', tid),
      loadAll(tid),
      supabase.from('faculty_reviews').select('*').eq('team_id', tid).not('released_at', 'is', null).order('created_at'),
    ])
    if (team.error) throw team.error
    const theme = THEMES[(team.data.theme_no as number) - 1] ?? THEMES[0]
    const t: Team = {
      id: tid, name: team.data.name, isDemo: false, theme, artefact: team.data.artefact, currentReview: team.data.current_review as ReviewId, mentor: null,
      members: ((members.data ?? []) as any[]).map((m) => ({ id: m.user_id, name: nameOf(m.profiles?.email ?? '', m.profiles?.full_name), subsystem: '', ...(m.role === 'lead' ? { role: 'Portfolio Lead' as const } : {}) })),
    }
    const fr: FacultyReview[] = ((reviews.data ?? []) as any[]).map((r) => ({ id: r.id, reviewId: r.review_id, summary: r.summary, observations: r.observations ?? [], releasedAt: r.released_at }))
    useStore.getState().loadWorkspace(t, content, fr)
  } catch (e) {
    console.error('workspace load failed', e)
  } finally { useStore.setState({ booting: false }) }
}

let started = false
export function startAuth() {
  if (started) return; started = true
  const st = useStore.getState()
  if (st.session?.mode === 'demo') { useStore.setState({ booting: false, workspaceReady: true }); return }
  if (!supabaseConfigured) { useStore.setState({ booting: false }); return }
  void hydrate()
  supabase.auth.onAuthStateChange((evt) => {
    const s = useStore.getState()
    if (evt === 'SIGNED_IN' && s.session?.mode !== 'demo' && !s.workspaceReady) setTimeout(() => void hydrate(), 0)
    if (evt === 'SIGNED_OUT' && s.session?.mode === 'real') s.signOut()
  })
}

export async function signOutAll() {
  const s = useStore.getState()
  if (s.session?.mode === 'real') { await (await import('../../state/remote')).flush(); await supabase.auth.signOut() }
  s.signOut(); useStore.setState({ booting: false })
}
