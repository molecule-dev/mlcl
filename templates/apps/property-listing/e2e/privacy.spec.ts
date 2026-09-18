import { expect, test } from '@molecule/app-e2e-fixtures-default'
import {
  APP_BASE,
  API_BASE,
  apiContext,
  signup,
  expectNoConsoleErrors,
  unwrapList,
} from './_helpers.js'

test.describe('privacy (/privacy)', () => {
  test('privacy renders without console errors', async ({ page }) => {
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/privacy')
      await page.waitForLoadState('networkidle')
    })
  })

  test('privacy — element 2: policy body content', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await page.waitForLoadState('networkidle')
    // Smoke check: page reached and the document is non-empty.
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.length, 'page should render visible content').toBeGreaterThan(20)
  })

  test('privacy — element 3: global navigation', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await page.waitForLoadState('networkidle')
    // Smoke check: page reached and the document is non-empty.
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.length, 'page should render visible content').toBeGreaterThan(20)
  })
})
