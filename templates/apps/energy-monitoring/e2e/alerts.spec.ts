import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  captureNetwork,
  evalAlerts,
  listAlertRules,
  listAlerts,
  signup,
} from './_helpers.js'

test.describe('Alerts /alerts', () => {
  test('seeded alert rules render and at least one shows enabled', async ({ page }) => {
    const { accessToken } = await signup(page)
    const rules = await listAlertRules(page, accessToken)
    expect(rules.length).toBeGreaterThanOrEqual(2)
    expect(rules.some((r) => r.enabled)).toBe(true)

    await page.goto(APP_BASE + '/alerts')
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    await expect(page.locator('[data-mol-id="alerts-rules"]')).toBeVisible()
    // At least one of the seeded rules should show by name.
    const r0 = rules[0]
    await expect(
      page.locator('[data-mol-id="alerts-rules"]').getByText(r0.name, { exact: false }),
    ).toBeVisible()
  })

  test('Run check creates an alert (read-after-write via /api/alerts)', async ({ page }) => {
    const { accessToken } = await signup(page)
    // Sanity: starting state has zero open alerts (seed creates rules, not alerts).
    const before = await listAlerts(page, accessToken)
    expect(before.length).toBe(0)

    await page.goto(APP_BASE + '/alerts')
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})

    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="alerts-run-check"]').first().click()
      await page.waitForTimeout(2500)
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/alerts\/check/.test(r.url))
    expect(post, 'expected POST /api/alerts/check').toBeTruthy()
    expect(post!.status).toBeLessThan(300)

    const after = await listAlerts(page, accessToken)
    expect(after.length).toBeGreaterThan(0)
    expect(after[0].message).toMatch(/threshold|crossed|usage/i)
  })

  test('toggle rule flips its `enabled` field', async ({ page }) => {
    const { accessToken } = await signup(page)
    const rulesBefore = await listAlertRules(page, accessToken)
    const target = rulesBefore[0]
    const wasEnabled = target.enabled

    await page.goto(APP_BASE + '/alerts')
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    await page.locator(`[data-mol-id="alerts-rule-toggle-${target.id}"]`).first().click()
    await page.waitForTimeout(1500)

    const rulesAfter = await listAlertRules(page, accessToken)
    const updated = rulesAfter.find((r) => r.id === target.id)!
    expect(updated.enabled, 'rule.enabled should have flipped').toBe(!wasEnabled)
  })

  test('delete rule removes it from /api/alerts/rules/list', async ({ page }) => {
    const { accessToken } = await signup(page)
    const rulesBefore = await listAlertRules(page, accessToken)
    const target = rulesBefore[rulesBefore.length - 1] // last one for stability

    await page.goto(APP_BASE + '/alerts')
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    page.once('dialog', (d) => d.accept())
    // Destructive delete is two-click: first click arms ("Confirm delete"),
    // second click commits. A stray first click must NOT delete.
    const deleteBtn = page.locator(`[data-mol-id="alerts-rule-delete-${target.id}"]`).first()
    await deleteBtn.click()
    await expect(deleteBtn).toContainText(/confirm/i)
    await deleteBtn.click()
    await page.waitForTimeout(1500)

    const rulesAfter = await listAlertRules(page, accessToken)
    expect(rulesAfter.find((r) => r.id === target.id)).toBeUndefined()
  })

  test('acknowledge an alert via UI updates its status to "acknowledged"', async ({ page }) => {
    const { accessToken } = await signup(page)
    // Ensure at least one alert exists.
    await evalAlerts(page, accessToken)
    const list = await listAlerts(page, accessToken)
    expect(list.length).toBeGreaterThan(0)
    const target = list[0]

    await page.goto(APP_BASE + '/alerts')
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})

    // Each AlertCard exposes a stable `alert-ack-<id>` button that drives
    // POST /api/alerts/:id/acknowledge. Use that to invoke the action,
    // then verify the underlying row's status flipped via the list API.
    await expect(page.locator(`[data-mol-id="alert-card-${target.id}"]`)).toBeVisible()
    await page.locator(`[data-mol-id="alert-ack-${target.id}"]`).first().click()
    await page.waitForTimeout(1500)

    const after = await listAlerts(page, accessToken)
    const updated = after.find((a) => a.id === target.id)!
    expect(updated, 'acknowledged alert should still appear in list').toBeTruthy()
    expect(updated.status).toBe('acknowledged')
  })

  test('"+ New rule" CTA navigates to /alerts/rules/new', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/alerts')
    await page
      .getByRole('link', { name: /new rule|create rule|add rule/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/alerts\/rules\/new$/)
  })
})
