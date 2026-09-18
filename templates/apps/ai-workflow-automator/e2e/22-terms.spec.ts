import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('/terms', () => {
  test('renders the terms page', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('body mentions terms / agreement / use', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    const body = (await page.locator('body').innerText()).toLowerCase()
    expect(body).toMatch(/terms|agreement|use/)
  })

  test('has a link back', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.getByRole('link').first()).toBeVisible()
  })
})
