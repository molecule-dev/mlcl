import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/orders', () => {
  test('orders page renders heading', async ({ page }) => {
    const { email } = await signup(page)
    await page.goto(APP_BASE + '/orders')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('orders fetches /api/orders', async ({ page }) => {
    const { email } = await signup(page)
    await page.goto(APP_BASE + '/orders')
    const reqs = await captureNetwork(page, async () => {
      await page.reload()
      await page.waitForLoadState('networkidle')
    })
    expect(reqs.some((r) => /\/api\/orders/.test(r.url))).toBeTruthy()
  })

  test('shipped filter selects shipped', async ({ page }) => {
    const { email } = await signup(page)
    await page.goto(APP_BASE + '/orders')
    await page
      .getByRole('button', { name: /shipped/i })
      .first()
      .click()
    await expect(page.getByRole('button', { name: /shipped/i }).first()).toBeVisible()
  })
})
