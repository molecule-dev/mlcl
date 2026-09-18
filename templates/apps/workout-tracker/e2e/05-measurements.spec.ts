import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { signup, API_BASE } from './_helpers.js'

test.describe('/measurements', () => {
  test('check-in form persists a measurement and shows it in the list', async ({ page }) => {
    await signup(page)
    await page.goto('/measurements')
    await page.waitForLoadState('networkidle').catch(() => null)

    // Empty state visible initially.
    await expect(page.getByText(/no check-ins yet/i)).toBeVisible({ timeout: 15000 })

    // Open the form.
    await page
      .getByRole('button', { name: /add check-in|add|new check/i })
      .first()
      .click()
    await page
      .getByRole('textbox', { name: /bodyweight/i })
      .or(page.locator('input').first())
      .first()
    const weightInput = page.locator('input[type="number"]').first()
    await weightInput.fill('80.5')
    await page
      .getByRole('button', { name: /save check-in|save/i })
      .first()
      .click()

    // Empty state goes away.
    await expect(page.getByText(/no check-ins yet/i)).toHaveCount(0, { timeout: 15000 })

    // Persists across reload — at least one '80.5' instance is visible
    // (the page renders the stat tile and a history row).
    await page.reload()
    await page.waitForLoadState('networkidle').catch(() => null)
    await expect(page.getByText('80.5').first()).toBeVisible({ timeout: 15000 })
    expect(await page.getByText('80.5').count()).toBeGreaterThan(0)
  })

  test('GET /measurements returns the saved row', async ({ page, request }) => {
    await signup(page)
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
    const post = await request.post(`${API_BASE}/measurements`, {
      headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
      data: { weight_kg: 78.4 },
    })
    expect(post.status()).toBe(201)
    const list = await request.get(`${API_BASE}/measurements`, {
      headers: { Cookie: cookieHeader },
    })
    expect(list.status()).toBe(200)
    const body = await list.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body.some((m: { weight_kg?: unknown }) => Number(m.weight_kg) === 78.4)).toBe(true)
  })
})
