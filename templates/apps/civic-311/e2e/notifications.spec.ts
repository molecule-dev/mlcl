import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, authHeaders, seedIssue, signup } from './_helpers.js'

test.describe('civic-311: /notifications', () => {
  test('empty state renders for a fresh account', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByTestId('notifications-title')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('notifications-empty')).toBeVisible()
  })

  test('status change on my report lands in the feed and can be marked read', async ({ page }) => {
    const session = await signup(page)
    const issue = await seedIssue(page, session.accessToken, { category: 'pothole', x: 34, y: 27 })

    // City staff (promoted via the dev-only endpoint) advances the status.
    await page.request.post(`${API_BASE}/_test/promote-staff`, {
      headers: authHeaders(session.accessToken),
    })
    const patch = await page.request.patch(`${API_BASE}/issues/${issue.id}`, {
      headers: authHeaders(session.accessToken),
      data: { status: 'acknowledged' },
    })
    expect(patch.status()).toBeLessThan(400)

    await page.goto(APP_BASE + '/notifications')
    const row = page.locator('[data-mol-id="notification-item"][data-kind="status_change"]').first()
    await expect(row).toBeVisible({ timeout: 15_000 })
    await expect(row).toContainText('acknowledged')
    await expect(row).toHaveAttribute('data-read', 'false')

    await row.getByTestId('notification-mark-read').click()
    await expect(
      page.locator('[data-mol-id="notification-item"][data-kind="status_change"]').first(),
    ).toHaveAttribute('data-read', 'true', { timeout: 15_000 })
  })

  test('feed row links through to the issue', async ({ page }) => {
    const session = await signup(page)
    const issue = await seedIssue(page, session.accessToken, { category: 'trash', x: 27, y: 72 })
    // A neighbor confirms it → notification for the reporter.
    await page.evaluate(() => window.localStorage.clear())
    await page.context().clearCookies()
    const neighbor = await signup(page)
    await page.request.post(`${API_BASE}/issues/${issue.id}/confirmations`, {
      headers: authHeaders(neighbor.accessToken),
    })

    await page.evaluate(() => window.localStorage.clear())
    await page.context().clearCookies()
    await page.goto(APP_BASE + '/login')
    await page.locator('#email').fill(session.email)
    await page.locator('#password').fill(session.password)
    await page
      .getByRole('button', { name: /sign\s*in|log\s*in/i })
      .first()
      .click()
    await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 })
    await page.goto(APP_BASE + '/notifications')
    const row = page.locator('[data-mol-id="notification-item"][data-kind="confirmation"]').first()
    await expect(row).toBeVisible({ timeout: 15_000 })
    await row.getByTestId('notification-open').click()
    await expect(page).toHaveURL(new RegExp(`/reports/${issue.id}$`), { timeout: 15_000 })
  })
})
