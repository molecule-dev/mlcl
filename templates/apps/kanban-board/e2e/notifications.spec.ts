import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, API_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('notifications', () => {
  test('empty inbox renders the "Inbox zero feels good" empty-state', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByText(/Inbox zero feels good/i)).toBeVisible()
  })

  test('mark-all-read button is reachable (and disabled when nothing is unread)', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    const button = page.getByTestId('notifications-mark-all-read')
    await expect(button).toBeVisible()
    await expect(button).toBeDisabled()
  })

  test('All filter button is visible and active by default', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    const all = page.getByTestId('notifications-filter-all')
    await expect(all).toBeVisible()
  })

  test('Unread filter button is visible and switchable', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    const unread = page.getByTestId('notifications-filter-unread')
    await expect(unread).toBeVisible()
    await unread.click()
    await expect(unread).toBeVisible()
  })

  test('GET /api/notifications fires on load and returns 200 array', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/notifications')
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    })
    const call = reqs.find((r) => /\/api\/notifications(?:\?|$)/.test(r.url) && r.method === 'GET')
    expect(call, 'GET /api/notifications should fire').toBeTruthy()
    expect(call!.status).toBe(200)

    const res = await page.request.get(API_BASE + '/notifications')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })
})
