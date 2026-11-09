import { expect, test, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { readinessFor } from '../src/lib/readiness'
import { matrixProgress, sectionProgress, type Content } from '../src/lib/progress'
import { PAGES } from '../src/data/pages'

/**
 * Usability refinement pass — pilot pages 2, 4, 5, 9 + shared components.
 * Covers: Page 3 comparison readiness (pure logic), empty and populated states, every new link,
 * and tooltips with mouse, keyboard and touch. No Supabase needed (demo mode).
 */

const emptyDemo = {
  state: {
    session: { email: 'blank.tester@kletech.ac.in', name: 'Blank Tester', mode: 'demo' },
    prose: {}, proseDoc: {}, rows: {}, evidence: [], stepStates: {}, mentor: [], activity: [], completed: {},
    submission: { status: 'draft' }, submitChecks: {}, dismissedInsights: [], lastPage: null, savedAt: null,
  },
  version: 1,
}
const goEmpty = async (page: Page, slug: string) => {
  await page.addInitScript((v) => { if (!localStorage.getItem('fip-demo-v1')) localStorage.setItem('fip-demo-v1', JSON.stringify(v)) }, emptyDemo)
  await page.goto(`/student/portfolio/${slug}`)
  await expect(page.locator('.pg-main h1')).toBeVisible()
}
const goDemo = async (page: Page, slug: string) => {
  await page.goto('/signin')
  await page.getByRole('button', { name: /Explore the demo project/ }).click()
  await page.waitForURL('**/student')
  await page.goto(`/student/portfolio/${slug}`)
  await expect(page.locator('.pg-main h1')).toBeVisible()
}
const tip = (page: Page) => page.getByRole('tooltip')
const shot = async (page: Page, name: string) => { mkdirSync('e2e/shots/usability', { recursive: true }); await page.screenshot({ path: `e2e/shots/usability/${name}.png`, fullPage: true }) }

/* ------------------------------------------------------------- Page 3 comparison readiness (pure logic) */
const row = (v: Record<string, string>, id = crypto.randomUUID()) => ({ id, v, at: new Date().toISOString() })
const content = (rows: Content['rows'], prose: Content['prose'] = {}): Content => ({ prose, rows, evidence: [] })
const alts = ['a', 'b', 'c'].map((id) => row({ name: `Concept ${id}` }, id))
const criterion = (name: string, w: string, scores: Record<string, string>) => row({ criterion: name, weight: w, ...Object.fromEntries(Object.entries(scores).map(([k, v]) => [`s:${k}`, v])) })
const cmp = (c: Content) => readinessFor('R2', c).find((x) => x.id === 'cmp')!.status
const THIRTY_WORDS = Array.from({ length: 35 }, (_, i) => `word${i}`).join(' ')

test.describe('Page 3 comparison readiness evaluates the matrix', () => {
  test('complete matrix with no prose is met', () => {
    const c = content({ '3.alts': alts, '3.matrix': [criterion('Gain', '5', { a: '5', b: '3', c: '2' }), criterion('Cost', '3', { a: '3', b: '4', c: '5' })] })
    expect(matrixProgress(c).complete).toBe(true)
    expect(cmp(c)).toBe('met')
  })
  test('long prose alone (the old rule) is no longer enough', () => {
    expect(cmp(content({ '3.alts': alts }, { '3.compare': THIRTY_WORDS }))).toBe('unmet')
  })
  test('a missing score, an out-of-range score, a missing weight or fewer than 3 concepts is unmet', () => {
    const base = (m: ReturnType<typeof criterion>[], a = alts) => content({ '3.alts': a, '3.matrix': m }, { '3.compare': THIRTY_WORDS })
    expect(cmp(base([criterion('Gain', '5', { a: '5', b: '3' })]))).toBe('unmet')                       // c not scored
    expect(cmp(base([criterion('Gain', '5', { a: '5', b: '3', c: '6' })]))).toBe('unmet')                // 6 is outside 1–5
    expect(cmp(base([criterion('Gain', '', { a: '5', b: '3', c: '2' })]))).toBe('unmet')                 // no weight
    expect(cmp(base([criterion('Gain', '5', { a: '5', b: '3' })], alts.slice(0, 2)))).toBe('unmet')       // only two concepts
    expect(cmp(content({ '3.alts': alts, '3.matrix': [] }, { '3.compare': THIRTY_WORDS }))).toBe('unmet') // no criteria
  })
  test('section progress counts the matrix, so the Comparison tab is not "not started" when it is filled', () => {
    const sec = PAGES[3].sections.find((s) => s.id === 'compare')!
    const withMatrix = content({ '3.alts': alts, '3.matrix': [criterion('Gain', '5', { a: '5', b: '3', c: '2' })] })
    expect(sectionProgress(PAGES[3], sec, withMatrix)).toBeCloseTo(0.5)
    expect(sectionProgress(PAGES[3], sec, { ...withMatrix, prose: { '3.compare': THIRTY_WORDS } })).toBe(1)
    expect(sectionProgress(PAGES[3], sec, content({}))).toBe(0)
  })
})

/* ------------------------------------------------------------- empty workspace */
test('empty: Page 2 diagram is an explained preview, not fake editable rows', async ({ page }) => {
  await goEmpty(page, 'problem-and-need')
  const card = page.locator('.diag-card').first()
  await expect(card).toContainText('Preview · fills from 2.2')
  await expect(card).not.toContainText('Parameter 1')
  await expect(card).toContainText('This is a preview, not a form')
  await shot(page, 'p02-empty')
  await card.getByRole('button', { name: /Add design inputs/ }).click()
  await expect(page.locator('.ed-head h2')).toHaveText('Quantified design inputs')
})

test('empty: Page 4, 5, 9 explain the missing dependency and link to its source page', async ({ page }) => {
  await goEmpty(page, 'functional-requirements')
  await expect(page.locator('.diag-card').first()).toContainText('Preview · fills from the FR table')
  await shot(page, 'p04-empty')
  await page.getByRole('link', { name: /Draft candidates on Page 02/ }).click()
  await expect(page).toHaveURL(/problem-and-need$/)

  await page.goto('/student/portfolio/architecture-and-subsystems')
  await shot(page, 'p05-empty')
  await page.getByRole('link', { name: /Define requirements on Page 04 first/ }).click()
  await expect(page).toHaveURL(/functional-requirements$/)

  await page.goto('/student/portfolio/predicted-vs-measured')
  await expect(page.locator('.diag-card').first()).toContainText('Preview · calculated from 9.2')
  await shot(page, 'p09-empty')
  await page.getByRole('link', { name: /Go to Page 04 · Functional Requirements/ }).click()
  await expect(page).toHaveURL(/functional-requirements$/)

  await page.goto('/student/portfolio/predicted-vs-measured')
  await page.getByRole('button', { name: /Add a row anyway/ }).click()   // secondary action still works
  await expect(page.locator('.ed-head h2')).toHaveText('Validation sheet')
})

test('empty: header bar explains why Mark as Complete is unavailable; Draft pill is not a fake dropdown; Page 3 tab renamed; reflections wording', async ({ page }) => {
  await goEmpty(page, 'problem-and-need')
  await expect(page.locator('.state-pill svg')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Mark as Complete' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Why can’t I mark this page complete?' })).toBeVisible()
  await page.getByRole('button', { name: 'Why can’t I mark this page complete?' }).click()
  await expect(tip(page)).toContainText('Still to do')
  await expect(tip(page)).toContainText('Need statement (0/40 words)')

  await page.goto('/student/portfolio/concept-choices')
  await expect(page.getByRole('tab', { name: 'Scope: In and Out' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Justification' })).toHaveCount(0)

  await page.goto('/student/portfolio/reflections-and-forward-links')
  const body = await page.locator('.pg-main').innerText()
  expect(body).not.toMatch(/private-by-default/i)
  expect(body).toContain('your team and your assigned faculty can read them')
})

/* ------------------------------------------------------------- populated (seeded demo project) */
test('populated: sources are labelled, Traced-to chips link to the right page, FR chips are checked', async ({ page }) => {
  await goDemo(page, 'problem-and-need')
  const card = page.locator('.diag-card').first()
  await expect(card).toContainText('Auto-built from 2.2')
  await expect(card.locator('.src')).not.toHaveClass(/is-link/)       // derived badge is not clickable
  await expect(page.locator('.ovs-r').getByText('Auto-counted')).toBeVisible()
  await shot(page, 'p02-populated')

  await page.goto('/student/portfolio/functional-requirements')
  await expect(page.locator('.diag-card').first()).toContainText('Auto-built from Pages 02')
  const off = page.locator('.trace a')
  expect(await off.count()).toBeGreaterThan(0)
  const want: Record<string, RegExp> = { Block: /architecture-and-subsystems$/, Calc: /design-and-calculations$/, Valid: /predicted-vs-measured$/ }
  for (const label of Object.keys(want)) {
    const link = page.locator('.trace a', { hasText: label }).first()
    if (!(await link.count())) continue
    await link.click()
    await expect(page).toHaveURL(want[label])
    await page.goBack()
    await expect(page.locator('.pg-main h1')).toBeVisible()
  }
  await shot(page, 'p04-populated')

  // an FR that is missing from the FR table: editor warns, overview chip becomes a link to Page 04
  await page.goto('/student/portfolio/architecture-and-subsystems#blocks')
  const fr = page.locator('.rowcard input[id$="-fr"]').first()
  await fr.fill('FR-99')
  await expect(page.getByRole('link', { name: /Not in the FR table/ }).first()).toBeVisible()
  await page.getByRole('tab', { name: 'Overview' }).click()
  const chip = page.getByRole('link', { name: /FR-99 · not in FR table/ }).first()
  await expect(chip).toBeVisible()
  await shot(page, 'p05-unknown-fr')
  await chip.click()
  await expect(page).toHaveURL(/functional-requirements$/)
})

test('populated: Page 9 labels, Deviation is "Entered by you", ghost row starts a pre-filled row', async ({ page }) => {
  await goDemo(page, 'predicted-vs-measured')
  await expect(page.locator('.diag-card').first()).toContainText('Auto-calculated from 9.2')
  await expect(page.getByText('Auto-plotted from 9.2')).toBeVisible()
  await shot(page, 'p09-populated')

  // editor: Deviation carries the visible note
  await page.getByRole('tab', { name: 'Validation Sheet' }).or(page.getByRole('tab', { name: /Validation/ })).first().click()
  await expect(page.locator('.fnote', { hasText: 'Entered by you' }).first()).toBeVisible()

  // ghost row: remove one validation row so an FR is awaiting, then use its button
  await page.getByRole('button', { name: /Delete validation row 1/ }).click()
  await page.getByRole('tab', { name: 'Overview' }).click()
  const ghost = page.locator('tr.ghost .linkish').first()
  await expect(ghost).toBeVisible()
  const ghostFr = (await page.locator('tr.ghost .tag').first().innerText()).trim()
  await ghost.click()
  await expect(page.locator('.ed-head h2')).toHaveText('Validation sheet')
  await expect(page.locator('.rowcard input[id$="-fr"]').last()).toHaveValue(ghostFr)
})

/* ------------------------------------------------------------- tooltips: hover, keyboard, touch */
test('tooltip works with mouse hover', async ({ page }) => {
  await goDemo(page, 'functional-requirements')
  const info = page.getByRole('button', { name: 'About Traced to' })
  await info.hover()
  await expect(tip(page)).toContainText('Worked out automatically')
  await page.mouse.move(5, 5)
  await expect(tip(page)).toHaveCount(0)
})

test('tooltip works with the keyboard (Tab to open, Esc to dismiss)', async ({ page }) => {
  await goDemo(page, 'functional-requirements')
  await page.locator('.ph-ptabs .ptab').first().focus()
  let found = false
  for (let i = 0; i < 80 && !found; i++) {
    await page.keyboard.press('Tab')
    found = await page.evaluate(() => document.activeElement?.classList.contains('info-btn') ?? false)
  }
  expect(found, 'an ⓘ button should be reachable with Tab').toBe(true)
  await expect(tip(page)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(tip(page)).toHaveCount(0)
  // the explanation is also exposed to screen readers without opening anything
  const described = await page.evaluate(() => { const b = document.activeElement as HTMLElement; const d = document.getElementById(b.getAttribute('aria-describedby')!); return d?.textContent?.length ?? 0 })
  expect(described).toBeGreaterThan(10)
})

test.describe('touch', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 800 } })
  test('tap opens the tooltip inside the viewport, tapping elsewhere closes it', async ({ page }) => {
    await goDemo(page, 'functional-requirements')
    const info = page.getByRole('button', { name: 'About Traced to' })
    await info.scrollIntoViewIfNeeded()
    await info.tap()
    await expect(tip(page)).toBeVisible()
    const box = (await tip(page).boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(390)
    await page.locator('.ph-no').tap()
    await expect(tip(page)).toHaveCount(0)
    await shot(page, 'p04-mobile-tooltip')
  })
})
