import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/catalog', () => {
  test('catalog renders headline', async ({ page }) => {
    await page.goto(APP_BASE + '/catalog')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('product link goes to /products/:id', async ({ page }) => {
    await page.goto(APP_BASE + '/catalog')
    const reqs = await captureNetwork(page, async () => {
      const link = page.locator('a[href^="/products/"]').first()
      await link.waitFor({ timeout: 10000 })
      await link.click()
      await page.waitForURL(/\/products\//, { timeout: 10000 })
    })
    expect(page.url()).toMatch(/\/products\//)
  })

  test('vendor link goes to /vendors/:slug', async ({ page }) => {
    await page.goto(APP_BASE + '/catalog')
    await page.goto(APP_BASE + '/catalog')
    const link = page.locator('a[href^="/vendors/"]').first()
    await link.waitFor({ timeout: 10000 })
    await link.click()
    await page.waitForURL(/\/vendors\//, { timeout: 10000 })
    expect(page.url()).toMatch(/\/vendors\//)
  })
})
