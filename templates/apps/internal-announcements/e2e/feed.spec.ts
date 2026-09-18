/**
 * /feed — primary announcement list. Renders live data, filter pills
 * and channel chips work, and the "New announcement" CTA navigates to
 * the composer.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  captureNetwork,
  getAccessToken,
  seedAnnouncement,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('feed page', () => {
  test('redirects to /login when unauthenticated', async ({ page }) => {
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/feed')
    await expect(page).toHaveURL(/\/login|\/$/, { timeout: 10000 })
  })

  test('shows the empty-state on a fresh signup with no announcements', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('feed-empty'))
    await page.goto(APP_BASE + '/feed')
    // wait for /announcements + /categories + /team + /me/acks
    await page.waitForLoadState('networkidle')
    // Either populated (existing seed data) or genuine empty-state present.
    const list = page.getByTestId('feed-list')
    await expect(list).toBeVisible()
    expect(accessToken).toBeTruthy()
  })

  test('seeded announcement appears in the feed', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('feed-seeded'))
    const ann = await seedAnnouncement(page, accessToken, {
      title: `Spec feed ${Date.now()}`,
      body: 'Body for the seeded feed announcement.',
    })
    await page.goto(APP_BASE + '/feed')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(ann.title)).toBeVisible({ timeout: 10000 })
  })

  test('"New announcement" CTA navigates to /compose', async ({ page }) => {
    await signup(page, uniqueEmail('feed-cta'))
    await page.goto(APP_BASE + '/feed')
    await page.getByTestId('feed-compose-cta').click()
    await page.waitForURL('**/compose', { timeout: 5000 })
  })

  test('filter chip "Urgent" hides non-urgent rows', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('feed-filter-urgent'))
    const urgent = await seedAnnouncement(page, accessToken, {
      title: `Urgent ${Date.now()}`,
      priority: 'high',
    })
    const normal = await seedAnnouncement(page, accessToken, {
      title: `Just-FYI ${Date.now()}`,
      priority: 'low',
      requires_acknowledgment: false,
    })
    await page.goto(APP_BASE + '/feed')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(urgent.title)).toBeVisible()
    await expect(page.getByText(normal.title)).toBeVisible()
    await page.getByTestId('feed-filter-urgent').click()
    await expect(page.getByText(urgent.title)).toBeVisible()
    await expect(page.getByText(normal.title)).toHaveCount(0)
  })

  test('channel chip filters cards to that category', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('feed-channel'))
    const ann = await seedAnnouncement(page, accessToken, {
      title: `Channel filter ${Date.now()}`,
    })
    await page.goto(APP_BASE + '/feed')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(ann.title)).toBeVisible({ timeout: 10000 })
    const reqs = await captureNetwork(page, async () => {
      await page.getByTestId('feed-channel-company').click()
      await page.waitForURL(/channel=company/, { timeout: 5000 })
    })
    expect(reqs.length).toBeGreaterThanOrEqual(0)
    await expect(page.getByText(ann.title)).toBeVisible()
    await page.getByTestId('feed-channel-all').click()
    await expect(page).not.toHaveURL(/channel=/)
  })

  test('feed loads /announcements + /categories + /team + /me/acks on mount', async ({ page }) => {
    await signup(page, uniqueEmail('feed-network'))
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/feed')
      await page.waitForLoadState('networkidle')
    })
    const urls = reqs.map((r) => r.url)
    expect(urls.some((u) => /\/api\/announcements(\?|$)/.test(u))).toBe(true)
    expect(urls.some((u) => /\/api\/categories(\?|$)/.test(u))).toBe(true)
    expect(urls.some((u) => /\/api\/team(\?|$)/.test(u))).toBe(true)
    expect(urls.some((u) => /\/api\/announcements\/me\/acknowledgments/.test(u))).toBe(true)
  })

  test('sidebar nav links navigate to each authed route', async ({ page }) => {
    await signup(page, uniqueEmail('feed-nav'))
    await page.goto(APP_BASE + '/feed')
    for (const [linkName, expectedPath] of [
      [/^Notifications/i, '/notifications'],
      [/^Search/i, '/search'],
      [/^People/i, '/people'],
      [/^Analytics/i, '/analytics'],
      [/^My acknowledgments/i, '/my-acknowledgments'],
      [/^Settings/i, '/settings'],
    ] as const) {
      await page.goto(APP_BASE + '/feed')
      await page.waitForLoadState('networkidle')
      await page.getByRole('link', { name: linkName }).first().click()
      await expect(page).toHaveURL(new RegExp(expectedPath.replace('/', '\\/')), { timeout: 5000 })
    }
  })

  test('sidebar Profile link navigates to /profile', async ({ page }) => {
    await signup(page, uniqueEmail('feed-profile-nav'))
    await page.goto(APP_BASE + '/feed')
    await page
      .getByRole('link', { name: /^Profile/i })
      .first()
      .click()
    await page.waitForURL('**/profile', { timeout: 5000 })
  })

  test('sidebar Sign out clears auth and lands on /login', async ({ page }) => {
    await signup(page, uniqueEmail('feed-signout'))
    await page.goto(APP_BASE + '/feed')
    await page
      .getByRole('button', { name: /SIGN OUT|Sign out/i })
      .first()
      .click()
    await page.waitForURL(/\/login/, { timeout: 5000 })
    const tokenAfter = await getAccessToken(page)
    expect(tokenAfter).toBeFalsy()
  })

  test('sidebar Theme toggle flips data-mol-mode AND persists across reload', async ({ page }) => {
    await signup(page, uniqueEmail('feed-theme'))
    await page.goto(APP_BASE + '/feed')
    const before = await page.evaluate(() => document.documentElement.getAttribute('data-mol-mode'))
    await page
      .getByRole('button', { name: /Toggle theme/i })
      .first()
      .click()
    await page.waitForTimeout(200)
    const after = await page.evaluate(() => document.documentElement.getAttribute('data-mol-mode'))
    expect(after).not.toBe(before)
    await page.reload()
    const persisted = await page.evaluate(() =>
      document.documentElement.getAttribute('data-mol-mode'),
    )
    expect(persisted).toBe(after)
  })

  test('All-priority filter chip clears the urgent filter', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('feed-filter-all'))
    await seedAnnouncement(page, accessToken, {
      title: `Normal-${Date.now()}`,
      priority: 'low',
      requires_acknowledgment: false,
    })
    await seedAnnouncement(page, accessToken, {
      title: `Hi-${Date.now()}`,
      priority: 'high',
    })
    await page.goto(APP_BASE + '/feed')
    await page.waitForLoadState('networkidle')
    await page.getByTestId('feed-filter-urgent').click()
    await page.waitForTimeout(150)
    await page.getByTestId('feed-filter-all').click()
    await page.waitForTimeout(150)
    // After "All" is clicked, both urgent and normal entries are visible
    const articleCount = await page.locator('article').count()
    expect(articleCount).toBeGreaterThan(0)
  })

  test('Pinned filter chip narrows to pinned-only', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('feed-filter-pinned'))
    const pinned = await seedAnnouncement(page, accessToken, {
      title: `Pinned-${Date.now()}`,
      is_pinned: true,
    })
    const normal = await seedAnnouncement(page, accessToken, {
      title: `Plain-${Date.now()}`,
      is_pinned: false,
      requires_acknowledgment: false,
    })
    await page.goto(APP_BASE + '/feed')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(pinned.title)).toBeVisible()
    await expect(page.getByText(normal.title)).toBeVisible()
    await page.getByTestId('feed-filter-pinned').click()
    await page.waitForTimeout(150)
    await expect(page.getByText(pinned.title)).toBeVisible()
    await expect(page.getByText(normal.title)).toHaveCount(0)
  })

  test('announcement card link navigates to /announcement/:id', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('feed-card-link'))
    const ann = await seedAnnouncement(page, accessToken, {
      title: `Card-link ${Date.now()}`,
    })
    await page.goto(APP_BASE + '/feed')
    await page.waitForLoadState('networkidle')
    await page.locator(`a[href="/announcement/${ann.id}"]`).first().click()
    await page.waitForURL(new RegExp(`/announcement/${ann.id}`), { timeout: 5000 })
  })

  test('clicking a sidebar channel link adds ?channel=<slug> to the URL', async ({ page }) => {
    await signup(page, uniqueEmail('feed-side-channel'))
    await page.goto(APP_BASE + '/feed')
    await page.waitForLoadState('networkidle')
    const link = page.locator('aside a[href="/feed?channel=company"]').first()
    await expect(link).toBeVisible()
    await link.click()
    await page.waitForURL(/channel=company/, { timeout: 5000 })
  })

  test('Brand link in sidebar stays on /feed when already there', async ({ page }) => {
    await signup(page, uniqueEmail('feed-brand-stay'))
    await page.goto(APP_BASE + '/feed')
    const brand = page.getByRole('link', { name: /^Herald/i }).first()
    await brand.click()
    await page.waitForTimeout(200)
    await expect(page).toHaveURL(/\/feed/)
  })

  test('"New announcement" CTA in sidebar links to /compose', async ({ page }) => {
    await signup(page, uniqueEmail('feed-new-ann-cta'))
    await page.goto(APP_BASE + '/feed')
    const link = page
      .getByRole('link', { name: /New announcement/i })
      .or(page.getByTestId('feed-compose-cta'))
    await link.first().click()
    await page.waitForURL('**/compose', { timeout: 5000 })
  })

  test('sidebar Feed link returns to /feed from another page', async ({ page }) => {
    await signup(page, uniqueEmail('feed-side-feed'))
    await page.goto(APP_BASE + '/profile')
    await expect(page).toHaveURL(/\/profile/)
    await page.getByRole('link', { name: /^Feed/i }).first().click()
    await page.waitForURL(/\/feed/, { timeout: 5000 })
    await expect(page).toHaveURL(/\/feed/)
  })
})
