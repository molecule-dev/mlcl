/**
 * /profile — authenticated user profile.
 *
 * The page is read-only at this stage: it shows the signed-in user's
 * name + email, and three tabs that pivot the user's announcements (My
 * posts / Acknowledgments / Mentions). Editing the user record happens
 * in /settings → Account (SettingsPanel). This spec covers tab pivoting
 * + the read-after-write invariant that posts I author actually appear
 * under "My posts".
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  ackAnnouncement,
  captureNetwork,
  getAccessToken,
  seedAnnouncement,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('profile page', () => {
  test("shows the signed-in user's name + email in the header", async ({ page }) => {
    const email = uniqueEmail('profile-header')
    await signup(page, email)
    await page.goto(APP_BASE + '/profile')
    // The profile page header has its own data-testid for the email so
    // we assert on that specifically (the email also appears in the
    // sidebar user menu, which is correct rendering — not a duplicate
    // bug).
    await expect(page.getByTestId('profile-email')).toHaveText(email)
    await expect(page.getByTestId('profile-name')).toBeVisible()
    await expect(page.getByTestId('profile-name')).toHaveText(/Test User|Test|User/i)
  })

  test('renders the three tabs', async ({ page }) => {
    await signup(page, uniqueEmail('profile-tabs'))
    await page.goto(APP_BASE + '/profile')
    await expect(page.getByTestId('profile-tab-posts')).toBeVisible()
    await expect(page.getByTestId('profile-tab-acks')).toBeVisible()
    await expect(page.getByTestId('profile-tab-mentions')).toBeVisible()
  })

  test('a freshly-authored announcement appears under My posts (read-after-write)', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('profile-mine'))
    const a = await seedAnnouncement(page, accessToken, {
      title: `My profile post ${Date.now()}`,
      requires_acknowledgment: false,
    })
    await page.goto(APP_BASE + '/profile')
    await page.getByTestId('profile-tab-posts').click()
    await expect(page.getByText(a.title)).toBeVisible()
  })

  test('an acknowledged announcement appears under Acknowledgments', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('profile-ack'))
    const a = await seedAnnouncement(page, accessToken, {
      title: `Profile ack target ${Date.now()}`,
    })
    await ackAnnouncement(page, accessToken, a.id)
    await page.goto(APP_BASE + '/profile')
    await page.getByTestId('profile-tab-acks').click()
    await expect(page.getByText(a.title)).toBeVisible()
  })

  test('Mentions tab is reachable and renders an empty/populated state', async ({ page }) => {
    await signup(page, uniqueEmail('profile-mentions'))
    await page.goto(APP_BASE + '/profile')
    await page.getByTestId('profile-tab-mentions').click()
    // Either at least one mention card OR an empty-state message.
    const anyContent = await page.locator('main').innerText()
    expect(anyContent.length).toBeGreaterThan(0)
  })

  test('Sign out clears auth and redirects to /login', async ({ page }) => {
    await signup(page, uniqueEmail('profile-signout'))
    await page.goto(APP_BASE + '/profile')
    await page
      .getByRole('button', { name: /SIGN OUT|Sign out/i })
      .first()
      .click()
    await page.waitForURL(/\/login/, { timeout: 5000 })
    const token = await getAccessToken(page)
    expect(token).toBeNull()
  })

  test('Theme toggle flips data-mol-mode on /profile', async ({ page }) => {
    await signup(page, uniqueEmail('profile-theme'))
    await page.goto(APP_BASE + '/profile')
    const before = await page.evaluate(() => document.documentElement.getAttribute('data-mol-mode'))
    await page
      .getByRole('button', { name: /Toggle theme/i })
      .first()
      .click()
    await page.waitForTimeout(200)
    const after = await page.evaluate(() => document.documentElement.getAttribute('data-mol-mode'))
    expect(after).not.toBe(before)
  })

  test('page load issues GET /api/users/me + GET /api/announcements', async ({ page }) => {
    await signup(page, uniqueEmail('profile-net'))
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/profile', { waitUntil: 'networkidle' })
    })
    const me = reqs.find((r) => /\/api\/users\/me/.test(r.url) && r.method === 'GET')
    expect(me?.status, JSON.stringify(reqs.slice(-10))).toBe(200)
    const announcements = reqs.find(
      (r) => /\/api\/announcements(?!\/me)/.test(r.url) && r.method === 'GET',
    )
    expect(announcements?.status).toBe(200)
  })
})
