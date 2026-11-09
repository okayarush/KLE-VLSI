import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'
import './styles/chain.css'
import './styles/landing.css'
import './styles/student.css'
import './styles/ai.css'
import './styles/workspace.css'
import './styles/overview.css'
import { router } from './app/router'
import { startAuth } from './features/auth/bootstrap'

startAuth()
// Warm the post-login route chunks ahead of time, so a redirect right after sign-in never has to
// wait mid-transition for one of them (which can otherwise abort and restart the chunk load).
void import('./features/student/Onboarding')
void import('./features/student/Shell')
void import('./features/student/Dashboard')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
