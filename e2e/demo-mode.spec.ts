import { expect, test } from '@playwright/test'
import { mkdirSync } from 'node:fs'

// Demo mode (no Supabase): seeded project renders data-driven visuals, is clearly labelled, and stays separate.
test('demo project: banner, seeded data drives the visuals', async ({ page }) => {
  mkdirSync('e2e/shots/demo', { recursive: true })
  await page.goto('/signin')
  await page.getByRole('button', { name: /Explore the demo project/ }).click()
  await page.waitForURL('**/student')
  await expect(page.getByText('Demo project').first()).toBeVisible()
  for (const [slug, shot] of [['problem-and-need', 'p02'], ['functional-requirements', 'p04'], ['predicted-vs-measured', 'p09'], ['failures-and-fixes', 'p10'], ['final-demonstration', 'p14']]) {
    await page.goto(`/student/portfolio/${slug}`)
    await page.waitForTimeout(600)
    await page.screenshot({ path: `e2e/shots/demo/${shot}.png`, fullPage: true })
  }
  // chart on p9 is derived from seeded rows, not static art
  await page.goto('/student/portfolio/predicted-vs-measured')
  await expect(page.locator('.diag-card').first()).toContainText('FR-01')
  // demo content is not persisted to Supabase-mode storage keys
  const keys = await page.evaluate(() => Object.keys(localStorage))
  expect(keys.some((k) => k.startsWith('sb-'))).toBe(false)
})
