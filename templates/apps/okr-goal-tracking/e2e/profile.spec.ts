import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { signup, APP_BASE, apiHeaders, API_BASE, seedObjective } from './_helpers.js'

test.describe('Profile page', () => {
  test('renders empty state for fresh user with email + zero stats', async ({ page }) => {
    const { email } = await signup(page)
    // Capture REQUESTS (not responses) — the assertion is that MOUNT fires
    // the dual fetches, which is true regardless of how the responses land.
    const fired: string[] = []
    const onRequest = (r: { method(): string; url(): string }) => {
      if (r.method() === 'GET') fired.push(r.url())
    }
    page.on('request', onRequest)
    try {
      await page.goto(APP_BASE + '/profile')
      await expect(page.getByTestId('profile-page')).toBeVisible()
      // Poll — under load the fetches can start after the page is visible.
      await expect.poll(() => fired.find((u) => /\/api\/objectives/.test(u))).toBeTruthy()
      await expect.poll(() => fired.find((u) => /\/api\/check-ins/.test(u))).toBeTruthy()
    } finally {
      page.off('request', onRequest)
    }

    await expect(page.getByTestId('profile-email')).toHaveText(email)
    await expect(page.getByTestId('stat-objectives')).toHaveText('0')
    await expect(page.getByTestId('stat-checkins')).toHaveText('0')
    await expect(page.getByTestId('profile-empty')).toBeVisible()
  })

  test('reflects a new objective after creation (read-after-write across pages)', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/objectives/new')
    await page.locator('form input[type="text"]').first().fill('Profile e2e objective')
    await page.getByRole('button', { name: /save objective/i }).click()
    await page.waitForURL(/\/objectives\/[0-9a-f-]{36}/, { timeout: 15000 })

    await page.goto(APP_BASE + '/profile')
    await expect(page.getByTestId('stat-objectives')).toHaveText('1')
    await expect(page.getByTestId('profile-objective-list')).toContainText('Profile e2e objective')
  })

  test('All-objectives link routes to /objectives', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedObjective(page, accessToken!, { title: 'Visible objective' })
    await page.goto(APP_BASE + '/profile')
    // Wait for objectives to load so the link surfaces.
    await expect(page.getByTestId('profile-objective-list')).toContainText('Visible objective')
    await page
      .getByRole('link', { name: /all objectives/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/objectives$/)
  })

  test('Objective card links to its detail page', async ({ page }) => {
    const { accessToken } = await signup(page)
    const obj = await seedObjective(page, accessToken!, { title: 'Click-me objective' })
    await page.goto(APP_BASE + '/profile')
    await expect(page.getByTestId('profile-objective-list')).toContainText('Click-me objective')
    await page.getByTestId('profile-objective-list').locator('a').first().click()
    await expect(page).toHaveURL(new RegExp(`/objectives/${obj.id}$`))
    // Read-after-write — the detail page hydrates from the API.
    const fresh = await page.request.get(`${API_BASE}/objectives/${obj.id}`, {
      headers: apiHeaders(accessToken!),
    })
    expect(fresh.status()).toBe(200)
  })
})
