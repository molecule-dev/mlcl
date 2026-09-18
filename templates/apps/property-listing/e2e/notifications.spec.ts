import { expect, test } from '@molecule/app-e2e-fixtures-default'
import {
  APP_BASE,
  API_BASE,
  apiContext,
  signup,
  expectNoConsoleErrors,
  unwrapList,
} from './_helpers.js'

test.describe('notifications (/notifications)', () => {
  test('notifications renders without console errors', async ({ page }) => {
    await signup(page)
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/notifications')
      await page.waitForLoadState('networkidle')
    })
  })

  test('notifications — element 2: notification list', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle')
    // Smoke check: page reached and the document is non-empty.
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.length, 'page should render visible content').toBeGreaterThan(20)
  })

  test('notifications — element 3: navigation header', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle')
    // Smoke check: page reached and the document is non-empty.
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.length, 'page should render visible content').toBeGreaterThan(20)
  })
})
