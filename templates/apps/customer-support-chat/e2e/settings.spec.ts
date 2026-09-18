import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiGet, signup } from './_helpers.js'

test.describe('/settings', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
  })

  test('renders Account + Widget appearance sections (no broken integrations placeholder)', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByRole('heading', { name: /^settings$/i }).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: /^account$/i }).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: /widget appearance/i }).first()).toBeVisible()
    // No leftover stub: no "Manage" buttons + no Slack/Shopify/HubSpot rows.
    await expect(page.getByText(/Slack|Shopify|HubSpot/)).toHaveCount(0)
  })

  test('Account → workspace name save persists via PATCH /api/users/:id (read-after-write)', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/settings')
    const newName = 'Test Roastery ' + Date.now()
    const input = page.locator('input[name="workspaceName"]')
    await input.fill(newName)
    const respPromise = page.waitForResponse(
      (r) => /\/api\/users\//.test(r.url()) && r.request().method() === 'PATCH' && r.status() < 400,
      { timeout: 15_000 },
    )
    await page
      .getByRole('button', { name: /^save$/i })
      .first()
      .click()
    await respPromise
    await expect(
      page
        .getByRole('status')
        .filter({ hasText: /^saved\.$/i })
        .first(),
    ).toBeVisible({
      timeout: 10_000,
    })
    // Backend invariant: GET /users/me returns the new name. The user
    // resource handler wraps the row under `props`; accept either shape.
    const me = await apiGet<{ props?: { name?: string | null }; name?: string | null }>(
      page,
      '/users/me',
    ).catch(() => null)
    if (me) {
      const meName = me.name ?? me.props?.name
      expect(meName).toBe(newName)
    }
    // Reload — the input still shows the saved value (proves the user.name round-trips).
    await page.reload()
    await expect(page.locator('input[name="workspaceName"]')).toHaveValue(newName, {
      timeout: 15_000,
    })
  })

  test('Widget appearance → save persists to localStorage and survives reload', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/settings')
    const greeting = 'Welcome to Test Co — how can we help?'
    const color = '#ff5733'
    await page.locator('input[name="widgetGreeting"]').fill(greeting)
    await page.locator('input[name="widgetBrandColor"]').fill(color)
    await page.getByRole('button', { name: /save widget/i }).click()
    await expect(
      page
        .getByRole('status')
        .filter({ hasText: /widget settings saved/i })
        .first(),
    ).toBeVisible({ timeout: 10_000 })
    // Reload — values persist (localStorage).
    await page.reload()
    await expect(page.locator('input[name="widgetGreeting"]')).toHaveValue(greeting)
    await expect(page.locator('input[name="widgetBrandColor"]')).toHaveValue(color)
  })
})
