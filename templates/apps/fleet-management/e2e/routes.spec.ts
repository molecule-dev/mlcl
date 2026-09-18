import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup, waitForSeed } from './_helpers.js'

async function gotoRoutes(page: import('@playwright/test').Page) {
  await page.goto(APP_BASE + '/routes')
  await expect(page.getByRole('heading', { name: /^routes$/i, level: 1 })).toBeVisible({
    timeout: 15000,
  })
  // Wait until the loading state clears (data fetched). This guarantees
  // captureNetwork sees the GET /api/routes response, not just the
  // faster parallel /vehicles + /drivers calls.
  await expect(page.getByText(/^loading…$/i)).toHaveCount(0, { timeout: 15000 })
}

test.describe('routes (dispatch)', () => {
  test('list page renders seeded routes and shows non-zero count under default Active filter', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const reqs = await captureNetwork(page, async () => {
      await gotoRoutes(page)
    })
    const routesReq = reqs.find((r) => /\/api\/routes(\?|$)/.test(r.url) && r.method === 'GET')
    expect(routesReq?.status, 'GET /api/routes').toBe(200)
    const vehiclesReq = reqs.find((r) => /\/api\/vehicles(\?|$)/.test(r.url) && r.method === 'GET')
    expect(vehiclesReq?.status, 'GET /api/vehicles (parallel)').toBe(200)
    const driversReq = reqs.find((r) => /\/api\/drivers(\?|$)/.test(r.url) && r.method === 'GET')
    expect(driversReq?.status, 'GET /api/drivers (parallel)').toBe(200)
    // Default filter is "Active"; must show at least one route after the seed
    // (guards the API in_progress → FE active mapping in handlers/_shape.ts).
    const subheader = page.getByText(/^\d+ routes$/i)
    await expect(subheader).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/^loading…$/i)).toHaveCount(0, { timeout: 15000 })
    const text = (await subheader.textContent()) ?? ''
    const visibleCount = Number((text.match(/(\d+)/) ?? ['0', '0'])[1])
    expect(visibleCount, '"Active" routes after seed').toBeGreaterThanOrEqual(1)
  })

  test('page heading "Routes" renders', async ({ page }) => {
    await signup(page)
    await gotoRoutes(page)
    await expect(page.getByRole('heading', { name: /^routes$/i, level: 1 })).toBeVisible()
  })

  test('"N routes" subheader renders', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoRoutes(page)
    await expect(page.getByText(/^\d+ routes$/i)).toBeVisible({ timeout: 10000 })
  })

  test('Filter navigation landmark is present', async ({ page }) => {
    await signup(page)
    await gotoRoutes(page)
    await expect(page.getByRole('navigation', { name: /filter routes/i })).toBeVisible()
  })

  test('"Active" is the default filter (aria-pressed=true)', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoRoutes(page)
    await expect(page.getByRole('button', { name: /^active$/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  test('"Planned" filter switches view', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoRoutes(page)
    await page.getByRole('button', { name: /^planned$/i }).click()
    await expect(page.getByRole('button', { name: /^planned$/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  test('"Completed" filter switches view', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoRoutes(page)
    await page.getByRole('button', { name: /^completed$/i }).click()
    await expect(page.getByRole('button', { name: /^completed$/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  test('"Deviated" filter switches view', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoRoutes(page)
    await page.getByRole('button', { name: /^deviated$/i }).click()
    await expect(page.getByRole('button', { name: /^deviated$/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  test('"All" filter shows the full list', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoRoutes(page)
    await page.getByRole('button', { name: /^all$/i }).click()
    const article = page.getByRole('article').first()
    await expect(article).toBeVisible({ timeout: 10000 })
  })

  test('Map overlay caption "N active dispatches · live" renders', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoRoutes(page)
    const body = (await page.locator('main').textContent()) ?? ''
    expect(body).toMatch(/active dispatches · live/i)
  })

  test('first route card displays origin → destination text (non-empty)', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoRoutes(page)
    await page.getByRole('button', { name: /^all$/i }).click()
    const article = page.getByRole('article').first()
    await expect(article).toBeVisible({ timeout: 10000 })
    const txt = (await article.textContent()) ?? ''
    expect(txt, 'route card text').toMatch(/.+ → .+/)
  })

  test('first route card status chip is one of {active, planned, completed, deviated}', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoRoutes(page)
    await page.getByRole('button', { name: /^all$/i }).click()
    const article = page.getByRole('article').first()
    const txt = (await article.textContent()) ?? ''
    expect(txt).toMatch(/active|planned|completed|deviated/i)
    expect(txt).not.toMatch(/in_progress/i)
  })

  test('"+ New dispatch" creates a route that survives page reload', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoRoutes(page)

    const name = `E2E Route ${Date.now() % 100000}`
    await page.getByRole('button', { name: /\+ new dispatch/i }).click()
    await page.getByLabel(/route name/i).fill(name)
    await page.getByRole('button', { name: /^dispatch$/i }).click()
    await page.getByRole('button', { name: /^all$/i }).click()
    await expect(page.getByText(name)).toBeVisible({ timeout: 10000 })
    await page.reload()
    await page.getByRole('button', { name: /^all$/i }).click()
    await expect(page.getByText(name)).toBeVisible({ timeout: 10000 })
  })
})
