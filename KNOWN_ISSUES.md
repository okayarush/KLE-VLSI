# Known issues

## Open: student sometimes stuck on `/student` after first real login (never reaches `/onboarding`)

**Status:** unresolved, parked. Auth is being set up later — `test@kletech.ac.in` / `kletest123`
exists in Supabase (email pre-confirmed) for manual testing via the password-login dev path
(`VITE_ENABLE_PASSWORD_LOGIN=true` in `web/.env.local`).

**Symptom:** after a brand-new student signs in for the first time (no team yet), the app is
*supposed* to redirect from `/student` to `/onboarding` (handled by `RequireStudent` in
[src/app/router.tsx](src/app/router.tsx)). About half the time it instead sits on a blank
`/student` page for 15–20+ seconds (observed, not just slow — it doesn't resolve on its own
within a 20s wait) before the test gives up. Confirmed via Playwright + password login against the
real Supabase project, not a mock.

**Confirmed NOT the cause:**
- The store state is correct when this happens: `{ booting: false, workspaceReady: true, team:
  null, session: { mode: 'real', ... } }` — i.e. `RequireStudent`'s condition for redirecting
  (`session.mode === 'real' && !team`) is true. Logging inside `RequireStudent` confirms it
  re-renders with this state and does take the `<Navigate to="/onboarding" replace>` branch
  repeatedly (logged `-> navigate /onboarding` several times) — yet `page.url()` never changes
  and the Onboarding route component never logs that it rendered (`RequireSessionNoTeam -> outlet
  (onboarding should render)` never appears in the stuck cases).
- Not a `team` data bug — the `team_members` query genuinely returns no row for these fresh
  users (confirmed via the RLS test and via direct network capture, single query, 200 OK).
- Not the double-`hydrate()` race I fixed along the way (see below) — the bug still reproduces
  (in fact reproduced 4/4 times in one run) even with exactly one `hydrate()` call.

**Fixed along the way (kept, real bugs, just not *the* bug):**
1. `hydrate()` had no re-entrancy guard, so the explicit call in `SignIn.tsx` and the one Supabase
   fires via `onAuthStateChange('SIGNED_IN')` ran concurrently, duplicating every network call.
   Fixed in [src/features/auth/bootstrap.ts](src/features/auth/bootstrap.ts) with an in-flight
   promise guard (`hydrate()` now returns the already-running call instead of starting a second
   one).
2. The `/onboarding`, `/student` (Shell) and Dashboard route chunks are now eagerly warmed at app
   start ([src/main.tsx](src/main.tsx)) instead of only on first navigation, in case a `<Navigate>`
   firing mid-chunk-load was contributing (react-router's `<Navigate>` re-invokes `navigate()` on
   every render with no dependency array, and I suspected this could abort/restart a still-loading
   lazy chunk). This didn't fix the bug either, but it's a legitimate perf/robustness improvement
   to keep.

**Leading theory, unconfirmed:** something about react-router v7's data router and a `<Navigate>`
rendered from a non-lazy wrapper route (`RequireStudent`) whose *target* route (`/onboarding`) is
itself `lazy()`-loaded. The repeated `navigate()` calls are logged as happening, but the actual
history/URL never commits. Worth trying next:
- Render `<Navigate>` from a route element that isn't gating a `lazy()` child, or call
  `useNavigate()` imperatively from a `useEffect` with an explicit dependency array instead of
  relying on `<Navigate>`'s every-render behavior.
- Try `navigate('/onboarding', { replace: true, viewTransition: false })` or swap `replace` for a
  push to rule out a `history.replaceState` interaction.
- Reproduce without Playwright (plain browser + manual login) to rule out a Playwright/CDP
  navigation-tracking quirk specifically with react-router's client-side transitions.
- Add a temporary `console.log` inside the Onboarding component's module top-level (not just
  inside the function body) to check whether the chunk is even being *requested* by the browser
  during the stuck window (Network tab / `page.on('request')`), which would distinguish "chunk
  never requested" from "chunk requested but navigation never commits".

**How to reproduce:** `web/e2e/workflow.spec.ts` hits this on its very first step (sign in → wait
for `/onboarding`). Run `npm run test:e2e -- e2e/workflow.spec.ts`; it fails intermittently
(seen both passing fast ~1s and failing at the 180s test timeout, no retries, in the same run of
4 sequential logins). The full 16-page workflow test has not yet completed a run end-to-end
because of this.
