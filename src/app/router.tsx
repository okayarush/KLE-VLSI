import { Navigate, Outlet, createBrowserRouter, useLocation } from 'react-router-dom'
import { useStore } from '../state/store'

/** Real students need a Supabase session and a team; demo mode needs neither. */
function RequireStudent() {
  const session = useStore((s) => s.session)
  const booting = useStore((s) => s.booting)
  const ready = useStore((s) => s.workspaceReady)
  const team = useStore((s) => s.team)
  const loc = useLocation()
  if (booting || (session && !ready)) return <div className="boot" role="status" aria-live="polite">Opening your notebook…</div>
  if (!session) return <Navigate to="/signin" replace state={{ from: loc.pathname }} />
  if (session.mode === 'real' && !team) return <Navigate to="/onboarding" replace />
  return <Outlet />
}

function RequireSessionNoTeam() {
  const session = useStore((s) => s.session)
  const booting = useStore((s) => s.booting)
  const team = useStore((s) => s.team)
  if (booting) return <div className="boot" role="status">Loading…</div>
  if (!session) return <Navigate to="/signin" replace />
  if (session.mode === 'demo' || team) return <Navigate to="/student" replace />
  return <Outlet />
}

export const router = createBrowserRouter([
  { path: '/', lazy: async () => ({ Component: (await import('../features/landing/Landing')).Landing }) },
  { path: '/signin', lazy: async () => ({ Component: (await import('../features/auth/SignIn')).SignIn }) },
  { element: <RequireSessionNoTeam />, children: [{ path: '/onboarding', lazy: async () => ({ Component: (await import('../features/student/Onboarding')).Onboarding }) }] },
  {
    element: <RequireStudent />,
    children: [
      {
        path: '/student',
        lazy: async () => ({ Component: (await import('../features/student/Shell')).StudentShell }),
        children: [
          { index: true, lazy: async () => ({ Component: (await import('../features/student/Dashboard')).Dashboard }) },
          { path: 'team', lazy: async () => ({ Component: (await import('../features/student/Team')).TeamWorkspace }) },
          { path: 'portfolio', lazy: async () => ({ Component: (await import('../features/student/PortfolioOverview')).PortfolioOverview }) },
          { path: 'portfolio/:slug', lazy: async () => ({ Component: (await import('../features/student/portfolio/PageEditor')).PageEditor }) },
          { path: 'evidence', lazy: async () => ({ Component: (await import('../features/student/Evidence')).EvidenceLibrary }) },
          { path: 'mentor', lazy: async () => ({ Component: (await import('../features/student/Mentor')).Mentor }) },
          { path: 'analysis', lazy: async () => ({ Component: (await import('../features/student/Analysis')).Analysis }) },
          { path: 'feedback', lazy: async () => ({ Component: (await import('../features/student/Feedback')).Feedback }) },
          { path: 'submit', lazy: async () => ({ Component: (await import('../features/student/Submit')).Submit }) },
        ],
      },
    ],
  },
  // Future role-specific interfaces: isolated routes, intentionally empty (student-first plan §1).
  { path: '/faculty/*', lazy: async () => { const { RolePlaceholder } = await import('../roles/RolePlaceholder'); return { Component: () => <RolePlaceholder role="Faculty" /> } } },
  { path: '/hod/*', lazy: async () => { const { RolePlaceholder } = await import('../roles/RolePlaceholder'); return { Component: () => <RolePlaceholder role="Head of Department" /> } } },
  { path: '/admin/*', lazy: async () => { const { RolePlaceholder } = await import('../roles/RolePlaceholder'); return { Component: () => <RolePlaceholder role="Administrator" /> } } },
  { path: '*', element: <Navigate to="/" replace /> },
])
