import { expect, test, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { mkdirSync, writeFileSync } from 'node:fs'
import { loadEnv } from '../scripts/env.mjs'
import { PAGES, type FieldDef } from '../src/data/pages'

/**
 * Full student workflow against the real Supabase project:
 * login → blank portfolio → enter data on all 16 pages → upload evidence → save → hard refresh → everything intact.
 * Also checks team isolation and that faculty reviews are read-only.
 */
const env = loadEnv()
const admin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const PW = 'Test-pass-12345!'
const stamp = Date.now()
const A = `e2e.a.${stamp}@kletech.ac.in`
const B = `e2e.b.${stamp}@kletech.ac.in`
const userIds: string[] = []
let teamA = ''

test.beforeAll(async () => {
  for (const email of [A, B]) {
    const { data, error } = await admin.auth.admin.createUser({ email, password: PW, email_confirm: true })
    if (error) throw error
    userIds.push(data.user.id)
  }
  mkdirSync('e2e/shots/filled', { recursive: true })
  writeFileSync('e2e/shots/evidence.png', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'))
})
test.afterAll(async () => {
  for (const id of userIds) await admin.auth.admin.deleteUser(id)
  if (teamA) await admin.from('teams').delete().eq('id', teamA)
})

async function login(page: Page, email: string) {
  await page.goto('/signin')
  await page.getByLabel('KLE Tech email').fill(email)
  await page.getByLabel('Password (test accounts)').fill(PW)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

const sample = (f: FieldDef, n: number, label: string): string => {
  if (f.kind === 'date') return '2026-08-12'
  if (f.kind === 'select') return f.options![0]
  if (f.id === 'fr' || f.id === 'no') return `FR-0${n}`
  if (f.id === 'value' || f.id === 'predicted' || f.id === 'measured') return `${10 * n} kHz`
  if (f.id === 'url') return 'https://example.org/report'
  if (f.id === 'qty') return '2'
  return `${label} ${f.label} E2E-${n}`
}

/** Fill every section of a page the way a student would, using the real editor controls. */
async function fillPage(page: Page, p: (typeof PAGES)[number]) {
  await page.goto(`/student/portfolio/${p.slug}`)
  for (const sec of p.sections) {
    await page.getByRole('tab', { name: new RegExp(`^${sec.title.replace(/\s*\(.*?\)\s*/g, '').trim().split(' ')[0]}`, 'i') }).first().click().catch(() => {})
    // jump through the Overview "Edit" affordance → reliable: use the URL hash
    await page.goto(`/student/portfolio/${p.slug}#${sec.id}`)
    await expect(page.locator('.ed-head h2')).toHaveText(sec.title)
    if (sec.type === 'prose') {
      const ed = page.locator('.ed .rt').first()
      await ed.click()
      await page.keyboard.type(`E2E prose for ${sec.id}. We measured 12 V across the part and recorded the figure carefully. `.repeat(Math.ceil((sec.minWords ?? 20) / 14)))
    }
    if (sec.type === 'rows') {
      const need = Math.max(sec.minRows ?? 1, 1)
      for (let i = 1; i <= need; i++) {
        await page.getByRole('button', { name: new RegExp(`^Add ${sec.itemLabel}`, 'i') }).click()
        const card = page.locator('.rowcard').nth(i - 1)
        if (!(await card.locator('.rowcard-body').count())) await card.locator('.rowcard-toggle').click()
        for (const f of sec.fields) {
          if (f.kind === 'select' && f.chip) { await card.getByRole('radio', { name: f.options![0] }).click(); continue }
          const ctl = card.getByLabel(new RegExp(`^${f.label.replace(/[()/]/g, '.')}`))
          const v = sample(f, i, p.slug)
          if (f.kind === 'select') await ctl.selectOption(v)
          else await ctl.fill(v)
        }
      }
    }
    if (sec.type === 'evidence' || sec.wantsEvidence) {
      await page.getByRole('button', { name: /Attach evidence/ }).first().click()
      await page.locator('.dialog input[type=file], dialog input[type=file], input[type=file]').first().setInputFiles('e2e/shots/evidence.png')
      await page.getByLabel(/Caption/).fill(`E2E evidence caption for ${p.slug} ${sec.id}`)
      await page.getByRole('button', { name: 'Attach', exact: true }).click()
      await expect(page.getByText(`E2E evidence caption for ${p.slug} ${sec.id}`).first()).toBeVisible()
    }
  }
  await page.getByRole('button', { name: /Save/ }).first().click()
  await expect(page.locator('.pg-actions .lb').first()).toHaveText(/Saved/)
}

test('blank → fill all 16 pages → upload → save → refresh → intact; isolation; read-only reviews', async ({ page, browser }) => {
  await login(page, A)
  await page.waitForURL('**/onboarding')
  await page.getByLabel('Team name').fill('E2E Team')
  await page.getByRole('button', { name: /Open my blank portfolio/ }).click()
  await page.waitForURL('**/student')

  // blank start: 0% everywhere, no seeded text
  await expect(page.locator('body')).toContainText('0%')
  for (const bad of ['Team Delta', 'TLV9062', '880 kHz', 'Meera Hegde']) await expect(page.locator('body')).not.toContainText(bad)
  teamA = (await admin.from('teams').select('id').eq('name', 'E2E Team').single()).data!.id

  for (const p of PAGES) await fillPage(page, p)

  // progress is now > 0 on the overview
  await page.goto('/student/portfolio')
  const pctBefore = await page.locator('body').innerText()
  expect(pctBefore).not.toMatch(/^\s*0%\s*$/m)
  await page.screenshot({ path: 'e2e/shots/filled/portfolio-overview.png', fullPage: true })

  // HARD REFRESH + new browser context (fresh storage): everything must come back from Supabase
  const ctx2 = await browser.newContext()
  const page2 = await ctx2.newPage()
  await login(page2, A)
  await page2.waitForURL('**/student')
  for (const p of PAGES) {
    await page2.goto(`/student/portfolio/${p.slug}`)
    await expect(page2.locator('.pg-main h1')).toBeVisible()
    for (const sec of p.sections) {
      await page2.goto(`/student/portfolio/${p.slug}#${sec.id}`)
      if (sec.type === 'prose') await expect(page2.locator('.ed .rt')).toContainText(`E2E prose for ${sec.id}`)
      if (sec.type === 'rows') await expect(page2.locator('.rowcard')).toHaveCount(Math.max(sec.minRows ?? 1, 1))
      if (sec.type === 'evidence' || sec.wantsEvidence) {
        const fig = page2.getByText(`E2E evidence caption for ${p.slug} ${sec.id}`).first()
        await expect(fig).toBeVisible()
      }
    }
    await page2.goto(`/student/portfolio/${p.slug}`)
    await page2.screenshot({ path: `e2e/shots/filled/p${String(p.id).padStart(2, '0')}.png`, fullPage: true })
  }
  // uploaded evidence image really loads from private storage via a signed URL
  await page2.goto('/student/evidence')
  const img = page2.locator('.ev-thumb img').first()
  await expect(img).toBeVisible()
  expect(await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true)

  // faculty review: seeded via service role, visible + read-only for the student
  const fac = await admin.auth.admin.createUser({ email: `e2e.f.${stamp}@kletech.ac.in`, password: PW, email_confirm: true })
  userIds.push(fac.data.user!.id)
  await admin.from('faculty_reviews').insert({ team_id: teamA, review_id: 'R1', summary: 'E2E official summary', observations: [{ text: 'E2E official observation' }], faculty_id: fac.data.user!.id, released_at: new Date().toISOString() })
  await page2.goto('/student/portfolio/review-record')
  await expect(page2.getByText('E2E official observation')).toBeVisible()
  await expect(page2.getByText('Read-only').first()).toBeVisible()
  await expect(page2.locator('text=E2E official observation').locator('xpath=ancestor::article//input|ancestor::article//textarea')).toHaveCount(0)

  // team isolation: B sees a blank workspace and none of A's data
  const ctx3 = await browser.newContext()
  const page3 = await ctx3.newPage()
  await login(page3, B)
  await page3.waitForURL('**/onboarding')
  await page3.getByLabel('Team name').fill('E2E Team B')
  await page3.getByRole('button', { name: /Open my blank portfolio/ }).click()
  await page3.waitForURL('**/student')
  await page3.goto('/student/portfolio/problem-and-need#need')
  await expect(page3.locator('.ed .rt')).not.toContainText('E2E prose')
  await page3.goto('/student/evidence')
  await expect(page3.locator('.ev-thumb img')).toHaveCount(0)
  const b = (await admin.from('teams').select('id').eq('name', 'E2E Team B').single()).data!.id
  await admin.from('teams').delete().eq('id', b)
  await ctx2.close(); await ctx3.close()
})
