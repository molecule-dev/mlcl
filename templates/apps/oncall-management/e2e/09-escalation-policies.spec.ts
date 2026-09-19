import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, listPolicies, signup, uniqueEmail } from './_helpers.js'

test.describe('/escalation-policies', () => {
  test('anonymous redirected off /escalation-policies', async ({ page }) => {
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/escalation-policies')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/login|\/signup|\/$/, { timeout: 15_000 })
  })

  test('renders each seeded policy as an ordered rule ladder', async ({ page }) => {
    await signup(page, uniqueEmail('pol-list'))
    const policies = await listPolicies(page)
    expect(policies.length).toBeGreaterThan(0)
    await page.goto(APP_BASE + '/escalation-policies')
    await page.waitForLoadState('networkidle')
    for (const p of policies.slice(0, 2)) {
      const card = page.locator(`[data-mol-id="policy-card-${p.id}"]`)
      await expect(card).toBeVisible()
      expect(await card.locator('ol > li').count()).toBe(p.rules.length)
    }
  })

  test('creating a policy via the form renders a new ladder', async ({ page }) => {
    await signup(page, uniqueEmail('pol-create'))
    await page.goto(APP_BASE + '/escalation-policies')
    await page.waitForLoadState('networkidle')
    const before = await listPolicies(page)
    const name = `E2E ladder ${Date.now()}`
    await page.locator('[data-mol-id="policy-name-input"]').fill(name)
    await page.locator('[data-mol-id="policy-rule-member-0"]').selectOption({
      index: 1,
    })
    await page.locator('[data-mol-id="policy-create-submit"]').click()
    await expect
      .poll(async () => (await listPolicies(page)).length, { timeout: 15_000 })
      .toBe(before.length + 1)
    const after = await listPolicies(page)
    const created = after.find((p) => p.name === name)
    expect(created).toBeTruthy()
    expect(created!.rules.length).toBe(1)
    await expect(page.locator(`[data-mol-id="policy-card-${created!.id}"]`)).toBeVisible()
  })

  test('rule rows show the wait-minutes semantics', async ({ page }) => {
    await signup(page, uniqueEmail('pol-wait'))
    await page.goto(APP_BASE + '/escalation-policies')
    await page.waitForLoadState('networkidle')
    expect(await page.locator('text=page immediately').count()).toBeGreaterThan(0)
  })
})
