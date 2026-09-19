import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, listSchedules, signup, uniqueEmail } from './_helpers.js'

test.describe('/schedules', () => {
  test('anonymous redirected off /schedules', async ({ page }) => {
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/schedules')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/login|\/signup|\/$/, { timeout: 15_000 })
  })

  test('renders one card per seeded schedule with current on-call', async ({ page }) => {
    await signup(page, uniqueEmail('sch-list'))
    const schedules = await listSchedules(page)
    expect(schedules.length).toBeGreaterThan(0)
    await page.goto(APP_BASE + '/schedules')
    await page.waitForLoadState('networkidle')
    for (const s of schedules.slice(0, 3)) {
      const card = page.locator(`[data-mol-id="schedule-card-${s.id}"]`)
      await expect(card).toBeVisible()
      if (s.current_oncall) {
        await expect(card).toContainText(s.current_oncall.name)
      }
    }
  })

  test('create form exists with cadence + handoff + member picker', async ({ page }) => {
    await signup(page, uniqueEmail('sch-form'))
    await page.goto(APP_BASE + '/schedules')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-mol-id="schedule-name-input"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="schedule-cadence-select"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="schedule-handoff-input"]')).toBeVisible()
    expect(await page.locator('[data-mol-id^="schedule-member-"]').count()).toBeGreaterThan(0)
  })

  test('creating a schedule through the form adds a card', async ({ page }) => {
    await signup(page, uniqueEmail('sch-create'))
    await page.goto(APP_BASE + '/schedules')
    await page.waitForLoadState('networkidle')
    const before = await listSchedules(page)
    const name = `E2E rotation ${Date.now()}`
    await page.locator('[data-mol-id="schedule-name-input"]').fill(name)
    await page.locator('[data-mol-id^="schedule-member-"]').first().click()
    await page.locator('[data-mol-id="schedule-create-submit"]').click()
    await expect
      .poll(async () => (await listSchedules(page)).length, { timeout: 15_000 })
      .toBe(before.length + 1)
    const after = await listSchedules(page)
    expect(after.some((s) => s.name === name)).toBe(true)
    await expect(
      page.locator('[data-mol-id^="schedule-card-"]').filter({ hasText: name }),
    ).toBeVisible()
  })
})
