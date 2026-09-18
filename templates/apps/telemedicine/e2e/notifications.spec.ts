import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getNotifications, signup } from './_helpers.js'

test.describe('/notifications — Clinical activity feed', () => {
  test('Unauthenticated visit redirects to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/notifications')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('Renders Notifications heading + clinical-activity eyebrow', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByRole('heading', { level: 1, name: /^Notifications$/i })).toBeVisible({
      timeout: 15000,
    })
    await expect(page.getByText(/clinical activity/i)).toBeVisible()
  })

  test('Calls GET /api/notifications on initial load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/notifications')
      await expect(page.getByRole('heading', { name: /^Notifications$/i })).toBeVisible({
        timeout: 15000,
      })
    })
    const hit = reqs.find((r) => r.method === 'GET' && /\/api\/notifications(\?|$)/.test(r.url))
    expect(hit, 'must call GET /api/notifications on load').toBeTruthy()
    expect(hit!.status).toBeLessThan(400)
  })

  test('Notifications appear in the list with their deep links', async ({ page }) => {
    const { accessToken } = await signup(page)
    // Read the feed from the same endpoint the page reads — the starter
    // notifications are content, and an app's own notifications replace them.
    const notifications = await getNotifications(page, accessToken)
    expect(notifications.length, 'a fresh user must get notifications').toBeGreaterThan(0)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByRole('heading', { level: 1, name: /^Notifications$/i })).toBeVisible({
      timeout: 15000,
    })
    for (const notification of notifications) {
      await expect(
        page.getByRole('heading', { level: 2, name: notification.title }).first(),
      ).toBeVisible({ timeout: 10000 })
    }
    const linked = notifications.filter((n) => Boolean(n.href))
    expect(linked.length, 'at least one notification must deep-link').toBeGreaterThan(0)
    for (const notification of linked) {
      const link = page.getByRole('link').filter({ hasText: notification.title }).first()
      await expect(link).toBeVisible()
      expect(await link.getAttribute('href')).toBe(notification.href)
    }
  })

  test('Subheading explains the feed contents', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByText(/Patient updates|lab results|care alerts/i)).toBeVisible({
      timeout: 15000,
    })
  })
})
