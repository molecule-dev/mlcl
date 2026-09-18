import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, API_BASE, captureNetwork, getAccessToken, signup } from './_helpers'

// /saved — saved-searches list + create + delete.

test.describe('/saved', () => {
  test('redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto(APP_BASE + '/saved')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('after signup, /saved loads via GET /api/saved', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/saved')
      await page.waitForResponse((r) => /\/api\/saved(\b|\?|$)/.test(r.url()), {
        timeout: 10_000,
      })
    })
    const req = reqs.find((r) => r.method === 'GET' && /\/api\/saved(\b|\?|$)/.test(r.url))
    expect(req).toBeDefined()
    expect(req!.status).toBeLessThan(300)
  })

  test('"+ New saved search" opens the dialog', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/saved')
    await page.waitForResponse((r) => /\/api\/saved/.test(r.url()))
    await page.locator('[data-mol-id="saved-new"]').click()
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('creating a saved search POSTs /api/saved-searches and persists', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/saved')
    await page.waitForResponse((r) => /\/api\/saved/.test(r.url()))
    const name = `walker-saved-${Date.now()}`
    await page.locator('[data-mol-id="saved-new"]').click()
    await page.locator('#saved-new-name').fill(name)
    await page.locator('#saved-new-query').fill('severity:error service:checkout')
    const respPromise = page.waitForResponse(
      (r) => r.request().method() === 'POST' && /\/api\/saved-searches/.test(r.url()),
      { timeout: 10_000 },
    )
    await page.locator('[data-mol-id="saved-create-submit"]').click()
    const resp = await respPromise
    expect(resp.status()).toBeLessThan(300)
    // Read-after-write via API.
    const token = await getAccessToken(page)
    const res = await page.request.get(API_BASE + '/saved-searches', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const body = await res.json()
    const items: Array<{ name: string }> = Array.isArray(body)
      ? body
      : body.data || body.results || []
    expect(items.find((s) => s.name === name)).toBeDefined()
    // UI shows it after reload.
    await page.reload()
    await page.waitForResponse((r) => /\/api\/saved/.test(r.url()))
    await expect(page.getByText(name)).toBeVisible()
  })

  test('delete removes the saved search', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/saved')
    await page.waitForResponse((r) => /\/api\/saved/.test(r.url()))
    const name = `walker-del-${Date.now()}`
    // create one we know we can delete
    await page.locator('[data-mol-id="saved-new"]').click()
    await page.locator('#saved-new-name').fill(name)
    await page.locator('#saved-new-query').fill('severity:debug')
    const createPromise = page.waitForResponse(
      (r) => r.request().method() === 'POST' && /\/api\/saved-searches/.test(r.url()),
      { timeout: 10_000 },
    )
    await page.locator('[data-mol-id="saved-create-submit"]').click()
    await createPromise
    await expect(page.getByText(name)).toBeVisible({ timeout: 5_000 })
    // delete via the row's button
    const article = page.locator('article', { hasText: name }).first()
    const delBtn = article.locator('button[data-mol-id^="saved-delete-"]')
    const delPromise = page.waitForResponse(
      (r) => r.request().method() === 'DELETE' && /\/api\/saved-searches/.test(r.url()),
      { timeout: 10_000 },
    )
    await delBtn.click()
    const delResp = await delPromise
    expect(delResp.status()).toBeLessThan(300)
    await expect(page.getByText(name)).not.toBeVisible({ timeout: 5_000 })
  })

  test('cancel closes the create dialog', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/saved')
    await page.waitForResponse((r) => /\/api\/saved/.test(r.url()))
    await page.locator('[data-mol-id="saved-new"]').click()
    await page.getByRole('button', { name: /cancel/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('renders the saved searches heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/saved')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
})
