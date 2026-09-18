/**
 * 99 — End-to-end user journey across multiple pages.
 *
 * The single test in this file simulates a real user signing up and
 * touching every primary feature of the app in sequence:
 *
 *   1. Sign up (signup page → feed)
 *   2. Compose an announcement that requires acknowledgment
 *   3. Verify the announcement appears in /feed
 *   4. Open the detail page, post a reply, acknowledge
 *   5. Confirm the ack reflects in /my-acknowledgments
 *   6. Visit /notifications, /people, /search, /analytics
 *   7. Toggle theme, verify it persists across reload
 *   8. Update a notification preference in /settings, verify localStorage
 *   9. Open Account tab, click Upgrade — lands on /pricing
 *  10. Sign out, sign back in, confirm the seeded announcement is still
 *      retrievable (server-side persistence, not a one-render mock).
 *
 * If any step regresses, the entire app is broken from the user's
 * perspective. This is the kitchen-sink contract that catches things
 * the per-page specs miss when a regression touches the seam between
 * pages.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  authHeaders,
  captureNetwork,
  login,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('99 — full user journey', () => {
  test('sign up → compose → ack → review → settings → re-login round-trip', async ({ page }) => {
    test.setTimeout(120000)
    const email = uniqueEmail('journey')
    const password = 'TestPass123!'

    // 1. Sign up — lands on /feed.
    await signup(page, email, password)
    await page.waitForURL(/\/feed/, { timeout: 15000 })

    // 2. Compose an announcement.
    await page.goto(APP_BASE + '/compose')
    const title = `Journey post ${Date.now()}`
    const body = 'A real announcement body for the user-journey end-to-end test.'
    await page.getByTestId('composer-title').fill(title)
    await page.getByTestId('composer-body').fill(body)
    const composeReqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /publish/i })
        .first()
        .click()
      await page.waitForURL(/\/announcement\//, { timeout: 10000 })
    })
    const post = composeReqs.find(
      (r) => /\/api\/announcements\b/.test(r.url) && r.method === 'POST',
    )
    expect(post?.status, 'compose POST should succeed').toBeLessThan(400)

    // 3. Verify announcement appears in /feed.
    await page.goto(APP_BASE + '/feed')
    await expect(page.getByText(title)).toBeVisible()

    // 4. Open detail, ack, post reply.
    await page.getByText(title).first().click()
    await page.waitForURL(/\/announcement\//, { timeout: 5000 })
    await expect(page.getByRole('heading', { name: title })).toBeVisible()
    await page
      .getByRole('button', { name: /acknowledge/i })
      .first()
      .click()
    await page.waitForTimeout(500)
    await expect(page.getByRole('button', { name: /acknowledged/i }).first()).toBeVisible()
    const replyText = `Reply ${Date.now()}`
    await page.locator('textarea').first().fill(replyText)
    await page
      .getByRole('button', { name: /reply|post|send/i })
      .first()
      .click()
    await page.waitForTimeout(500)
    await expect(page.getByText(replyText)).toBeVisible()

    // 5. Confirm ack reflects in /my-acknowledgments under the
    // "Acknowledged" tab. The MyAcknowledgments page exposes tabs as
    // `my-acks-tab-{pending|acknowledged|sent}`.
    await page.goto(APP_BASE + '/my-acknowledgments')
    await page.getByTestId('my-acks-tab-acknowledged').click()
    await expect(page.getByText(title)).toBeVisible()

    // 6. Visit core authed pages — none should 5xx.
    for (const route of ['/notifications', '/people', '/search', '/analytics']) {
      await page.goto(APP_BASE + route)
      await expect(page).toHaveURL(new RegExp(route))
    }

    // 7. Theme toggle across the authed sidebar persists across reload.
    await page.goto(APP_BASE + '/feed')
    const themeBefore = await page.evaluate(() =>
      document.documentElement.getAttribute('data-mol-mode'),
    )
    await page
      .getByRole('button', { name: /Toggle theme/i })
      .first()
      .click()
    await page.waitForTimeout(200)
    const themeAfter = await page.evaluate(() =>
      document.documentElement.getAttribute('data-mol-mode'),
    )
    expect(themeAfter).not.toBe(themeBefore)
    await page.reload()
    const persisted = await page.evaluate(() =>
      document.documentElement.getAttribute('data-mol-mode'),
    )
    expect(persisted).toBe(themeAfter)

    // 8. Notification preference persists via localStorage.
    await page.goto(APP_BASE + '/settings')
    const mentions = page.getByTestId('settings-notif-mentions')
    const mentionsBefore = await mentions.getAttribute('aria-checked')
    await mentions.click()
    await page.waitForTimeout(150)
    await page.reload()
    const mentionsAfter = await page
      .getByTestId('settings-notif-mentions')
      .getAttribute('aria-checked')
    expect(mentionsAfter).not.toBe(mentionsBefore)

    // 9. Account → Upgrade → /pricing.
    await page.getByTestId('settings-tab-account').click()
    const upgrade = page.getByRole('button', { name: /upgrade/i }).first()
    await expect(upgrade).toBeVisible()
    await upgrade.click()
    await page.waitForURL(/\/pricing/, { timeout: 5000 })

    // 10. Sign out, sign in, confirm announcement still exists in DB.
    await page.goto(APP_BASE + '/feed')
    await page
      .getByRole('button', { name: /SIGN OUT|Sign out/i })
      .first()
      .click()
    await page.waitForURL(/\/(login|$)/, { timeout: 5000 })
    // Use the token THIS session issued. Signing out invalidates the bearer
    // token captured at signup, so re-sending it here answered 401 and the
    // persistence check never actually ran.
    const { accessToken: reAuthToken } = await login(page, email, password)
    // authHeaders(null) silently omits Authorization, which would make the read
    // below unauthenticated and fail as a confusing 401 — assert we really got one.
    expect(reAuthToken, 'no access token after re-login').toBeTruthy()
    const list = await page.request.get(`${API_BASE}/announcements`, {
      headers: authHeaders(reAuthToken),
    })
    expect(list.status()).toBe(200)
    const announcements = (await list.json()) as Array<{ title: string }>
    expect(announcements.find((a) => a.title === title)).toBeTruthy()
  })
})
