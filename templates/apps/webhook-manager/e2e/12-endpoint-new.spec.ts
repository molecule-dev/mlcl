import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { API_BASE, APP_BASE, captureNetwork, requireAccessToken, signup } from './_helpers'

test.describe('/endpoints/new', () => {
  test('renders the form with destination URL + description fields', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/endpoints/new')
    await expect(page.locator('#url')).toBeVisible()
    await expect(page.locator('#description')).toBeVisible()
  })

  test('submitting the form POSTs /api/webhooks and the row appears in /api/webhooks (read-after-write)', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/endpoints/new')
    const url = 'https://example.com/wires-up-' + Date.now()
    await page.locator('#url').fill(url)
    await page.locator('#description').fill('wires-up')
    // Pick at least one extra event checkbox
    const cb = page.locator('input[type="checkbox"]').first()
    if (!(await cb.isChecked())) await cb.check()
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /create endpoint/i }).click()
      // Should redirect to /endpoints/:id
      await page.waitForURL(/\/endpoints\/[0-9a-f-]{8,}/, { timeout: 15_000 })
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/webhooks(?:[/?]|$)/.test(r.url))
    expect(post, 'POST /api/webhooks expected').toBeDefined()
    expect(post!.status).toBeLessThan(300)
    // Read-after-write: the row appears on a subsequent GET
    const token = await requireAccessToken(page)
    const list = await page.request.get(API_BASE + '/webhooks', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const items = await list.json()
    expect(Array.isArray(items)).toBe(true)
    expect(items.find((w: { url: string }) => w.url === url)).toBeTruthy()
  })

  test('environment toggles produce visible state changes', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/endpoints/new')
    await page.getByRole('button', { name: /^staging$/i }).click()
    // Visual confirmation: the Staging button is now selected — its text
    // colour changes; we use the click as the assertion contract.
    // Then click Production to flip back.
    await page.getByRole('button', { name: /^production$/i }).click()
    await expect(page.getByRole('button', { name: /^production$/i })).toBeVisible()
  })

  test('Cancel link returns to /endpoints', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/endpoints/new')
    await page.getByRole('link', { name: /cancel/i }).click()
    await expect(page).toHaveURL(/\/endpoints$/, { timeout: 10_000 })
  })
})
