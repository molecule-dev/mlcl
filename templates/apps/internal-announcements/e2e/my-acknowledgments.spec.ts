/**
 * /my-acknowledgments — pending / acknowledged / sent tabs.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  ackAnnouncement,
  captureNetwork,
  seedAnnouncement,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('my-acknowledgments page', () => {
  test('renders the three tabs', async ({ page }) => {
    await signup(page, uniqueEmail('macks-render'))
    await page.goto(APP_BASE + '/my-acknowledgments')
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('my-acks-tabs')).toBeVisible()
    await expect(page.getByTestId('my-acks-tab-pending')).toBeVisible()
    await expect(page.getByTestId('my-acks-tab-acknowledged')).toBeVisible()
    await expect(page.getByTestId('my-acks-tab-sent')).toBeVisible()
  })

  test('a pending announcement appears under Pending', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('macks-pending'))
    const ann = await seedAnnouncement(page, accessToken, {
      title: `Pending ${Date.now()}`,
      requires_acknowledgment: true,
    })
    await page.goto(APP_BASE + '/my-acknowledgments')
    await page.waitForLoadState('networkidle')
    await page.getByTestId('my-acks-tab-pending').click()
    await expect(page.getByText(ann.title)).toBeVisible({ timeout: 10000 })
  })

  test('after acking, the announcement moves to Acknowledged', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('macks-acked'))
    const ann = await seedAnnouncement(page, accessToken, {
      title: `Acked ${Date.now()}`,
      requires_acknowledgment: true,
    })
    await ackAnnouncement(page, accessToken, ann.id)
    await page.goto(APP_BASE + '/my-acknowledgments')
    await page.waitForLoadState('networkidle')
    await page.getByTestId('my-acks-tab-acknowledged').click()
    await expect(page.getByText(ann.title)).toBeVisible({ timeout: 10000 })
  })

  test('Sent tab shows announcements I authored', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('macks-sent'))
    const ann = await seedAnnouncement(page, accessToken, {
      title: `Mine ${Date.now()}`,
    })
    await page.goto(APP_BASE + '/my-acknowledgments')
    await page.waitForLoadState('networkidle')
    await page.getByTestId('my-acks-tab-sent').click()
    await expect(page.getByText(ann.title)).toBeVisible({ timeout: 10000 })
  })

  test('empty Acknowledged tab shows the empty state for a fresh user', async ({ page }) => {
    // A brand-new user has acknowledged exactly nothing, so the
    // Acknowledged tab is guaranteed empty regardless of what's in the
    // shared seed feed. Use it to exercise the inbox-zero render.
    await signup(page, uniqueEmail('macks-empty-acked'))
    await page.goto(APP_BASE + '/my-acknowledgments')
    await page.waitForLoadState('networkidle')
    await page.getByTestId('my-acks-tab-acknowledged').click()
    await expect(page.getByTestId('my-acks-empty')).toBeVisible({ timeout: 10000 })
  })

  test('page load fires GET /api/announcements + /api/announcements/me/acknowledgments', async ({
    page,
  }) => {
    await signup(page, uniqueEmail('macks-net'))
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/my-acknowledgments')
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
  })

  test('Sign out from /my-acknowledgments works', async ({ page }) => {
    await signup(page, uniqueEmail('macks-signout'))
    await page.goto(APP_BASE + '/my-acknowledgments')
    await page
      .getByRole('button', { name: /SIGN OUT|Sign out/i })
      .first()
      .click()
    await page.waitForURL(/\/login/, { timeout: 5000 })
  })

  test('Theme toggle flips data-mol-mode on /my-acknowledgments', async ({ page }) => {
    await signup(page, uniqueEmail('macks-theme'))
    await page.goto(APP_BASE + '/my-acknowledgments')
    const before = await page.evaluate(() => document.documentElement.getAttribute('data-mol-mode'))
    await page
      .getByRole('button', { name: /Toggle theme/i })
      .first()
      .click()
    await page.waitForTimeout(200)
    const after = await page.evaluate(() => document.documentElement.getAttribute('data-mol-mode'))
    expect(after).not.toBe(before)
  })
})
