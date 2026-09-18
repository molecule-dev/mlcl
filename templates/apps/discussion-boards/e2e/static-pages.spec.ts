import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, signup } from './_helpers.js'

test.describe('static pages', () => {
  test('Pricing page renders without crashing', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.locator('main, body').first()).toBeVisible()
  })

  test('Settings page is reachable for authed users', async ({ page }) => {
    await signup(page)
    const res = await page.goto(APP_BASE + '/settings')
    expect(res?.status()).toBeLessThan(500)
  })

  test('PlanUpdated page is reachable for authed users', async ({ page }) => {
    await signup(page)
    const res = await page.goto(APP_BASE + '/plan-updated')
    expect(res?.status()).toBeLessThan(500)
  })

  test('NotFound page renders for an unknown route', async ({ page }) => {
    const res = await page.goto(APP_BASE + '/this-route-does-not-exist')
    expect(res?.status()).toBeLessThan(500)
    await expect(page.locator('body')).toContainText(/404|not found|lost|wrong page/i)
  })
})
