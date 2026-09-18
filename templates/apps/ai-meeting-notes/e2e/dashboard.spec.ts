import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('dashboard page', () => {
  test('welcome heading is visible', async ({ page }) => {
    await signup(page, uniqueEmail('dash-h'), 'TestPass123!')
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByRole('heading', { name: /welcome back/i }).first()).toBeVisible()
  })

  test('"your meeting feed" eyebrow is rendered', async ({ page }) => {
    await signup(page, uniqueEmail('dash-eye'), 'TestPass123!')
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByText(/your meeting feed/i).first()).toBeVisible()
  })

  test('Record meeting hero CTA navigates to /record', async ({ page }) => {
    await signup(page, uniqueEmail('dash-rec'), 'TestPass123!')
    await page.goto(APP_BASE + '/dashboard')
    await page
      .getByRole('link', { name: /record meeting/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/record/)
  })

  test('View calendar link navigates to /calendar', async ({ page }) => {
    await signup(page, uniqueEmail('dash-cal'), 'TestPass123!')
    await page.goto(APP_BASE + '/dashboard')
    await page
      .getByRole('link', { name: /view calendar/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/calendar/)
  })

  test('Recent meetings section heading is visible', async ({ page }) => {
    await signup(page, uniqueEmail('dash-recent'), 'TestPass123!')
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByRole('heading', { name: /recent meetings/i }).first()).toBeVisible()
  })

  test('empty-state mic icon is shown for fresh users', async ({ page }) => {
    await signup(page, uniqueEmail('dash-empty'), 'TestPass123!')
    await page.goto(APP_BASE + '/dashboard')
    await expect(
      page.locator('.material-symbols-outlined', { hasText: /^mic_none$/ }).first(),
    ).toBeVisible({
      timeout: 5_000,
    })
  })

  test('empty-state Start recording CTA navigates to /record', async ({ page }) => {
    await signup(page, uniqueEmail('dash-start'), 'TestPass123!')
    await page.goto(APP_BASE + '/dashboard')
    await page
      .getByRole('link', { name: /start recording/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/record/)
  })

  test('GET /api/meetings fires on dashboard load', async ({ page }) => {
    await signup(page, uniqueEmail('dash-net'), 'TestPass123!')
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/dashboard')
      await page.waitForLoadState('networkidle')
    })
    const getCall = reqs.find((r) => /\/api\/meetings(\?|$)/.test(r.url) && r.method === 'GET')
    expect(getCall, 'GET /api/meetings must fire on dashboard').toBeTruthy()
    expect([200, 201]).toContain(getCall!.status)
  })

  test('sidebar nav-dashboard chrome is rendered', async ({ page }) => {
    await signup(page, uniqueEmail('dash-nav'), 'TestPass123!')
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.locator('[data-mol-id="nav-dashboard"]').first()).toBeVisible()
  })
})
