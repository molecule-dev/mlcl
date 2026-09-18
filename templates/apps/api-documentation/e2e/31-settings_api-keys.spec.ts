import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers'

// /settings/api-keys — list + create + reveal-once flow.

test.describe('/settings/api-keys', () => {
  test('Create key button reveals the inline create form', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings/api-keys')
    await page.getByRole('button', { name: /create key/i }).click()
    await expect(page.locator('input[placeholder*="Key label" i]')).toBeVisible({ timeout: 5_000 })
  })

  test('Submit creates key, surfaces plaintext sk_live_… exactly once', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings/api-keys')
    await page.getByRole('button', { name: /create key/i }).click()
    await page.locator('input[placeholder*="Key label" i]').first().fill('CI pipeline')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /^create$/i }).click()
      await page.locator('[data-revealed-key]').waitFor({ timeout: 10_000 })
    })
    const create = reqs.find((r) => /\/api\/api_keys$/.test(r.url) && r.method === 'POST')
    expect(create, 'POST /api/api_keys should fire').toBeTruthy()
    expect(create!.status).toBe(201)
    const secret = await page
      .locator('[data-revealed-key]')
      .first()
      .getAttribute('data-revealed-key')
    expect(secret, 'plaintext key surfaced once').toMatch(/^sk_live_[a-f0-9]{48}$/)
  })

  test('After creating, the masked key is in the table', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings/api-keys')
    await page.getByRole('button', { name: /create key/i }).click()
    await page.locator('input[placeholder*="Key label" i]').first().fill('CI pipeline 2')
    await page.getByRole('button', { name: /^create$/i }).click()
    await page.locator('[data-revealed-key]').waitFor({ timeout: 10_000 })
    await expect(page.getByText(/sk_live_…/).first()).toBeVisible({ timeout: 5_000 })
  })
})
