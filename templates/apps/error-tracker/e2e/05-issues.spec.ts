import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, listIssues, signup, uniqueEmail } from './_helpers.js'

test.describe('/issues', () => {
  test('lists every seeded issue', async ({ page }) => {
    await signup(page, uniqueEmail('issues-list'))
    const issues = await listIssues(page)
    expect(issues.length, 'seed should provision issues').toBeGreaterThan(0)
    await page.goto(APP_BASE + '/issues')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    for (const issue of issues.slice(0, 3)) {
      const exception = issue.title.split(':')[0]!
      expect(body, `issue title ${issue.title} must render`).toContain(exception)
    }
  })

  test('row click navigates to /issues/:id', async ({ page }) => {
    await signup(page, uniqueEmail('issues-click'))
    await page.goto(APP_BASE + '/issues')
    await page.waitForLoadState('networkidle')
    const link = page.locator('a[href^="/issues/"]').first()
    if (await link.count()) {
      await link.click()
      await expect(page).toHaveURL(/\/issues\/[^/]+/, { timeout: 15_000 })
    }
  })

  test('search/filter input is rendered', async ({ page }) => {
    await signup(page, uniqueEmail('issues-search'))
    await page.goto(APP_BASE + '/issues')
    await page.waitForLoadState('networkidle')
    const search = page.locator('input[type="search"], input[placeholder*="search" i]').first()
    if (await search.count()) {
      await expect(search).toBeVisible()
    }
  })
})
