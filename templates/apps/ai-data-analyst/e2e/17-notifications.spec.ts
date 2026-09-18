import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup } from './_helpers'

// /notifications — list view of seeded notifications from
// GET /api/notifications. Each item has a title/body/href.

test.describe('/notifications', () => {
  test('renders one row per notification the API returns', async ({ page }) => {
    await signup(page)
    // The expected row count is read from the very response the page
    // rendered, not from how many rows the demo seed happens to write.
    let notifications: unknown[] = []
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/notifications')
      const resp = await page.waitForResponse(
        (r) => /\/api\/notifications($|\?)/.test(r.url()) && r.request().method() === 'GET',
        { timeout: 15_000 },
      )
      notifications = (await resp.json()) as unknown[]
    })
    const get = reqs.find((r) => r.method === 'GET' && /\/api\/notifications($|\?)/.test(r.url))
    expect(get).toBeDefined()
    expect(get!.status).toBe(200)
    expect(notifications.length, 'the account has notifications to list').toBeGreaterThan(0)
    // Wait for the list to render before counting
    await page.locator('main li').first().waitFor({ timeout: 10_000 })
    await expect(page.locator('main li')).toHaveCount(notifications.length, { timeout: 5_000 })
  })

  test('renders the notifications page heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await page.waitForResponse((r) => /\/api\/notifications/.test(r.url()))
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('notification rows expose deep-link hrefs', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await page.waitForResponse((r) => /\/api\/notifications/.test(r.url()))
    const links = page.locator('main a[href]')
    await expect(links.first()).toBeAttached()
    const href = await links.first().getAttribute('href')
    expect(href, 'first notification link has an href').toBeTruthy()
  })
})
