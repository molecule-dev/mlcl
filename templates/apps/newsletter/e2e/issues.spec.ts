/**
 * /issues — the creator's issue list: drafts + scheduled + published rows,
 * status filters, and per-row actions.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, seedIssue, signup, uniqueEmail } from './_helpers.js'

test.describe('issues list', () => {
  test('requires auth (redirects anonymous visitors)', async ({ page }) => {
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/issues')
    await expect(page).not.toHaveURL(/\/issues$/, { timeout: 15000 })
  })

  test('lists a freshly created draft with its status chip', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('issues-list'))
    const { id, subject } = await seedIssue(page, accessToken, { status: 'draft' })
    await page.goto(APP_BASE + '/issues')
    const row = page.locator(`[data-mol-id="issue-row-${id}"]`)
    await expect(row).toBeVisible({ timeout: 15000 })
    await expect(row.getByText(subject)).toBeVisible()
    await expect(page.locator(`[data-mol-id="issue-status-${id}"]`)).toHaveText(/draft/i)
  })

  test('filter tabs narrow the list', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('issues-filter'))
    const draft = await seedIssue(page, accessToken, { status: 'draft' })
    await seedIssue(page, accessToken, { status: 'published' })
    await page.goto(APP_BASE + '/issues')
    await page.locator('[data-mol-id="issues-filter-draft"]').click()
    await expect(page.locator(`[data-mol-id="issue-row-${draft.id}"]`)).toBeVisible({
      timeout: 15000,
    })
    await page.locator('[data-mol-id="issues-filter-published"]').click()
    await expect(page.locator(`[data-mol-id="issue-row-${draft.id}"]`)).toHaveCount(0, {
      timeout: 15000,
    })
    await expect(page.locator('[data-mol-id^="issue-row-"]').first()).toBeVisible()
  })

  test('delete removes the row', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('issues-delete'))
    const { id } = await seedIssue(page, accessToken, { status: 'draft' })
    await page.goto(APP_BASE + '/issues')
    await page.locator(`[data-mol-id="issue-delete-${id}"]`).click()
    await expect(page.locator(`[data-mol-id="issue-row-${id}"]`)).toHaveCount(0, {
      timeout: 15000,
    })
  })
})
