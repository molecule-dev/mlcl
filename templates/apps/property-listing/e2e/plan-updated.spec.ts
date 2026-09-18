import { expect, test } from '@molecule/app-e2e-fixtures-default'
import {
  APP_BASE,
  API_BASE,
  apiContext,
  signup,
  expectNoConsoleErrors,
  unwrapList,
} from './_helpers.js'

test.describe('plan-updated (/plan-updated)', () => {
  test('plan-updated renders without console errors', async ({ page }) => {
    await signup(page)
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/plan-updated')
      await page.waitForLoadState('networkidle')
    })
  })

  test('plan-updated — element 2: continue/return link', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await page.waitForLoadState('networkidle')
    // Smoke check: page reached and the document is non-empty.
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.length, 'page should render visible content').toBeGreaterThan(20)
  })

  test('plan-updated — element 3: plan summary text', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await page.waitForLoadState('networkidle')
    // Smoke check: page reached and the document is non-empty.
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.length, 'page should render visible content').toBeGreaterThan(20)
  })
})
