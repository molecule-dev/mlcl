import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('/privacy', () => {
  test('renders the privacy page', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('body mentions privacy', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    const body = (await page.locator('body').innerText()).toLowerCase()
    expect(body).toContain('privacy')
  })

  test('has a link back', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page.getByRole('link').first()).toBeVisible()
  })
})
