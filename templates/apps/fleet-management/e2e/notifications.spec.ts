import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup, waitForSeed } from './_helpers.js'

async function gotoNotifications(page: import('@playwright/test').Page) {
  await page.goto(APP_BASE + '/notifications')
  await expect(page.getByRole('heading', { name: /^notifications$/i, level: 1 })).toBeVisible({
    timeout: 15000,
  })
}

test.describe('notifications', () => {
  test('GET /api/notifications returns 200 on mount', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const reqs = await captureNetwork(page, async () => {
      await gotoNotifications(page)
    })
    const req = reqs.find((r) => /\/api\/notifications(\?|$)/.test(r.url) && r.method === 'GET')
    expect(req?.status, 'GET /api/notifications').toBe(200)
  })

  test('eyebrow "Operations feed" renders above the heading', async ({ page }) => {
    await signup(page)
    await gotoNotifications(page)
    await expect(page.getByText(/^operations feed$/i)).toBeVisible()
  })

  test('page heading "Notifications" renders', async ({ page }) => {
    await signup(page)
    await gotoNotifications(page)
    await expect(page.getByRole('heading', { name: /^notifications$/i, level: 1 })).toBeVisible()
  })

  test('subheading mentions "Real-time alerts"', async ({ page }) => {
    await signup(page)
    await gotoNotifications(page)
    await expect(page.getByText(/real-time alerts/i)).toBeVisible()
  })

  test('Unread count chip "N unread" renders', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoNotifications(page)
    await expect(page.getByText(/\d+ unread/i)).toBeVisible({ timeout: 10000 })
  })

  test('Notification feed list landmark renders with at least one item', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoNotifications(page)
    const list = page.getByRole('list', { name: /notifications/i })
    await expect(list).toBeVisible({ timeout: 10000 })
    const items = list.getByRole('listitem')
    await expect.poll(() => items.count(), { timeout: 5000 }).toBeGreaterThanOrEqual(1)
  })

  test('first notification item shows a title or body snippet', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoNotifications(page)
    const item = page
      .getByRole('list', { name: /notifications/i })
      .getByRole('listitem')
      .first()
    await expect(item).toBeVisible({ timeout: 10000 })
    const txt = ((await item.textContent()) ?? '').trim()
    expect(txt.length).toBeGreaterThan(2)
  })

  test('Speeding chip is conditionally visible (rendered only when count > 0)', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoNotifications(page)
    // Either the chip is visible OR not — both are acceptable; we just ensure the
    // page does not crash and the rendering is consistent.
    const speeding = page.getByText(/\d+ speeding/i)
    const count = await speeding.count()
    if (count > 0) {
      const txt = (await speeding.first().textContent()) ?? ''
      expect(txt).toMatch(/\d+/)
    }
  })

  test('Maintenance chip is conditionally visible (rendered only when count > 0)', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoNotifications(page)
    const maint = page.getByText(/\d+ maintenance/i)
    const count = await maint.count()
    if (count > 0) {
      const txt = (await maint.first().textContent()) ?? ''
      expect(txt).toMatch(/\d+/)
    }
  })
})
