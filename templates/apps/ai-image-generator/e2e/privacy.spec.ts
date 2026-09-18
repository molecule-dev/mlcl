import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/privacy', () => {
  test('renders Privacy heading and the page loads (no errors)', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/privacy')
      await expect(page.getByRole('heading', { name: /Privacy/i, level: 1 })).toBeVisible()
    })
    expect(reqs.length).toBeGreaterThan(0)
  })

  test('shows real privacy content (not a placeholder)', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    const body = await page.locator('main').innerText()
    expect(body).not.toMatch(/Replace this placeholder/i)
    expect(body).toMatch(/personal data|information we collect|cookies|how we use/i)
  })

  test('mentions a contact channel for privacy enquiries', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    const body = await page.locator('main').innerText()
    expect(body).toMatch(/contact|reach us at|email us|@/i)
  })
})
