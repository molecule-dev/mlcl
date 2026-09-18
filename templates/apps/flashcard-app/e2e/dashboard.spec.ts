import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
  })

  test('loads three reports endpoints on mount', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/dashboard')
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    })
    const decks = reqs.find((r) => /\/api\/decks(\?|$)/.test(r.url) && r.method === 'GET')
    const today = reqs.find((r) => /\/api\/reports\/today/.test(r.url) && r.method === 'GET')
    const overview = reqs.find((r) => /\/api\/reports\/overview/.test(r.url) && r.method === 'GET')
    expect(decks, 'GET /api/decks should fire on dashboard').toBeTruthy()
    expect(today, 'GET /api/reports/today should fire on dashboard').toBeTruthy()
    expect(overview, 'GET /api/reports/overview should fire on dashboard').toBeTruthy()
    expect(decks!.status).toBeLessThan(300)
    expect(today!.status).toBeLessThan(300)
    expect(overview!.status).toBeLessThan(300)
  })

  test('sidebar Decks link navigates to /decks', async ({ page }) => {
    await page
      .getByRole('link', { name: /^Decks$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/decks$/)
  })

  test('sidebar Stats link navigates to /stats', async ({ page }) => {
    await page
      .getByRole('link', { name: /^Stats$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/stats/)
  })

  test('sidebar Notifications link navigates to /notifications', async ({ page }) => {
    await page
      .getByRole('link', { name: /^Notifications$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/notifications/)
  })

  test('sidebar Settings link navigates to /settings', async ({ page }) => {
    await page
      .getByRole('link', { name: /^Settings$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/settings/)
  })

  test('user menu reveals a Sign out button that lands on /', async ({ page }) => {
    const userMenu = page.getByRole('button', { name: /Open user menu|menu|account/i }).first()
    await userMenu.click()
    const out = page.getByRole('button', { name: /Sign\s*out|Log\s*out/i }).first()
    await expect(out).toBeVisible({ timeout: 5000 })
    await out.click()
    await expect(page).toHaveURL(/\/(login|signin|$)/, { timeout: 15_000 })
  })

  test('Sign out fires no 404s — auth client must not call missing /auth/logout', async ({
    page,
  }) => {
    const four04s: string[] = []
    page.on('response', (res) => {
      if (res.status() === 404 && /\/api\//.test(res.url())) four04s.push(res.url())
    })
    const userMenu = page.getByRole('button', { name: /Open user menu|menu|account/i }).first()
    await userMenu.click()
    const out = page.getByRole('button', { name: /Sign\s*out|Log\s*out/i }).first()
    await out.click()
    await expect(page).toHaveURL(/\/(login|signin|$)/, { timeout: 15_000 })
    await page.waitForTimeout(500)
    expect(four04s, `unexpected 404s during sign out: ${four04s.join(', ')}`).toEqual([])
  })

  test('Today hero card or empty-state appears after load', async ({ page }) => {
    // After successful load, either a TodayHeroCard, the "Decks waiting on you" heading, or the empty hint render.
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    const dueHeading = page
      .getByRole('heading', { name: /Decks waiting on you|Already mastered|Cards due now/i })
      .first()
    const emptyHint = page.getByText(/Nothing due\.|Pick any deck below/i).first()
    const visible =
      (await dueHeading.isVisible().catch(() => false)) ||
      (await emptyHint.isVisible().catch(() => false))
    expect(visible, 'dashboard should render either due-decks heading or empty-state').toBeTruthy()
  })
})
