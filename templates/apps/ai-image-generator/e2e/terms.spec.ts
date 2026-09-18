import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/terms', () => {
  test('renders Terms heading and the page loads (no errors)', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/terms')
      await expect(page.getByRole('heading', { name: /Terms/i, level: 1 })).toBeVisible()
    })
    expect(reqs.length).toBeGreaterThan(0)
  })

  test('shows real terms content (not a placeholder)', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    const body = await page.locator('main').innerText()
    expect(body).not.toMatch(/Replace this placeholder/i)
    expect(body).toMatch(/acceptable use|limitation of liability|intellectual property|account/i)
  })

  test('shows governing-law / jurisdiction clause', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    const body = await page.locator('main').innerText()
    expect(body).toMatch(/governing law|jurisdiction|disputes/i)
  })
})
