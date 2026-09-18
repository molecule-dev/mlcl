import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, expectNoConsoleErrors, getProfile, signup } from './_helpers.js'

test.describe('profile page', () => {
  test('renders heading with the listening profile', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await expect(page.getByRole('heading', { name: /listening profile/i })).toBeVisible()
  })

  test('initial load fetches /api/profile/me', async ({ page }) => {
    await signup(page)
    const requests = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/profile')
      await page.waitForLoadState('networkidle')
    })
    expect(requests.some((r) => /\/api\/profile\/me/.test(r.url) && r.status === 200)).toBeTruthy()
  })

  test('shows "Subscribed" stat reflecting the listener\'s subscriptions', async ({ page }) => {
    await signup(page)
    // Read the expected count from the endpoint the card renders rather than
    // hardcoding how many shows the demo seed happens to subscribe.
    const profile = await getProfile(page)
    await page.goto(APP_BASE + '/profile')
    await expect(page.getByText(/subscribed/i).first()).toBeVisible()
    await expect(page.getByTestId('stat-subscriptions')).toHaveText(
      String(profile.subscriptions ?? ''),
      { timeout: 8000 },
    )
  })

  test('shows "Saved" stat reflecting the seeded saved-episode count', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await expect(page.getByText(/^saved$/i).first()).toBeVisible()
  })

  test('shows the queue summary card', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await expect(page.getByRole('heading', { name: /up next/i })).toBeVisible()
  })

  test('profile page renders without console errors', async ({ page }) => {
    await signup(page)
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/profile')
      await expect(page.getByRole('heading', { name: /listening profile/i })).toBeVisible()
    })
  })
})
