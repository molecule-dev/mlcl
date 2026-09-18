import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('/help', () => {
  test('renders the help page', async ({ page }) => {
    await page.goto(APP_BASE + '/help')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('body mentions help/support keywords', async ({ page }) => {
    await page.goto(APP_BASE + '/help')
    const body = (await page.locator('body').innerText()).toLowerCase()
    expect(body).toMatch(/help|support|guide|docs|faq/)
  })

  test('has a link back', async ({ page }) => {
    await page.goto(APP_BASE + '/help')
    await expect(page.getByRole('link').first()).toBeVisible()
  })
})
