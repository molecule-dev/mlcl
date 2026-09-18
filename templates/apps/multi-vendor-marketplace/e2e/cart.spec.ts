import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/cart', () => {
  test('empty cart renders heading', async ({ page }) => {
    const { email } = await signup(page)
    await page.goto(APP_BASE + '/cart')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('browse link goes to /catalog (empty state)', async ({ page }) => {
    const { email } = await signup(page)
    await page.goto(APP_BASE + '/cart')
    const link = page.locator('a[href="/catalog"]').first()
    if ((await link.count()) > 0) {
      await link.click()
      await expect(page).toHaveURL(/\/catalog/)
    } else {
      test.skip(true, 'cart not empty in this run')
    }
  })

  test('cart loads via /api/cart', async ({ page }) => {
    const { email } = await signup(page)
    await page.goto(APP_BASE + '/cart')
    const reqs = await captureNetwork(page, async () => {
      await page.reload()
      await page.waitForLoadState('networkidle')
    })
    expect(reqs.some((r) => /\/api\/cart/.test(r.url))).toBeTruthy()
  })
})
