import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiFetch, captureNetwork, signup } from './_helpers'

// /team — list of invited team members for the signed-in workspace owner.
// POST /api/team-members invites; status starts as 'invited'.

test.describe('/team', () => {
  test('renders empty state for fresh user', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/team')
    await page.waitForTimeout(1500)
    await expect(page.locator('[data-mol-id="team-empty"]')).toBeVisible()
  })

  test('invite form POSTs /api/team-members and renders the row', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/team')
    await page.locator('[data-mol-id="team-invite-toggle"]').click()
    await page
      .locator('[data-mol-id="team-invite-email"]')
      .fill('teammate-' + Date.now() + '@example.com')
    await page.locator('[data-mol-id="team-invite-role"]').selectOption('viewer')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="team-invite-submit"]').click()
      await page.waitForTimeout(1500)
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/team-members(\b|\?|$)/.test(r.url))
    expect(post, 'POST /api/team-members should fire').toBeDefined()
    expect(post!.status).toBe(201)
    await expect(page.locator('[data-mol-id="team-list"]')).toBeVisible()
    const list = await apiFetch(page, 'GET', '/team-members')
    const arr = list.json as Array<{ role: string; status: string }>
    expect(arr.some((m) => m.role === 'viewer' && m.status === 'invited')).toBe(true)
  })

  test('invite-toggle reveals all required form fields', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/team')
    const toggle = page.locator('[data-mol-id="team-invite-toggle"]')
    await expect(toggle).toBeVisible()
    // Before click: form is collapsed.
    expect(await page.locator('[data-mol-id="team-invite-email"]').count()).toBe(0)
    await toggle.click()
    // After click: email + role + submit all visible.
    await expect(page.locator('[data-mol-id="team-invite-email"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="team-invite-role"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="team-invite-submit"]')).toBeVisible()
  })
})
