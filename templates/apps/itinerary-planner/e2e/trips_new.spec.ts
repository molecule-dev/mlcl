import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup } from './_helpers'

test.describe('/trips/new', () => {
  test('renders the planner form with all required inputs', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/trips/new')
    await expect(page.locator('[data-testid="trip-planner-destination"]')).toBeVisible()
    await expect(page.locator('[data-testid="trip-planner-start"]')).toBeVisible()
    await expect(page.locator('[data-testid="trip-planner-end"]')).toBeVisible()
    await expect(page.locator('[data-testid="trip-planner-submit"]')).toBeVisible()
  })

  test('Submit POSTs /api/trips and navigates to /trips/:id', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/trips/new')
    await page.locator('[data-testid="trip-planner-destination"]').fill('Reykjavik & the Ring Road')
    await page.locator('[data-testid="trip-planner-country"]').fill('Iceland')
    await page.locator('[data-testid="trip-planner-start"]').fill('2026-06-12')
    await page.locator('[data-testid="trip-planner-end"]').fill('2026-06-22')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-testid="trip-planner-submit"]').click()
      await page.waitForURL(/\/trips\/[0-9a-f-]+$/, { timeout: 15_000 })
    })
    const tripPost = reqs.find((r) => r.method === 'POST' && /\/api\/trips(\?|$)/.test(r.url))
    expect(tripPost, 'POST /api/trips must fire').toBeDefined()
    expect(tripPost!.status).toBeLessThan(400)
    await expect(page).toHaveURL(/\/trips\/[0-9a-f-]+$/)
  })

  test('Trip persists to /api/trips after redirect (read-after-write)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/trips/new')
    await page.locator('[data-testid="trip-planner-destination"]').fill('Kyoto Quarter')
    await page.locator('[data-testid="trip-planner-start"]').fill('2026-09-04')
    await page.locator('[data-testid="trip-planner-end"]').fill('2026-09-19')
    await page.locator('[data-testid="trip-planner-submit"]').click()
    await page.waitForURL(/\/trips\/[0-9a-f-]+$/, { timeout: 15_000 })
    await page.goto(APP_BASE + '/trips')
    await expect(page.getByText(/Kyoto Quarter/i)).toBeVisible()
  })

  test('Back-to-all-trips link → /trips', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/trips/new')
    const a = page.getByRole('link', { name: /back to all trips|all trips/i }).first()
    expect(await a.getAttribute('href')).toBe('/trips')
  })

  test('Country and budget fields are settable', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/trips/new')
    await page.locator('[data-testid="trip-planner-country"]').fill('Iceland')
    await expect(page.locator('[data-testid="trip-planner-country"]')).toHaveValue('Iceland')
    const budget = page.locator('[data-testid="trip-planner-budget"]')
    if (await budget.count()) {
      await budget.fill('5000')
      await expect(budget).toHaveValue('5000')
    }
  })

  test('Travelers field is settable when present', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/trips/new')
    const t = page.locator('[data-testid="trip-planner-travelers"]')
    if (await t.count()) {
      await t.fill('4')
      await expect(t).toHaveValue('4')
    }
  })

  test('Form validation: submit is disabled without dates', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/trips/new')
    await page.locator('[data-testid="trip-planner-destination"]').fill('Half-formed plan')
    // Submit button must be disabled until start/end dates are filled.
    await expect(page.locator('[data-testid="trip-planner-submit"]')).toBeDisabled()
    await expect(page).toHaveURL(/\/trips\/new$/)
  })

  test('Heading visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/trips/new')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })
})
