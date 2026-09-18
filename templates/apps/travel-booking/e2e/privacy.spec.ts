/**
 * Privacy: public legal page renders.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test('privacy page heading is visible', async ({ page }) => {
  await page.goto(APP_BASE + '/privacy')
  await expect(page.getByRole('heading', { name: /Privacy/i }).first()).toBeVisible()
})

test('privacy page body element renders', async ({ page }) => {
  await page.goto(APP_BASE + '/privacy')
  await expect(page.locator('body')).toBeVisible()
})

test('privacy intro mentions one of the expected keywords', async ({ page }) => {
  await page.goto(APP_BASE + '/privacy')
  await expect(page.getByText(/Sojourn|policy|protect|data|privacy/i).first()).toBeVisible()
})

test('at least one heading is rendered', async ({ page }) => {
  await page.goto(APP_BASE + '/privacy')
  expect(await page.getByRole('heading').count()).toBeGreaterThanOrEqual(1)
})

test('html root document is visible', async ({ page }) => {
  await page.goto(APP_BASE + '/privacy')
  await expect(page.locator('html')).toBeVisible()
})
