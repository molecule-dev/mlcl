import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, authedRequest, captureNetwork, signup } from './_helpers.js'

test.describe('profile (/profile)', () => {
  test('PATCH /users/:id updates name — GET reflects it', async ({ page }) => {
    const u = await signup(page)
    const patch = await authedRequest(page, u.accessToken, 'PATCH', `/users/${u.userId}`, {
      name: 'Renamed Hero',
    })
    expect(patch.status()).toBe(200)
    const re = await authedRequest(page, u.accessToken, 'GET', `/users/${u.userId}`)
    expect(re.status()).toBe(200)
    const body = (await re.json()) as { props?: { name?: string } }
    expect(body.props?.name).toBe('Renamed Hero')
  })

  test('PATCH /users/:id/password updates password — old fails, new succeeds', async ({ page }) => {
    const u = await signup(page)
    const newPwd = 'NewPass456!'
    const patch = await authedRequest(page, u.accessToken, 'PATCH', `/users/${u.userId}/password`, {
      currentPassword: u.password,
      newPassword: newPwd,
    })
    expect(patch.status()).toBe(200)
    const oldLogin = await page.request.post(
      `${process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'}/users/log-in`,
      { data: { email: u.email, password: u.password } },
    )
    expect(oldLogin.status(), 'old password must no longer log in').toBeGreaterThanOrEqual(400)
    const newLogin = await page.request.post(
      `${process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'}/users/log-in`,
      { data: { email: u.email, password: newPwd } },
    )
    expect(newLogin.status(), 'new password must log in').toBe(200)
  })

  test('cannot edit another user (IDOR)', async ({ page }) => {
    const u1 = await signup(page)
    const u2 = await signup(page)
    const patch = await authedRequest(page, u2.accessToken, 'PATCH', `/users/${u1.userId}`, {
      name: 'hijack',
    })
    expect(patch.status(), 'foreign user PATCH must be blocked').toBeGreaterThanOrEqual(401)
  })

  test('UI: navigating to /profile after signup renders the profile page', async ({ page }) => {
    const u = await signup(page)
    await page.goto(APP_BASE + '/profile')
    // After auth-guarded navigation, URL must be /profile (not bounced to /login)
    await expect(page).toHaveURL(/\/profile$/, { timeout: 15_000 })
    await expect(
      page.getByRole('heading', { name: /profile|account|details/i }).first(),
    ).toBeVisible({ timeout: 10_000 })
    expect(u.email.length).toBeGreaterThan(0)
  })

  test('UI: unauthenticated visit to /profile is redirected to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/profile')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('UI: changing display name on /profile saves and reflects via API', async ({ page }) => {
    const u = await signup(page)
    await page.goto(APP_BASE + '/profile')
    const nameField = page.getByRole('textbox', { name: /display name|^name$/i }).first()
    await expect(nameField).toBeVisible({ timeout: 15_000 })
    await nameField.fill('UI Renamed Hero')

    const reqs = await captureNetwork(page, async () => {
      const respPromise = page.waitForResponse(
        (r) => r.url().includes(`/api/users/${u.userId}`) && r.request().method() === 'PATCH',
        { timeout: 15_000 },
      )
      await page
        .getByRole('button', { name: /save name|save/i })
        .first()
        .click()
      const resp = await respPromise
      expect(resp.status()).toBe(200)
    })
    expect(
      reqs.some(
        (r) => r.method === 'PATCH' && r.url.includes(`/api/users/${u.userId}`) && r.status === 200,
      ),
      'expected PATCH /api/users/:id to be exercised',
    ).toBe(true)

    // Persistence invariant: the API now returns the new name
    const re = await authedRequest(page, u.accessToken, 'GET', `/users/${u.userId}`)
    const body = (await re.json()) as { props?: { name?: string } }
    expect(body.props?.name).toBe('UI Renamed Hero')
  })
})
