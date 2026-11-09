import { expect, test } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { PAGES } from '../src/data/pages'

/**
 * Needs no Supabase: boots a demo-mode session whose content is EMPTY, then visits all 16 pages and
 * checks that no fabricated engineering data is displayed and that empty states render.
 */
const FORBIDDEN = ['880 kHz', '960 kHz', 'TLV9062', 'DG411', '3:42', '1.6%', 'Pass (≥100 kHz)', 'Sneha Desai', 'Rohan Patil', 'Meera Hegde', 'Lab Sensor']

const emptyDemo = {
  state: {
    session: { email: 'blank.tester@kletech.ac.in', name: 'Blank Tester', mode: 'demo' },
    prose: {}, proseDoc: {}, rows: {}, evidence: [], stepStates: {}, mentor: [], activity: [], completed: {},
    submission: { status: 'draft' }, submitChecks: {}, dismissedInsights: [], lastPage: null, savedAt: null,
  },
  version: 1,
}

test('blank workspace: all 16 pages show empty states and no fabricated data', async ({ page }) => {
  mkdirSync('e2e/shots/empty', { recursive: true })
  await page.addInitScript((v) => localStorage.setItem('fip-demo-v1', JSON.stringify(v)), emptyDemo)
  for (const p of PAGES) {
    await page.goto(`/student/portfolio/${p.slug}`)
    await expect(page.locator('.pg-main h1')).toBeVisible()
    await page.waitForTimeout(500)
    const text = await page.locator('.pg-main').innerText()
    for (const bad of FORBIDDEN) expect(text, `page ${p.id} must not show "${bad}"`).not.toContain(bad)
    await page.screenshot({ path: `e2e/shots/empty/p${String(p.id).padStart(2, '0')}.png`, fullPage: true })
  }
})

test('blank poster is a labelled draft with placeholders', async ({ page }) => {
  await page.addInitScript((v) => localStorage.setItem('fip-demo-v1', JSON.stringify(v)), emptyDemo)
  await page.goto('/student/portfolio/final-demonstration')
  await expect(page.getByText('Draft preview', { exact: false }).first()).toBeVisible()
  await expect(page.getByText('Missing —', { exact: false }).first()).toBeVisible()
})

test('dashboard of a blank workspace starts at 0%', async ({ page }) => {
  await page.addInitScript((v) => localStorage.setItem('fip-demo-v1', JSON.stringify(v)), emptyDemo)
  await page.goto('/student')
  await expect(page.locator('body')).toContainText('0%')
})
