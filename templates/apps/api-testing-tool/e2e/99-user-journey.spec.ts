import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, login, signup, uniqueEmail } from './_helpers.js'

test.describe('cross-page user journey', () => {
  test('signup → workspace send → history → collections → environments → mocks → monitors → tests → settings → logout → login', async ({
    page,
  }) => {
    test.setTimeout(180_000)
    const email = uniqueEmail('journey')
    const { password } = await signup(page, email)

    // After signup we should land on /workspace.
    await expect(page).toHaveURL(/\/workspace/)
    await expect(page.getByRole('heading', { name: /^Workspace$/i, level: 1 })).toBeVisible()

    // Step 1 — fire a real request from the workspace.
    await page.locator('[data-mol-id="workspace-url"]').fill('https://httpbin.org/get')
    await page.locator('[data-mol-id="workspace-send"]').click()
    await page.locator('[data-mol-id="workspace-status-message"]').waitFor({ timeout: 30_000 })

    // Step 2 — history must contain at least one row now.
    await page.goto(APP_BASE + '/history')
    await expect(page.getByRole('heading', { name: /^Run history$/i, level: 1 })).toBeVisible()
    const { status: histStatus, body: histBody } = await apiRequest<unknown[]>(
      page,
      'GET',
      '/api/history?limit=5',
    )
    expect(histStatus).toBe(200)
    expect(
      Array.isArray(histBody) ? histBody.length : 0,
      'a history row must exist after sending one request',
    ).toBeGreaterThan(0)

    // Step 3 — create a collection and verify the count grew.
    const beforeCols = await apiRequest<unknown[]>(page, 'GET', '/api/collections')
    const beforeCount = Array.isArray(beforeCols.body) ? beforeCols.body.length : 0
    await page.goto(APP_BASE + '/collections')
    await page.getByRole('button', { name: /New collection/i }).click()
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    const afterCols = await apiRequest<unknown[]>(page, 'GET', '/api/collections')
    const afterCount = Array.isArray(afterCols.body) ? afterCols.body.length : 0
    expect(afterCount, 'collections count must grow').toBe(beforeCount + 1)

    // Step 4 — environments page renders.
    await page.goto(APP_BASE + '/environments')
    await expect(page.getByRole('heading', { name: /^Environments$/i, level: 1 })).toBeVisible()

    // Step 5 — mocks page renders.
    await page.goto(APP_BASE + '/mocks')
    await expect(page.getByRole('heading', { name: /^Mock servers$/i, level: 1 })).toBeVisible()

    // Step 6 — monitors page renders.
    await page.goto(APP_BASE + '/monitors')
    await expect(page.getByRole('heading', { name: /^Monitors$/i, level: 1 })).toBeVisible()

    // Step 7 — tests page renders.
    await page.goto(APP_BASE + '/tests')
    await expect(page.getByRole('heading', { name: /^Test runner$/i, level: 1 })).toBeVisible()

    // Step 8 — settings page renders.
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByRole('heading', { name: /^Settings$/i, level: 1 })).toBeVisible()

    // Step 9 — sign out by clearing the auth cookie, then log back in.
    await page.context().clearCookies()
    await login(page, email, password)
    expect(page.url()).not.toMatch(/\/login/)
  })
})
