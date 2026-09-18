import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { api, APP_BASE, captureNetwork, getAccessToken, signup, uniqueEmail } from './_helpers'

test.describe('/signup — first-name + last-name + email + password account creation', () => {
  test('signup with valid data lands on /boards and persists access token across reload', async ({
    page,
  }) => {
    const email = uniqueEmail('signup-lands')
    const reqs = await captureNetwork(page, async () => {
      await signup(page, email, 'TestPass!2026')
    })
    await expect(page).toHaveURL(/\/boards/)
    expect(
      reqs.some(
        (r) => r.method === 'POST' && /\/api\/users(?:\?|$|\/)/.test(r.url) && r.status < 400,
      ),
      `expected POST /api/users from signup — saw ${JSON.stringify(reqs.slice(0, 5))}`,
    ).toBe(true)
    const token = await getAccessToken(page)
    expect(typeof token).toBe('string')
    expect(token.length).toBeGreaterThan(20)
    await page.reload()
    await expect(page).toHaveURL(/\/boards/)
    expect(await getAccessToken(page)).toBe(token)
  })

  test('signup with mismatched confirm password keeps submit disabled & shows the error', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('input[autocomplete="given-name"]').fill('Mira')
    await page.locator('input[autocomplete="family-name"]').fill('Patel')
    await page.locator('input[type="email"]').fill(uniqueEmail('mismatch'))
    const pw = page.locator('input[autocomplete="new-password"]')
    await pw.nth(0).fill('PasswordOne!')
    await pw.nth(1).fill('PasswordTwo!')
    const submit = page.locator('form button[type="submit"]').first()
    await expect(submit).toBeDisabled()
    await expect(page.getByText(/passwords do not match/i)).toBeVisible()
  })

  test('GET /api/users/me with the persisted token returns the new user', async ({ page }) => {
    const { email } = await signup(page)
    const me = await api<{ id: string; email: string }>(page, 'GET', '/users/me')
    expect(me.email?.toLowerCase()).toBe(email.toLowerCase())
    expect(typeof me.id).toBe('string')
  })

  test('the form renders all five fields (first, last, email, pw, confirm) and a submit button', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.locator('input[autocomplete="given-name"]')).toBeVisible()
    await expect(page.locator('input[autocomplete="family-name"]')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[autocomplete="new-password"]')).toHaveCount(2)
    await expect(page.locator('form button[type="submit"]').first()).toBeVisible()
  })
})
