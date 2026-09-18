/**
 * Terms: public legal page renders.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test('terms page heading is visible', async ({ page }) => {
  await page.goto(APP_BASE + '/terms')
  await expect(page.getByRole('heading', { name: /Terms/i }).first()).toBeVisible()
})

test('terms page body element renders', async ({ page }) => {
  await page.goto(APP_BASE + '/terms')
  await expect(page.locator('body')).toBeVisible()
})

test('terms intro mentions one of the expected keywords', async ({ page }) => {
  await page.goto(APP_BASE + '/terms')
  await expect(page.getByText(/Sojourn|terms|service|agreement|template/i).first()).toBeVisible()
})

test('at least one heading is rendered', async ({ page }) => {
  await page.goto(APP_BASE + '/terms')
  expect(await page.getByRole('heading').count()).toBeGreaterThanOrEqual(1)
})

test('html root document is visible', async ({ page }) => {
  await page.goto(APP_BASE + '/terms')
  await expect(page.locator('html')).toBeVisible()
})
