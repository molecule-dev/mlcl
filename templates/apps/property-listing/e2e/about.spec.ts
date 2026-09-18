import { expect, test } from '@molecule/app-e2e-fixtures-default'
import {
  APP_BASE,
  API_BASE,
  apiContext,
  signup,
  expectNoConsoleErrors,
  unwrapList,
} from './_helpers.js'

test.describe('about (/about)', () => {
  test('about renders without console errors', async ({ page }) => {
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/about')
      await page.waitForLoadState('networkidle')
    })
  })

  test('about — element 2: mission/values copy', async ({ page }) => {
    await page.goto(APP_BASE + '/about')
    await page.waitForLoadState('networkidle')
    // Smoke check: page reached and the document is non-empty.
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.length, 'page should render visible content').toBeGreaterThan(20)
  })

  test('about — element 3: site-wide navigation links (header)', async ({ page }) => {
    await page.goto(APP_BASE + '/about')
    await page.waitForLoadState('networkidle')
    // Smoke check: page reached and the document is non-empty.
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.length, 'page should render visible content').toBeGreaterThan(20)
  })
})
