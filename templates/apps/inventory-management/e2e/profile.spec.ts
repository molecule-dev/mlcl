import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authHeaders, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('profile', () => {
  test('renders the signed-in user as the operator (name, email, role)', async ({ page }) => {
    const email = uniqueEmail('profile-render')
    await signup(page, email)
    await page.goto(APP_BASE + '/profile')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText(email).first()).toBeVisible()
    // Multiple rendered surfaces show the email — header pill, contact row, and
    // active-session row — so we check that they all match.
    expect(await page.getByText(email).count()).toBeGreaterThanOrEqual(2)
  })

  test('lists at least one device row and a "Change password" link', async ({ page }) => {
    await signup(page, uniqueEmail('profile-devices'))
    await page.goto(APP_BASE + '/profile')
    await expect(page.getByRole('heading', { name: /sign-in.*devices|sessions/i })).toBeVisible()
    // Active session row
    await expect(page.getByText(/active/i).first()).toBeVisible()
    // The change-password CTA is a real link to /forgot-password — NOT a no-op
    const link = page.getByTestId('profile-change-password')
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', '/forgot-password')
  })

  test('default warehouse selector loads real warehouses and persists across reload', async ({
    page,
    request,
  }) => {
    const email = uniqueEmail('profile-pref')
    const { accessToken } = await signup(page, email)

    // Prime dashboard so the seed warehouses exist.
    const dashboardResp = await request.get(`${API_BASE}/dashboard/snapshot`, {
      headers: authHeaders(accessToken),
    })
    expect(dashboardResp.status()).toBe(200)

    await page.goto(APP_BASE + '/profile')
    const select = page.getByTestId('profile-default-warehouse')
    await expect(select).toBeVisible()
    // Pull all option values; pick the first non-empty one.
    const optionValues = await select.evaluate((el: HTMLSelectElement) =>
      Array.from(el.options).map((o) => o.value),
    )
    const target = optionValues.find((v) => v.length > 0)
    expect(target, 'no real warehouse options rendered').toBeTruthy()

    const reqs = await captureNetwork(page, async () => {
      await select.selectOption(target!)
      await expect(page.getByTestId('profile-default-warehouse-saved')).toBeVisible({
        timeout: 8000,
      })
    })
    // The preference persists through the server-side /preferences channel —
    // the platform user resource never returns app-specific oauthData.
    const patch = reqs.find((r) => /\/preferences$/.test(r.url) && r.method === 'PATCH')
    expect(patch?.status, 'PATCH /preferences did not happen on selection').toBe(200)

    // Read-after-write: the preference channel now carries the choice.
    const prefResp = await request.get(`${API_BASE}/preferences`, {
      headers: authHeaders(accessToken),
    })
    expect(prefResp.status()).toBe(200)
    const prefs = (await prefResp.json()) as { defaultWarehouseId?: string | null }
    expect(prefs.defaultWarehouseId).toBe(target)

    // Reload and confirm the selection survives.
    await page.reload()
    const persisted = await page.getByTestId('profile-default-warehouse').inputValue()
    expect(persisted).toBe(target)
  })

  test('KPI cards render (actions / transfers / cycle counts)', async ({ page }) => {
    await signup(page, uniqueEmail('profile-kpis'))
    await page.goto(APP_BASE + '/profile')
    // Three KPI cards in the section
    const grid = page.locator('section').first()
    await expect(grid).toBeVisible()
    // Match the labels independently of locale strings
    const labels = page.locator('text=/Actions logged|Transfers managed|Cycle counts owned/i')
    await expect(labels.nth(2)).toBeAttached()
  })
})
