import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('/privacy (Privacy)', () => {
  test('renders the Privacy heading', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page.getByRole('heading', { name: /Privacy/i, level: 1 })).toBeVisible()
  })

  test('body content is non-trivial (>200 chars of text)', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    const main = page.locator('main')
    await expect(main).toBeVisible()
    const text = (await main.textContent()) ?? ''
    expect(text.length, 'privacy page body must contain real copy').toBeGreaterThan(200)
  })

  test('main landmark is present', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page.locator('main')).toBeVisible()
  })
})
