import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedApi, captureNetwork, signup, whereUrl } from './_helpers.js'

test.describe('Settings page', () => {
  test('renders the four sections (integrations, api keys, team, notifications)', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByRole('heading', { name: /^Integrations$/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /^API keys$/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /^Team$/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /^Notifications$/i })).toBeVisible()
  })

  test('Connect button POSTs /api/api-credentials and the row flips to Disconnect', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    await page.goto(APP_BASE + '/settings')
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /^connect$/i })
        .first()
        .click()
      await page
        .getByRole('button', { name: /^disconnect$/i })
        .first()
        .waitFor({ timeout: 8000 })
    })
    const post = whereUrl(reqs, /\/api\/api-credentials(?:\?|$)/, 'POST')
    expect(post.length).toBeGreaterThan(0)
    expect(post[0].status).toBe(201)
    // backend invariant: a credential row exists for this user
    const api = await authedApi(request, session.accessToken!)
    const list = await (await api.get('/api-credentials')).json()
    expect(list.length).toBeGreaterThan(0)
  })

  test('Disconnect button DELETEs the credential and the badge flips back to Connect', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    const api = await authedApi(request, session.accessToken!)
    const created = await (
      await api.post('/api-credentials', {
        provider: 'github',
        encrypted_token: 'pending-test-' + Date.now(),
        scopes_json: ['repo'],
      })
    ).json()
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByRole('button', { name: /^disconnect$/i }).first()).toBeVisible()
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /^disconnect$/i })
        .first()
        .click()
      // Wait for Disconnect to disappear AND for both providers to show Connect.
      // Waiting for Connect.first() is wrong — gitlab always shows Connect, so .first()
      // matches before the DELETE response is captured by the listener.
      await expect(page.getByRole('button', { name: /^disconnect$/i })).toHaveCount(0, {
        timeout: 8000,
      })
      await expect(page.getByRole('button', { name: /^connect$/i })).toHaveCount(2, {
        timeout: 8000,
      })
    })
    const del = whereUrl(reqs, new RegExp(`/api/api-credentials/${created.id}`), 'DELETE')
    expect(del.length).toBe(1)
    expect(del[0].status).toBe(204)
    const list = await (await api.get('/api-credentials')).json()
    expect(list.find((c: { id: string }) => c.id === created.id)).toBeUndefined()
  })

  test('Profile button navigates to /profile', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByRole('button', { name: /^profile$/i }).click()
    await expect(page).toHaveURL(/\/profile/)
  })

  test('Open notifications button navigates to /notifications', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByRole('button', { name: /open notifications/i }).click()
    await expect(page).toHaveURL(/\/notifications/)
  })

  test('integrations table fetches /api/api-credentials on load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings')
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    })
    expect(whereUrl(reqs, /\/api\/api-credentials(?:\?|$)/, 'GET').length).toBeGreaterThan(0)
  })

  test('connection state survives reload', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page
      .getByRole('button', { name: /^connect$/i })
      .first()
      .click()
    await page
      .getByRole('button', { name: /^disconnect$/i })
      .first()
      .waitFor({ timeout: 8000 })
    await page.reload()
    await expect(page.getByRole('button', { name: /^disconnect$/i }).first()).toBeVisible()
  })

  test('AuthGuard redirects anonymous users to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/settings')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('Settings page renders the H1 heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
})
