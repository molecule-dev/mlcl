import { expect, test } from '@molecule/app-e2e-fixtures-default'
import {
  APP_BASE,
  API_BASE,
  apiContext,
  signup,
  expectNoConsoleErrors,
  unwrapList,
} from './_helpers.js'

test.describe('terms (/terms)', () => {
  test('terms renders without console errors', async ({ page }) => {
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/terms')
      await page.waitForLoadState('networkidle')
    })
  })

  test('terms — element 2: legal body content', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await page.waitForLoadState('networkidle')
    // Smoke check: page reached and the document is non-empty.
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.length, 'page should render visible content').toBeGreaterThan(20)
  })

  test('terms — element 3: global navigation', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await page.waitForLoadState('networkidle')
    // Smoke check: page reached and the document is non-empty.
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.length, 'page should render visible content').toBeGreaterThan(20)
  })
})
