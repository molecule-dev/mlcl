import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  captureNetwork,
  expectNoConsoleErrors,
  getNotifications,
  signup,
} from './_helpers.js'

test.describe('notifications page', () => {
  test('renders heading and notifications list', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByRole('heading', { name: /^notifications$/i, level: 1 })).toBeVisible()
  })

  test('initial load fetches /api/notifications', async ({ page }) => {
    await signup(page)
    const requests = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/notifications')
      await page.waitForLoadState('networkidle')
    })
    expect(
      requests.some((r) => /\/api\/notifications(\?|$)/.test(r.url) && r.status === 200),
    ).toBeTruthy()
  })

  test('a new listener lands with at least one notification, rendered from the feed', async ({
    page,
  }) => {
    await signup(page)
    // Read the feed from the endpoint the page reads, so the spec asserts the
    // rendered title matches the API whatever the onboarding content becomes.
    const notifications = await getNotifications(page)
    expect(notifications.length, 'new listener has a notification').toBeGreaterThan(0)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByRole('listitem').first()).toBeVisible({ timeout: 8000 })
    await expect(
      page.getByRole('heading', { name: notifications[0]!.title, level: 2 }).first(),
    ).toBeVisible()
  })

  test('a notification carrying an episode link routes to /episodes/:id', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    const link = page.locator('a[href^="/episodes/"]').first()
    if (await link.count()) {
      await link.click()
      await expect(page).toHaveURL(/\/episodes\/[0-9a-f-]{36}$/)
    }
  })

  test('mark-all-as-read button posts to /api/notifications/read-all when present', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    const btn = page.getByRole('button', { name: /mark.*read/i }).first()
    if (await btn.count()) {
      const requests = await captureNetwork(page, async () => {
        await btn.click()
        await page.waitForTimeout(1500)
      })
      expect(
        requests.some((r) => r.method === 'POST' && /\/api\/notifications\/read-all/.test(r.url)),
      ).toBeTruthy()
    }
  })

  test('notifications page renders without console errors', async ({ page }) => {
    await signup(page)
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/notifications')
      await expect(page.getByRole('heading', { name: /^notifications$/i, level: 1 })).toBeVisible()
    })
  })
})
