import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, listSchedules, listTeam, signup, uniqueEmail } from './_helpers.js'

test.describe('/schedules/:id', () => {
  test('renders the coverage calendar with day cells', async ({ page }) => {
    await signup(page, uniqueEmail('schdet-cal'))
    const schedules = await listSchedules(page)
    const target = schedules[0]!
    await page.goto(APP_BASE + `/schedules/${target.id}`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('h1').first()).toContainText(target.name)
    const days = page.locator('[data-mol-id^="coverage-day-"]')
    expect(await days.count()).toBeGreaterThanOrEqual(28)
  })

  test('rotation order editor lists members with reorder buttons', async ({ page }) => {
    await signup(page, uniqueEmail('schdet-order'))
    const schedules = await listSchedules(page)
    const target = schedules.find((s) => s.current_oncall) ?? schedules[0]!
    await page.goto(APP_BASE + `/schedules/${target.id}`)
    await page.waitForLoadState('networkidle')
    expect(await page.locator('[data-mol-id^="reorder-up-"]').count()).toBeGreaterThan(0)
    expect(await page.locator('[data-mol-id^="reorder-down-"]').count()).toBeGreaterThan(0)
  })

  test('adding a holiday override via the form shows an upcoming override shift', async ({
    page,
  }) => {
    await signup(page, uniqueEmail('schdet-override'))
    const schedules = await listSchedules(page)
    const target = schedules[0]!
    const team = await listTeam(page)
    const member = team.members[0] as { id: string; name: string } | undefined
    expect(member).toBeTruthy()
    const start = new Date(Date.now() + 9 * 24 * 60 * 60_000)
    const end = new Date(start.getTime() + 24 * 60 * 60_000)
    const fmt = (d: Date) => d.toISOString().slice(0, 10)
    await page.goto(APP_BASE + `/schedules/${target.id}`)
    await page.waitForLoadState('networkidle')
    await page.locator('[data-mol-id="override-member-select"]').selectOption(member!.id)
    await page.locator('[data-mol-id="override-start-input"]').fill(fmt(start))
    await page.locator('[data-mol-id="override-end-input"]').fill(fmt(end))
    await page.locator('[data-mol-id="override-submit"]').click()
    await expect(
      page.locator('[data-mol-id^="shift-"]', { hasText: 'override' }).first(),
    ).toBeVisible({ timeout: 15_000 })
  })
})
