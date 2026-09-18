import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('/profile', () => {
  test('shows the real signed-in user name and email (no fabricated Asha Rahman)', async ({
    page,
  }) => {
    const email = uniqueEmail('profile')
    await signup(page, email)
    await page.goto(APP_BASE + '/profile')
    await expect(page.getByTestId('profile-email')).toHaveText(email, { timeout: 15_000 })
    const body = await page.locator('body').innerText()
    expect(body.toLowerCase()).not.toContain('asha rahman')
    expect(body.toLowerCase()).not.toContain('vigil.example.com')
  })

  test('Edit profile button reveals a form that PATCHes /api/users/:id and persists', async ({
    page,
  }) => {
    const { userId, accessToken } = await signup(page)
    await page.goto(APP_BASE + '/profile')

    await page.getByTestId('edit-profile-btn').click()
    await expect(page.getByTestId('edit-profile-form')).toBeVisible()

    const newName = `Renamed ${Date.now()}`
    await page.getByTestId('edit-profile-name').fill(newName)

    const respPromise = page.waitForResponse(
      (r) => r.url().includes(`/users/${userId}`) && r.request().method() === 'PATCH',
      { timeout: 15_000 },
    )
    await page.getByTestId('edit-profile-submit').click()
    const resp = await respPromise
    expect(resp.status(), `PATCH /users/:id: ${await resp.text().catch(() => '')}`).toBe(200)

    // Confirm via API that the user record now carries the new name.
    const fetched = await page.request.get(`${API_BASE}/users/${userId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    expect(fetched.status()).toBe(200)
    const raw = (await fetched.json()) as Record<string, unknown>
    const u = (raw.props ?? raw) as Record<string, unknown>
    expect(u.name).toBe(newName)
  })

  test('issues GET /api/incidents to compute KPIs', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/profile')
      await page.waitForTimeout(1500)
    })
    const get = reqs.find((r) => /\/api\/incidents(\?|$)/.test(r.url) && r.method === 'GET')
    expect(get?.status, 'GET /api/incidents').toBe(200)
  })
})
