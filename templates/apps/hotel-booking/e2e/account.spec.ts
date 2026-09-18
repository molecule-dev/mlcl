import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/account (Account)', () => {
  test('renders the "Account" heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/account', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: /^Account$/, level: 1 })).toBeVisible()
  })

  test('Profile tab is selected by default and shows the Profile heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/account', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('button', { name: /^Profile$/ })).toBeVisible()
    // The default section heading is "Profile" (h2 inside main column).
    await expect(page.getByRole('heading', { name: /^Profile$/, level: 2 })).toBeVisible()
  })

  test('Loyalty tab swaps the section to the loyalty view', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/account', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: /^Loyalty$/ }).click()
    await expect(page.getByRole('heading', { name: /^Loyalty$/, level: 2 })).toBeVisible()
  })

  test('Preferences tab swaps the section to the preferences view', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/account', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: /^Preferences$/ }).click()
    await expect(page.getByRole('heading', { name: /^Preferences$/, level: 2 })).toBeVisible()
  })

  test('Save profile button issues PATCH /api/profile/me and the new name persists across reload', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/account', { waitUntil: 'domcontentloaded' })
    const newName = 'Persisted ' + Date.now()
    const nameField = page.getByRole('textbox', { name: /^Name$/i })
    await nameField.fill(newName)

    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Save profile/i }).click()
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    })
    expect(
      reqs.some((r) => r.url.endsWith('/api/profile/me') && r.method === 'PATCH'),
      'PATCH /api/profile/me must be observed',
    ).toBeTruthy()

    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('textbox', { name: /^Name$/i })).toHaveValue(newName)
  })

  test('observes GET /api/profile/me and GET /api/loyalty/me on page load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/account', { waitUntil: 'domcontentloaded' })
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    })
    expect(reqs.some((r) => r.url.endsWith('/api/profile/me') && r.method === 'GET')).toBeTruthy()
    expect(reqs.some((r) => r.url.endsWith('/api/loyalty/me') && r.method === 'GET')).toBeTruthy()
  })
})
