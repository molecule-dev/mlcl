import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  authedApi,
  captureNetwork,
  getAccessToken,
  signup,
  uniqueEmail,
  whereUrl,
} from './_helpers.js'

test.describe('/signup', () => {
  test('renders the signup form', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.getByLabel(/^Name$/i)).toBeVisible()
    await expect(page.getByLabel(/^Email( address)?$/i)).toBeVisible()
    await expect(page.getByLabel(/^Password$/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /Create account/i })).toBeVisible()
  })

  test('signing up creates the user and lands on /dashboard with a JWT token', async ({ page }) => {
    const email = uniqueEmail()
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/signup')
      await page.getByLabel(/^Name$/i).fill('Riley Test')
      await page.getByLabel(/^Email( address)?$/i).fill(email)
      await page.getByLabel(/^Password$/i).fill('TestPass123!')
      await page.getByRole('button', { name: /Create account/i }).click()
      await expect(page).not.toHaveURL(/\/signup/, { timeout: 15000 })
    })
    const posts = whereUrl(reqs, /\/api\/users(?:\?|$)/, 'POST')
    expect(posts.length, 'POST /api/users fired').toBeGreaterThan(0)
    expect(posts[0].status, 'signup status').toBe(201)

    // [M1-1] Token lives in the httpOnly `token` cookie (not localStorage)
    // and the user lands on the in-app shell.
    const token = await getAccessToken(page)
    expect(token, 'JWT token in auth cookie').toBeTruthy()
    expect(token!.split('.').length, 'JWT shape').toBe(3)
  })

  test('selecting Japanese on signup persists target_languages: [ja] to backend prefs', async ({
    page,
    request,
  }) => {
    await page.goto(APP_BASE + '/signup')
    const email = uniqueEmail('ja')
    await page.getByLabel(/^Name$/i).fill('Lang Picker')
    await page.getByLabel(/^Email( address)?$/i).fill(email)
    await page.getByLabel(/^Password$/i).fill('TestPass123!')
    // Click the Japanese flag button.
    await page.getByRole('button', { name: /Japanese/i }).click()
    await page.getByRole('button', { name: /Create account/i }).click()
    await expect(page).not.toHaveURL(/\/signup/, { timeout: 15000 })
    // [M1-1] Pull the JWT from the httpOnly `token` cookie and verify the
    // backend now reports ja as the target language.
    const token = await getAccessToken(page)
    expect(token, 'JWT token captured').toBeTruthy()
    // Give the in-flight prefs PATCH a moment to settle.
    await page.waitForTimeout(500)
    const api = authedApi(request, token!)
    const prefs = await api.get('/users/me/preferences')
    expect(prefs.status(), 'GET preferences status').toBe(200)
    const body = (await prefs.json()) as { target_languages?: string[] }
    expect(body.target_languages, 'target_languages persisted as ja').toContain('ja')
  })

  test('default target language (Spanish) is persisted when user does not click another flag', async ({
    page,
    request,
  }) => {
    const { accessToken } = await signup(page)
    expect(accessToken).toBeTruthy()
    await page.waitForTimeout(500)
    const api = authedApi(request, accessToken!)
    const prefs = await api.get('/users/me/preferences')
    const body = (await prefs.json()) as { target_languages?: string[] }
    expect(body.target_languages, 'default target_languages persisted').toContain('es')
  })
})
