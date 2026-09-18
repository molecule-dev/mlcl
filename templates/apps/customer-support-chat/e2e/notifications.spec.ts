import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiPost, signup } from './_helpers.js'

test.describe('/notifications', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
  })

  test('renders empty state for fresh user', async ({ page }) => {
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByRole('heading', { name: /notifications/i }).first()).toBeVisible()
    await expect(page.getByText(/no activity yet/i).first()).toBeVisible({ timeout: 15_000 })
  })

  test('shows a row for each conversation, sorted newest first', async ({ page }) => {
    await apiPost(page, '/conversations', {
      subject: 'Older one',
      visitor_email: 'a@example.com',
    })
    await new Promise((r) => setTimeout(r, 1100))
    await apiPost(page, '/conversations', {
      subject: 'Newer one',
      visitor_email: 'b@example.com',
    })
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByText(/Newer one/i).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/Older one/i).first()).toBeVisible()
    // The newer one's link must come before the older one's link in the DOM order.
    const items = await page
      .locator('a')
      .filter({ hasText: /Newer one|Older one/ })
      .allTextContents()
    expect(items[0]).toContain('Newer one')
  })

  test('high/urgent conversations are flagged with an Urgent label', async ({ page }) => {
    await apiPost(page, '/conversations', {
      subject: 'Urgent escalation',
      visitor_email: 'urgent@example.com',
      priority: 'urgent',
    })
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByText(/Urgent: Urgent escalation/i).first()).toBeVisible({
      timeout: 15_000,
    })
  })

  test('clicking a notification deep-links to /conversation/:id', async ({ page }) => {
    const conv = await apiPost<{ id: string }>(page, '/conversations', {
      subject: 'Click target',
      visitor_email: 'c@example.com',
    })
    await page.goto(APP_BASE + '/notifications')
    await page
      .getByRole('link', { name: /Click target/ })
      .first()
      .click()
    await page.waitForURL(new RegExp(`/conversation/${conv.id}`), { timeout: 15_000 })
  })
})
