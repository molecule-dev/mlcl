import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/plan-updated', () => {
  test('Authed user lands on the page and sees the thank-you heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 })
  })

  test('No raw {{i18nKey}} placeholder is rendered', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    const text = await page.locator('body').innerText()
    expect(text).not.toMatch(/\{\{[a-zA-Z]/)
  })

  test('Return-home button is visible inside a link to /', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    const link = page.locator('a[href="/"]').filter({ has: page.getByRole('button') })
    await expect(link.first()).toBeVisible({ timeout: 10_000 })
  })

  test('Clicking the return-home link navigates to / (Landing)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    const link = page
      .locator('a[href="/"]')
      .filter({ has: page.getByRole('button') })
      .first()
    await link.click()
    await expect(page).toHaveURL(/\/$/, { timeout: 10_000 })
  })

  test('Page is a static landing — NO /api/* XHR fires (captureNetwork invariant)', async ({
    page,
  }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/plan-updated')
      await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 })
      await page.waitForTimeout(1500)
    })
    // [M1-1] The framework-level session-restore probe (GET /api/users/me) legitimately
    // fires for an authed user on any full page load — it restores the in-memory session
    // from the httpOnly cookie and is not a page-level data fetch. The invariant we assert
    // is that the PlanUpdated page itself fetches no app data.
    const apiHits = reqs.filter(
      (r) =>
        /\/api\//.test(r.url) && !/\/api\/health/.test(r.url) && !/\/api\/users\/me/.test(r.url),
    )
    expect(
      apiHits,
      'PlanUpdated page must not fire any app-data /api/* XHR — it is a static landing',
    ).toEqual([])
  })
})
