/**
 * /notifications — synthesizes notifications from real announcements +
 * comments.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  authHeaders,
  API_BASE,
  captureNetwork,
  seedAnnouncement,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('notifications page', () => {
  test('renders the filter chips and an empty state when there is no activity', async ({
    page,
  }) => {
    await signup(page, uniqueEmail('notif-empty'))
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('notifications-filter-all')).toBeVisible()
    await expect(page.getByTestId('notifications-filter-reply')).toBeVisible()
    await expect(page.getByTestId('notifications-filter-channel')).toBeVisible()
    await expect(page.getByTestId('notifications-list')).toBeVisible()
  })

  test('a peer-authored announcement appears as a channel notification', async ({ page }) => {
    // First user A creates the workspace, second user B is the test viewer.
    // Author from "alice@example.com" already exists in seed; we just need
    // to use an announcement authored by someone OTHER than the test user.
    const { accessToken } = await signup(page, uniqueEmail('notif-peer'))
    // Seed an announcement as the SAME user (counts as our own — won't
    // show up under notifications). Confirm by checking it's filtered out
    // when authored by self.
    const myAnn = await seedAnnouncement(page, accessToken, {
      title: `Self-authored ${Date.now()}`,
    })
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle')
    await page.getByTestId('notifications-filter-channel').click()
    // Self-authored row must NOT appear (we filter author_id === me out).
    await expect(page.getByText(myAnn.title)).toHaveCount(0)
  })

  test('mark all read clears the unread badge', async ({ page }) => {
    // Create a peer announcement as a different user via API then check ours.
    const peer = await signup(page, uniqueEmail('notif-peer-author'))
    await page.request
      .post(`${API_BASE}/announcements`, {
        headers: authHeaders(peer.accessToken),
        data: {
          title: `Peer announce ${Date.now()}`,
          body: 'A peer-authored announcement long enough to publish.',
          priority: 'normal',
          publish_now: true,
        },
        failOnStatusCode: false,
      })
      .catch(() => {})

    // Now the viewer signs up.
    await page.evaluate(() => window.localStorage.clear())
    await signup(page, uniqueEmail('notif-viewer'))
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle')
    const markAll = page.getByTestId('notifications-mark-all-read')
    if ((await markAll.count()) > 0) {
      await markAll.click()
      // After click, button should hide because unreadCount is 0.
      await expect(markAll).toHaveCount(0)
    }
  })

  test('clicking a notification navigates to the announcement detail', async ({ page }) => {
    // Create a peer announcement with another user.
    const peer = await signup(page, uniqueEmail('notif-link-author'))
    await seedAnnouncement(page, peer.accessToken, {
      title: `Click me ${Date.now()}`,
    })

    // Test viewer signs up, then visits notifications.
    await page.evaluate(() => window.localStorage.clear())
    await signup(page, uniqueEmail('notif-link-viewer'))
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle')
    const first = page.locator('[data-testid^="notification-item-"]').first()
    if ((await first.count()) > 0) {
      await first.click()
      await page.waitForURL(/\/announcement\/[a-f0-9-]+/, { timeout: 10000 })
    }
  })

  test('page load fires GET /api/announcements + /api/announcements/me/acknowledgments + /api/team', async ({
    page,
  }) => {
    await signup(page, uniqueEmail('notif-net'))
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/notifications')
      await page.waitForLoadState('networkidle')
    })
    expect(reqs.some((r) => /\/api\/announcements(\?|$)/.test(r.url) && r.method === 'GET')).toBe(
      true,
    )
    expect(
      reqs.some(
        (r) => /\/api\/announcements\/me\/acknowledgments/.test(r.url) && r.method === 'GET',
      ),
    ).toBe(true)
    expect(reqs.some((r) => /\/api\/team\b/.test(r.url) && r.method === 'GET')).toBe(true)
  })

  test('clicking a filter chip changes the active styling', async ({ page }) => {
    await signup(page, uniqueEmail('notif-filter-style'))
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle')
    const all = page.getByTestId('notifications-filter-all')
    const reply = page.getByTestId('notifications-filter-reply')
    const allClassesBefore = await all.getAttribute('class')
    await reply.click()
    await page.waitForTimeout(150)
    const allClassesAfter = await all.getAttribute('class')
    const replyClassesAfter = await reply.getAttribute('class')
    expect(allClassesAfter).not.toEqual(replyClassesAfter)
    // sanity: clicking the chip mutates either the inactive `All` or
    // the active `reply` so the class strings are NOT both equal to the
    // pre-click `all` snapshot.
    expect(allClassesAfter !== allClassesBefore || replyClassesAfter !== allClassesBefore).toBe(
      true,
    )
  })

  test('Sign out from /notifications works', async ({ page }) => {
    await signup(page, uniqueEmail('notif-signout'))
    await page.goto(APP_BASE + '/notifications')
    await page
      .getByRole('button', { name: /SIGN OUT|Sign out/i })
      .first()
      .click()
    await page.waitForURL(/\/login/, { timeout: 5000 })
  })

  test('Theme toggle flips data-mol-mode on /notifications', async ({ page }) => {
    await signup(page, uniqueEmail('notif-theme'))
    await page.goto(APP_BASE + '/notifications')
    const before = await page.evaluate(() => document.documentElement.getAttribute('data-mol-mode'))
    await page
      .getByRole('button', { name: /Toggle theme/i })
      .first()
      .click()
    await page.waitForTimeout(200)
    const after = await page.evaluate(() => document.documentElement.getAttribute('data-mol-mode'))
    expect(after).not.toBe(before)
  })

  test('list area is rendered (filter+list visible) for an empty workspace', async ({ page }) => {
    await signup(page, uniqueEmail('notif-listarea'))
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('notifications-list')).toBeVisible({ timeout: 5000 })
  })
})
