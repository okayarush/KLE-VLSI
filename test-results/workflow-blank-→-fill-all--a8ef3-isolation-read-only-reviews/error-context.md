# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workflow.spec.ts >> blank → fill all 16 pages → upload → save → refresh → intact; isolation; read-only reviews
- Location: e2e\workflow.spec.ts:92:1

# Error details

```
Test timeout of 180000ms exceeded.
```

```
Error: locator.click: Test timeout of 180000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /Save/ }).first()

```

# Test source

```ts
  1   | import { expect, test, type Page } from '@playwright/test'
  2   | import { createClient } from '@supabase/supabase-js'
  3   | import { mkdirSync, writeFileSync } from 'node:fs'
  4   | import { loadEnv } from '../scripts/env.mjs'
  5   | import { PAGES, type FieldDef } from '../src/data/pages'
  6   | 
  7   | /**
  8   |  * Full student workflow against the real Supabase project:
  9   |  * login → blank portfolio → enter data on all 16 pages → upload evidence → save → hard refresh → everything intact.
  10  |  * Also checks team isolation and that faculty reviews are read-only.
  11  |  */
  12  | const env = loadEnv()
  13  | const admin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  14  | const PW = 'Test-pass-12345!'
  15  | const stamp = Date.now()
  16  | const A = `e2e.a.${stamp}@kletech.ac.in`
  17  | const B = `e2e.b.${stamp}@kletech.ac.in`
  18  | const userIds: string[] = []
  19  | let teamA = ''
  20  | 
  21  | test.beforeAll(async () => {
  22  |   for (const email of [A, B]) {
  23  |     const { data, error } = await admin.auth.admin.createUser({ email, password: PW, email_confirm: true })
  24  |     if (error) throw error
  25  |     userIds.push(data.user.id)
  26  |   }
  27  |   mkdirSync('e2e/shots/filled', { recursive: true })
  28  |   writeFileSync('e2e/shots/evidence.png', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'))
  29  | })
  30  | test.afterAll(async () => {
  31  |   for (const id of userIds) await admin.auth.admin.deleteUser(id)
  32  |   if (teamA) await admin.from('teams').delete().eq('id', teamA)
  33  | })
  34  | 
  35  | async function login(page: Page, email: string) {
  36  |   await page.goto('/signin')
  37  |   await page.getByLabel('KLE Tech email').fill(email)
  38  |   await page.getByLabel('Password (test accounts)').fill(PW)
  39  |   await page.getByRole('button', { name: 'Sign in' }).click()
  40  | }
  41  | 
  42  | const sample = (f: FieldDef, n: number, label: string): string => {
  43  |   if (f.kind === 'date') return '2026-08-12'
  44  |   if (f.kind === 'select') return f.options![0]
  45  |   if (f.id === 'fr' || f.id === 'no') return `FR-0${n}`
  46  |   if (f.id === 'value' || f.id === 'predicted' || f.id === 'measured') return `${10 * n} kHz`
  47  |   if (f.id === 'url') return 'https://example.org/report'
  48  |   if (f.id === 'qty') return '2'
  49  |   return `${label} ${f.label} E2E-${n}`
  50  | }
  51  | 
  52  | /** Fill every section of a page the way a student would, using the real editor controls. */
  53  | async function fillPage(page: Page, p: (typeof PAGES)[number]) {
  54  |   await page.goto(`/student/portfolio/${p.slug}`)
  55  |   for (const sec of p.sections) {
  56  |     await page.getByRole('tab', { name: new RegExp(`^${sec.title.replace(/\s*\(.*?\)\s*/g, '').trim().split(' ')[0]}`, 'i') }).first().click().catch(() => {})
  57  |     // jump through the Overview "Edit" affordance → reliable: use the URL hash
  58  |     await page.goto(`/student/portfolio/${p.slug}#${sec.id}`)
  59  |     await expect(page.locator('.ed-head h2')).toHaveText(sec.title)
  60  |     if (sec.type === 'prose') {
  61  |       const ed = page.locator('.ed .rt').first()
  62  |       await ed.click()
  63  |       await page.keyboard.type(`E2E prose for ${sec.id}. We measured 12 V across the part and recorded the figure carefully. `.repeat(Math.ceil((sec.minWords ?? 20) / 14)))
  64  |     }
  65  |     if (sec.type === 'rows') {
  66  |       const need = Math.max(sec.minRows ?? 1, 1)
  67  |       for (let i = 1; i <= need; i++) {
  68  |         await page.getByRole('button', { name: new RegExp(`^Add ${sec.itemLabel}`, 'i') }).click()
  69  |         const card = page.locator('.rowcard').nth(i - 1)
  70  |         if (!(await card.locator('.rowcard-body').count())) await card.locator('.rowcard-toggle').click()
  71  |         for (const f of sec.fields) {
  72  |           if (f.kind === 'select' && f.chip) { await card.getByRole('radio', { name: f.options![0] }).click(); continue }
  73  |           const ctl = card.getByLabel(new RegExp(`^${f.label.replace(/[()/]/g, '.')}`))
  74  |           const v = sample(f, i, p.slug)
  75  |           if (f.kind === 'select') await ctl.selectOption(v)
  76  |           else await ctl.fill(v)
  77  |         }
  78  |       }
  79  |     }
  80  |     if (sec.type === 'evidence' || sec.wantsEvidence) {
  81  |       await page.getByRole('button', { name: /Attach evidence/ }).first().click()
  82  |       await page.locator('.dialog input[type=file], dialog input[type=file], input[type=file]').first().setInputFiles('e2e/shots/evidence.png')
  83  |       await page.getByLabel(/Caption/).fill(`E2E evidence caption for ${p.slug} ${sec.id}`)
  84  |       await page.getByRole('button', { name: 'Attach', exact: true }).click()
  85  |       await expect(page.getByText(`E2E evidence caption for ${p.slug} ${sec.id}`).first()).toBeVisible()
  86  |     }
  87  |   }
> 88  |   await page.getByRole('button', { name: /Save/ }).first().click()
      |                                                            ^ Error: locator.click: Test timeout of 180000ms exceeded.
  89  |   await expect(page.locator('.pg-actions .lb').first()).toHaveText(/Saved/)
  90  | }
  91  | 
  92  | test('blank → fill all 16 pages → upload → save → refresh → intact; isolation; read-only reviews', async ({ page, browser }) => {
  93  |   await login(page, A)
  94  |   await page.waitForURL('**/onboarding')
  95  |   await page.getByLabel('Team name').fill('E2E Team')
  96  |   await page.getByRole('button', { name: /Open my blank portfolio/ }).click()
  97  |   await page.waitForURL('**/student')
  98  | 
  99  |   // blank start: 0% everywhere, no seeded text
  100 |   await expect(page.locator('body')).toContainText('0%')
  101 |   for (const bad of ['Team Delta', 'TLV9062', '880 kHz', 'Meera Hegde']) await expect(page.locator('body')).not.toContainText(bad)
  102 |   teamA = (await admin.from('teams').select('id').eq('name', 'E2E Team').single()).data!.id
  103 | 
  104 |   for (const p of PAGES) await fillPage(page, p)
  105 | 
  106 |   // progress is now > 0 on the overview
  107 |   await page.goto('/student/portfolio')
  108 |   const pctBefore = await page.locator('body').innerText()
  109 |   expect(pctBefore).not.toMatch(/^\s*0%\s*$/m)
  110 |   await page.screenshot({ path: 'e2e/shots/filled/portfolio-overview.png', fullPage: true })
  111 | 
  112 |   // HARD REFRESH + new browser context (fresh storage): everything must come back from Supabase
  113 |   const ctx2 = await browser.newContext()
  114 |   const page2 = await ctx2.newPage()
  115 |   await login(page2, A)
  116 |   await page2.waitForURL('**/student')
  117 |   for (const p of PAGES) {
  118 |     await page2.goto(`/student/portfolio/${p.slug}`)
  119 |     await expect(page2.locator('.pg-main h1')).toBeVisible()
  120 |     for (const sec of p.sections) {
  121 |       await page2.goto(`/student/portfolio/${p.slug}#${sec.id}`)
  122 |       if (sec.type === 'prose') await expect(page2.locator('.ed .rt')).toContainText(`E2E prose for ${sec.id}`)
  123 |       if (sec.type === 'rows') await expect(page2.locator('.rowcard')).toHaveCount(Math.max(sec.minRows ?? 1, 1))
  124 |       if (sec.type === 'evidence' || sec.wantsEvidence) {
  125 |         const fig = page2.getByText(`E2E evidence caption for ${p.slug} ${sec.id}`).first()
  126 |         await expect(fig).toBeVisible()
  127 |       }
  128 |     }
  129 |     await page2.goto(`/student/portfolio/${p.slug}`)
  130 |     await page2.screenshot({ path: `e2e/shots/filled/p${String(p.id).padStart(2, '0')}.png`, fullPage: true })
  131 |   }
  132 |   // uploaded evidence image really loads from private storage via a signed URL
  133 |   await page2.goto('/student/evidence')
  134 |   const img = page2.locator('.ev-thumb img').first()
  135 |   await expect(img).toBeVisible()
  136 |   expect(await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true)
  137 | 
  138 |   // faculty review: seeded via service role, visible + read-only for the student
  139 |   const fac = await admin.auth.admin.createUser({ email: `e2e.f.${stamp}@kletech.ac.in`, password: PW, email_confirm: true })
  140 |   userIds.push(fac.data.user!.id)
  141 |   await admin.from('faculty_reviews').insert({ team_id: teamA, review_id: 'R1', summary: 'E2E official summary', observations: [{ text: 'E2E official observation' }], faculty_id: fac.data.user!.id, released_at: new Date().toISOString() })
  142 |   await page2.goto('/student/portfolio/review-record')
  143 |   await expect(page2.getByText('E2E official observation')).toBeVisible()
  144 |   await expect(page2.getByText('Read-only').first()).toBeVisible()
  145 |   await expect(page2.locator('text=E2E official observation').locator('xpath=ancestor::article//input|ancestor::article//textarea')).toHaveCount(0)
  146 | 
  147 |   // team isolation: B sees a blank workspace and none of A's data
  148 |   const ctx3 = await browser.newContext()
  149 |   const page3 = await ctx3.newPage()
  150 |   await login(page3, B)
  151 |   await page3.waitForURL('**/onboarding')
  152 |   await page3.getByLabel('Team name').fill('E2E Team B')
  153 |   await page3.getByRole('button', { name: /Open my blank portfolio/ }).click()
  154 |   await page3.waitForURL('**/student')
  155 |   await page3.goto('/student/portfolio/problem-and-need#need')
  156 |   await expect(page3.locator('.ed .rt')).not.toContainText('E2E prose')
  157 |   await page3.goto('/student/evidence')
  158 |   await expect(page3.locator('.ev-thumb img')).toHaveCount(0)
  159 |   const b = (await admin.from('teams').select('id').eq('name', 'E2E Team B').single()).data!.id
  160 |   await admin.from('teams').delete().eq('id', b)
  161 |   await ctx2.close(); await ctx3.close()
  162 | })
  163 | 
```