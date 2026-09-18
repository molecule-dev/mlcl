/**
 * /plan-updated — post-checkout confirmation.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup, uniqueEmail } from './_helpers.js'

test('confirmation heading is visible', async ({ page }) => {
  await signup(page, { email: uniqueEmail('amn-plan') })
  await page.goto(APP_BASE + '/plan-updated')
  await expect(page.getByRole('heading').first()).toBeVisible()
})

test('thank-you / success copy renders', async ({ page }) => {
  await signup(page, { email: uniqueEmail('amn-plan-copy') })
  await page.goto(APP_BASE + '/plan-updated')
  const body = await page.locator('main, body').first().textContent()
  expect(body || '').toMatch(/thank|success|updated|active|welcome|enjoy|access/i)
})

test('CTA back to dashboard or pricing renders', async ({ page }) => {
  await signup(page, { email: uniqueEmail('amn-plan-cta') })
  await page.goto(APP_BASE + '/plan-updated')
  const cta = page.getByRole('link', { name: /dashboard|continue|home|start|back/i }).first()
  await expect(cta).toBeVisible({ timeout: 10_000 })
})

test('clicking the primary CTA navigates back to an authenticated page', async ({ page }) => {
  await signup(page, { email: uniqueEmail('amn-plan-nav') })
  await page.goto(APP_BASE + '/plan-updated')
  const cta = page.getByRole('link', { name: /dashboard|continue|home|start|back/i }).first()
  await cta.click()
  await expect(page).not.toHaveURL(/\/plan-updated/, { timeout: 10_000 })
})
