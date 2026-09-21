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
    // Count ROWS (li), not every data-mol-id with the prefix — each row also
    // carries an action-item-advance-<id> button that the prefix would match.
    const rows = page.locator('li[data-mol-id^="action-item-"]')
    const before = await rows.count()
    const text = `E2E follow-up item ${Date.now()}`
    await page.locator('[data-mol-id="postmortem-new-item-input"]').fill(text)
    await page.locator('[data-mol-id="postmortem-new-item-submit"]').click()
    await expect.poll(async () => rows.count(), { timeout: 15_000 }).toBe(before + 1)
    await expect(rows.filter({ hasText: text }).first()).toBeVisible()
  })

  test('advancing an action item marks it done', async ({ page }) => {
    await signup(page, uniqueEmail('pmdet-advance'))
    const postmortems = await listPostmortems(page)
    const target = postmortems.find((p) => p.open_action_items > 0) ?? postmortems[0]!
    await page.goto(APP_BASE + `/postmortems/${target.id}`)
    await page.waitForLoadState('networkidle')
    // The advance control walks the legal state machine open -> in_progress ->
    // done, so a row that starts open needs two clicks. Done rows render a
    // disabled button — anchor on the FIRST actionable row's id so every
    // click/assert keeps targeting the same item as the list re-renders.
    const actionable = page
      .locator('li[data-mol-id^="action-item-"]', {
        has: page.locator('button[data-mol-id^="action-item-advance-"]:not([disabled])'),
      })
      .first()
    const rowId = await actionable.getAttribute('data-mol-id')
    expect(rowId, 'an actionable action-item row exists').toBeTruthy()
    const row = page.locator(`li[data-mol-id="${rowId}"]`)
    const advance = row.locator('button[data-mol-id^="action-item-advance-"]')
    await expect(advance).toBeVisible()
    for (let step = 0; step < 2; step++) {
      await advance.click()
      if ((await row.innerText()).toLowerCase().includes('done')) break
      // Wait for the status write to re-render before deciding to click again.
      await expect(row).toContainText(/in progress|done/, { timeout: 10_000 })
    }
    await expect(row).toContainText('done')
  })
})
