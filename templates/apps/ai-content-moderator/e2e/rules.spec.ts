/**
 * /rules — automation rule builder. Asserts CRUD round-trips: publish
 * a rule via the form, GET /api/rules returns it; toggle enabled,
 * GET reflects the new value; delete, GET no longer includes it.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedRule, signup } from './_helpers.js'

test.describe('rules page', () => {
  test('renders the heading and the publish/test buttons', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/rules')
    await expect(page.getByRole('button', { name: /publish rule/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /test/i }).first()).toBeVisible()
  })

  test('publishing a rule via the form persists it (read-after-write)', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/rules')

    // The first text input on the form is the rule name input — overwrite
    // the seeded "High-quality contributor fast-pass" default with a unique label.
    const ruleName = `E2E rule ${Date.now()}`
    await page.locator('input[type="text"]').first().fill(ruleName)

    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /publish rule/i }).click()
      await page.waitForTimeout(800)
    })
    const post = reqs.find((r) => /\/api\/rules$/.test(r.url) && r.method === 'POST')
    expect(post?.status, JSON.stringify(reqs)).toBe(201)

    // Read-after-write: GET /api/rules returns it.
    const list = await page.request.get(`${APP_BASE.replace(/\/$/, '')}/api/rules`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const rows: Array<{ name: string }> = await list.json()
    expect(
      rows.some((r) => r.name === ruleName),
      JSON.stringify(rows),
    ).toBe(true)
  })

  test('Test button calls /api/moderation/stats/summary and shows feedback', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/rules')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /^test/i }).first().click()
      await page.waitForTimeout(600)
    })
    const summary = reqs.find(
      (r) => /\/api\/moderation\/stats\/summary/.test(r.url) && r.status === 200,
    )
    expect(summary).toBeTruthy()
  })

  test('toggling enabled flips on the server (PUT /api/rules/:id)', async ({ page }) => {
    const { accessToken } = await signup(page)
    const rule = await seedRule(page, accessToken, `Toggle ${Date.now()}`)
    await page.goto(APP_BASE + '/rules')
    await expect(page.locator(`text=${rule.name}`).first()).toBeVisible({ timeout: 10000 })

    // The toggle button has aria-label "Toggle rule"; click it on this row.
    const row = page.locator(`[data-mol-id="rule-card-${rule.id}"]`)
    await row.getByRole('button', { name: /toggle rule/i }).click()
    await page.waitForTimeout(600)
    const r = await page.request.get(`${APP_BASE.replace(/\/$/, '')}/api/rules/${rule.id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const body = await r.json()
    expect(body.enabled).toBe(false)
  })

  test('delete removes the rule (DELETE + GET reflects it)', async ({ page }) => {
    const { accessToken } = await signup(page)
    const rule = await seedRule(page, accessToken, `Delete ${Date.now()}`)
    await page.goto(APP_BASE + '/rules')
    await expect(page.locator(`text=${rule.name}`).first()).toBeVisible({ timeout: 10000 })

    const row = page.locator(`[data-mol-id="rule-card-${rule.id}"]`)
    // Destructive confirm: the first click arms the button (aria-label
    // flips to "Click again…"), the second click deletes.
    await row.locator('[data-mol-id="delete-rule"]').click()
    await expect(row.getByRole('button', { name: /click again/i })).toBeVisible()
    await row.locator('[data-mol-id="delete-rule"]').click()
    await page.waitForTimeout(600)

    const list = await page.request.get(`${APP_BASE.replace(/\/$/, '')}/api/rules`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const rows: Array<{ id: string }> = await list.json()
    expect(
      rows.some((r) => r.id === rule.id),
      `${rule.id} should be gone`,
    ).toBe(false)
  })
})
