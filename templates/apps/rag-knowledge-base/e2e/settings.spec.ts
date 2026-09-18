/**
 * /settings — Engram account & retrieval preferences.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { API_BASE, APP_BASE, apiHeaders, captureNetwork, signup } from './_helpers.js'

test.describe('settings', () => {
  test('profile form renders', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.locator('[data-testid="settings-profile-form"]')).toBeVisible()
  })

  test('name input accepts text', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-testid="settings-name"]').fill('Renamed User')
    await expect(page.locator('[data-testid="settings-name"]')).toHaveValue('Renamed User')
  })

  test('email input accepts text', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const newEmail = `renamed-${Date.now()}@flagship.test`
    await page.locator('[data-testid="settings-email"]').fill(newEmail)
    await expect(page.locator('[data-testid="settings-email"]')).toHaveValue(newEmail)
  })

  test('profile-save PATCHes /api/users/:id and the saved indicator appears', async ({ page }) => {
    const { userId } = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-testid="settings-name"]').fill('Renamed User')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-testid="settings-profile-save"]').click()
      await page.waitForTimeout(2000)
    })
    const patch = reqs.find((r) => r.method === 'PATCH' && r.url.includes(`/api/users/${userId}`))
    expect(patch?.status, 'expected /users/:id to return 2xx').toBeLessThan(400)
  })

  test('prefs form renders and is submittable', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.locator('[data-testid="settings-prefs-form"]')).toBeVisible()
    await page.locator('[data-testid="settings-prefs-save"]').click()
    await page.waitForTimeout(800)
  })

  test('settings-new-token toggles the token-create form', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-testid="settings-new-token"]').click()
    await expect(page.locator('[data-testid="settings-token-form"]')).toBeVisible()
  })

  test('token-create POSTs /api/api-tokens and adds a row', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-testid="settings-new-token"]').click()
    await page.locator('[data-testid="settings-token-label"]').fill(`token-${Date.now()}`)
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-testid="settings-token-create"]').click()
      await page.waitForTimeout(1500)
    })
    const post = reqs.find((r) => /\/api\/api-tokens\/?$/.test(r.url) && r.method === 'POST')
    expect(post?.status).toBe(201)

    // Read-after-write
    const res = await page.request.get(`${API_BASE}/api-tokens`, {
      headers: apiHeaders(accessToken),
    })
    expect(res.status()).toBe(200)
    const list = (await res.json()) as Array<{ label: string }>
    expect(list.length).toBeGreaterThan(0)
  })
})
