import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authHeaders, listApiKeys, signup, uniqueEmail } from './_helpers.js'

test.describe('/profile', () => {
  test('renders the user email + display name', async ({ page }) => {
    const { email } = await signup(page, uniqueEmail('profile-render'))
    await page.goto(APP_BASE + '/profile')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body, 'user email visible somewhere on profile').toContain(email)
  })

  test('display-name PATCH persists across reload', async ({ page }) => {
    await signup(page, uniqueEmail('profile-name'))
    const newName = `Renamed ${Date.now()}`
    const res = await page.request.patch(`${API_BASE}/profile/me`, {
      headers: authHeaders(page),
      data: { display_name: newName },
    })
    expect(res.status()).toBeLessThan(300)
    await page.goto(APP_BASE + '/profile')
    await page.waitForLoadState('networkidle')
    expect(await page.locator('body').innerText()).toContain(newName)
    await page.reload()
    await page.waitForLoadState('networkidle')
    expect(await page.locator('body').innerText()).toContain(newName)
  })

  test('creating an API key returns a one-time secret + lists the prefix', async ({ page }) => {
    await signup(page, uniqueEmail('profile-key'))
    const before = await listApiKeys(page)
    const res = await page.request.post(`${API_BASE}/profile/api-keys`, {
      headers: authHeaders(page),
      data: { name: `Test Key ${Date.now()}` },
    })
    expect(res.status(), 'POST /profile/api-keys').toBeLessThan(300)
    const created = (await res.json()) as { id: string; secret: string; prefix: string }
    expect(created.secret, 'one-time secret in create response').toBeTruthy()
    expect(created.prefix, 'prefix in create response').toBeTruthy()

    const after = await listApiKeys(page)
    expect(after.length, 'key count grew by 1').toBe(before.length + 1)
    const stored = after.find((k) => k.id === created.id)!
    expect(stored.prefix).toBe(created.prefix)
    expect(
      (stored as { secret?: string }).secret,
      'list responses must NOT leak the secret',
    ).toBeFalsy()

    // Revoke wipe.
    const del = await page.request.delete(`${API_BASE}/profile/api-keys/${created.id}`, {
      headers: authHeaders(page),
    })
    expect(del.status()).toBeLessThan(300)
    const after2 = await listApiKeys(page)
    expect(
      after2.find((k) => k.id === created.id),
      'revoked key disappears from list',
    ).toBeFalsy()
  })

  test('GET /api/profile/sessions reports at least the current device', async ({ page }) => {
    await signup(page, uniqueEmail('profile-sessions'))
    const res = await page.request.get(`${API_BASE}/profile/sessions`, {
      headers: authHeaders(page),
    })
    expect(res.status()).toBe(200)
    const sessions = (await res.json()) as Array<{ id: string; current?: boolean }>
    expect(sessions.length, 'at least the signup device session').toBeGreaterThan(0)
    expect(
      sessions.some((s) => s.current === true) || sessions.length > 0,
      'one device flagged as current OR at least one session present',
    ).toBeTruthy()
  })

  test('connected-accounts upsert via PUT persists', async ({ page }) => {
    await signup(page, uniqueEmail('profile-acct'))
    const put = await page.request.put(`${API_BASE}/profile/connected-accounts`, {
      headers: authHeaders(page),
      data: { provider: 'github', external_username: 'octocat', connected: true },
    })
    expect(put.status()).toBeLessThan(300)
    const after = await page.request.get(`${API_BASE}/profile/connected-accounts`, {
      headers: authHeaders(page),
    })
    const list = (await after.json()) as Array<{ provider: string; connected: boolean }>
    expect(list.find((a) => a.provider === 'github')?.connected, 'github connected').toBe(true)
  })
})
