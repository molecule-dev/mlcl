import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers'

// /settings — sectioned shell. Mounting fires GETs for profile, billing,
// team_members, integrations. Account section saves via PATCH /api/profile;
// integrations toggle via POST /api/integrations/:id/toggle.

test.describe('/settings', () => {
  test('all four GETs fire on mount + heading visible', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings')
      await page.getByRole('heading', { name: /^Settings$/i }).waitFor({ timeout: 15_000 })
      // Wait for all four to settle.
      await page.waitForTimeout(2000)
    })
    const wanted = ['/api/profile', '/api/billing', '/api/team_members', '/api/integrations']
    for (const path of wanted) {
      const call = reqs.find(
        (r) => new RegExp(path.replace(/\//g, '\\/') + '(\\?|$)').test(r.url) && r.method === 'GET',
      )
      expect(call, `GET ${path} should fire`).toBeTruthy()
      expect(call!.status, `${path} returned ${call!.status}`).toBe(200)
    }
  })

  test('Account section: PATCH /api/profile persists across reload', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByRole('button', { name: /^account$/i }).click()
    await page.locator('input[name="display_name"]').fill('Casey Curl')
    await page.locator('input[name="handle"]').fill('casey_dev')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /save changes/i }).click()
      await page.locator('[data-account-saved-at]').first().waitFor({ timeout: 10_000 })
    })
    const patch = reqs.find((r) => /\/api\/profile(\?|$)/.test(r.url) && r.method === 'PATCH')
    expect(patch, 'PATCH /api/profile should fire').toBeTruthy()
    expect(patch!.status).toBe(200)
    await page.reload()
    await page.getByRole('button', { name: /^account$/i }).click()
    await expect(page.locator('input[name="display_name"]')).toHaveValue('Casey Curl')
    await expect(page.locator('input[name="handle"]')).toHaveValue('casey_dev')
  })

  test('Integrations section: Connect → POST /api/integrations/:id/toggle → reload shows Disconnect', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByRole('button', { name: /^integrations$/i }).click()
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /^connect$/i })
        .first()
        .click()
      await page.waitForTimeout(1000)
    })
    const toggle = reqs.find(
      (r) => /\/api\/integrations\/[^/]+\/toggle$/.test(r.url) && r.method === 'POST',
    )
    expect(toggle, 'POST /api/integrations/:id/toggle should fire').toBeTruthy()
    expect(toggle!.status).toBe(200)
    await page.reload()
    await page.getByRole('button', { name: /^integrations$/i }).click()
    await expect(page.getByRole('button', { name: /^disconnect$/i }).first()).toBeVisible({
      timeout: 10_000,
    })
  })
})
