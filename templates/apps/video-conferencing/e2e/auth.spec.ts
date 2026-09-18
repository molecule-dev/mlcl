import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { api, getAccessToken, getMyUserId, login, signup, uniqueEmail } from './_helpers.js'

test.describe('auth', () => {
  test('signup creates a new user, persists JWT, lands on dashboard', async ({ page }) => {
    const email = uniqueEmail('signup')
    const password = 'TestPass123!'
    await signup(page, email, password, 'Test', 'User', 'Acme HQ')

    await expect(page).toHaveURL(/\/dashboard/)
    const token = await getAccessToken(page)
    expect(token.split('.').length).toBe(3)

    const me = await api<{ id: string; email: string; name?: string }>(
      page,
      'GET',
      `/users/${await getMyUserId(page)}`,
    )
    expect(me.email).toBe(email)
    expect(me.name).toContain('Test')
  })

  test('signup auto-creates a workspace named from the form', async ({ page }) => {
    await signup(page, uniqueEmail('ws'), 'TestPass123!', 'Owen', 'Smith', 'Owen Studio')

    const workspaces = await api<Array<{ id: string; name: string }>>(page, 'GET', '/workspaces')
    expect(workspaces.length).toBeGreaterThanOrEqual(1)
    expect(workspaces.some((w) => w.name === 'Owen Studio')).toBe(true)
  })

  test('login restores session for existing user', async ({ page, context }) => {
    const email = uniqueEmail('login')
    const password = 'TestPass123!'
    await signup(page, email, password)
    await context.clearCookies()
    await page.evaluate(() => window.localStorage.clear())
    await login(page, email, password)
    await expect(page).toHaveURL(/\/dashboard/)
    const token = await getAccessToken(page)
    expect(token.length).toBeGreaterThan(20)
  })
})
