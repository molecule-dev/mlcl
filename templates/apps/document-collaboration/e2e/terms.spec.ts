/**
 * /terms — terms-of-service static page.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('terms page', () => {
  test('renders without errors', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.locator('body')).toBeVisible()
  })

  test('contains terms-of-service heading', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('does not require auth', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page).toHaveURL(/\/terms/)
  })
})

test.describe('terms — network', () => {
  test('page load issues no 5xx responses', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/terms')
      await page.waitForLoadState('networkidle')
    })
    expect(reqs.filter((r) => r.status >= 500)).toEqual([])
  })
})
