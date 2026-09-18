import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, listAlertRules, signup } from './_helpers.js'

test.describe('Create alert rule /alerts/rules/new', () => {
  test('creating a rule persists it in /api/alerts/rules/list', async ({ page }) => {
    const { accessToken } = await signup(page)
    const before = await listAlertRules(page, accessToken)

    await page.goto(APP_BASE + '/alerts/rules/new')
    const ruleName = 'E2E rule ' + Date.now()
    await page.locator('input[type="text"]').first().fill(ruleName)
    // Default type=high_usage, comparison=above. Threshold is the only
    // required numeric input — replace the default value.
    const thresholdInput = page.locator('input[type="number"]').first()
    await thresholdInput.fill('15.5')

    const reqs = await captureNetwork(page, async () => {
      await page.locator('form button[type="submit"]').first().click()
      await expect(page).toHaveURL(/\/alerts$/, { timeout: 10000 })
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/alerts\/rules(\?|$)/.test(r.url))
    expect(post, 'expected POST /api/alerts/rules').toBeTruthy()
    expect(post!.status).toBeLessThan(300)

    const after = await listAlertRules(page, accessToken)
    expect(after.length).toBe(before.length + 1)
    const created = after.find((r) => r.name === ruleName)
    expect(created, `${ruleName} should be in /api/alerts/rules/list`).toBeTruthy()
    expect(created!.enabled).toBe(true)
    expect(Number(created!.threshold)).toBeCloseTo(15.5, 4)
  })

  test('selecting Email channel reveals an email input', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/alerts/rules/new')
    // Email button is one of the channel toggles. Already on by default in
    // current implementation — clicking it twice should leave it on.
    const emailToggle = page.getByRole('button', { name: /^email$/i, pressed: true })
    if (await emailToggle.count().catch(() => 0)) {
      // already pressed — ensure email input visible
    } else {
      await page
        .getByRole('button', { name: /^email$/i })
        .first()
        .click()
    }
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
  })

  test('Cancel returns to /alerts without creating a rule', async ({ page }) => {
    const { accessToken } = await signup(page)
    const before = await listAlertRules(page, accessToken)
    await page.goto(APP_BASE + '/alerts/rules/new')
    await page
      .getByRole('button', { name: /cancel/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/alerts$/)
    const after = await listAlertRules(page, accessToken)
    expect(after.length).toBe(before.length)
  })
})
