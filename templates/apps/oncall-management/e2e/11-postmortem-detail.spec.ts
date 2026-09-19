import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, listPostmortems, signup, uniqueEmail } from './_helpers.js'

test.describe('/postmortems/:id', () => {
  test('renders summary, factors and action items with statuses', async ({ page }) => {
    await signup(page, uniqueEmail('pmdet-render'))
    const postmortems = await listPostmortems(page)
    const target = postmortems.find((p) => p.open_action_items > 0) ?? postmortems[0]!
    await page.goto(APP_BASE + `/postmortems/${target.id}`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { level: 1 }).first()).toContainText(target.title)
    await expect(page.locator('[data-mol-id="postmortem-summary-input"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="postmortem-factors-input"]')).toBeVisible()
    expect(await page.locator('[data-mol-id^="action-item-"]').count()).toBeGreaterThan(0)
  })

  test('adding an action item appends a row', async ({ page }) => {
    await signup(page, uniqueEmail('pmdet-add'))
    const postmortems = await listPostmortems(page)
    const target = postmortems[0]!
    await page.goto(APP_BASE + `/postmortems/${target.id}`)
    await page.waitForLoadState('networkidle')
    const before = await page.locator('[data-mol-id^="action-item-"]').count()
    const text = `E2E follow-up item ${Date.now()}`
    await page.locator('[data-mol-id="postmortem-new-item-input"]').fill(text)
    await page.locator('[data-mol-id="postmortem-new-item-submit"]').click()
    await expect
      .poll(async () => page.locator('[data-mol-id^="action-item-"]').count(), {
        timeout: 15_000,
      })
      .toBe(before + 1)
    await expect(
      page.locator('[data-mol-id^="action-item-"]', { hasText: text }).first(),
    ).toBeVisible()
  })

  test('advancing an action item marks it done', async ({ page }) => {
    await signup(page, uniqueEmail('pmdet-advance'))
    const postmortems = await listPostmortems(page)
    const target = postmortems.find((p) => p.open_action_items > 0) ?? postmortems[0]!
    await page.goto(APP_BASE + `/postmortems/${target.id}`)
    await page.waitForLoadState('networkidle')
    const advance = page.locator('[data-mol-id^="action-item-advance-"]').first()
    await advance.click()
    await expect(
      page.locator('[data-mol-id^="action-item-"]', { hasText: 'done' }).first(),
    ).toBeVisible({ timeout: 15_000 })
  })
})
