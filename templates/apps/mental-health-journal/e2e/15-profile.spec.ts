import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers'

test.describe('/profile', () => {
  test('renders user heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('shows "Reflecting since" date', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await expect(page.getByText(/Reflecting since/i)).toBeVisible()
  })

  test('shows "Reflections" stat label', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await expect(page.getByText(/^Reflections$/i)).toBeVisible()
  })

  test('shows "Words written" stat label', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await expect(page.getByText(/Words written/i)).toBeVisible()
  })

  test('shows "Longest streak" stat label', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await expect(page.getByText(/Longest streak/i)).toBeVisible()
  })

  test('renders mood-mix section', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await expect(
      page.getByRole('heading', { level: 3, name: /Your mood mix this season/i }),
    ).toBeVisible()
  })

  test('renders milestones section', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await expect(page.getByRole('heading', { level: 3, name: /Milestones/i })).toBeVisible()
  })

  test('GET /api/journal/profile-stats is called on page load', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await signup(page)
      await page.goto(APP_BASE + '/profile')
      await page.waitForResponse((r) => r.url().includes('/api/journal/profile-stats'), {
        timeout: 10_000,
      })
    })
    const stats = reqs.find(
      (r) => r.method === 'GET' && r.url.includes('/api/journal/profile-stats'),
    )
    expect(stats, 'GET /api/journal/profile-stats observed').toBeDefined()
    expect(stats!.status, 'API returned 2xx').toBeLessThan(300)
  })
})
