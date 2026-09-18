import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup, signupAndCreateTrip } from './_helpers'

test.describe('/trips', () => {
  test('renders empty state for fresh user and GETs /api/trips', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/trips')
      await page.waitForLoadState('networkidle').catch(() => {})
    })
    const get = reqs.find((r) => r.method === 'GET' && /\/api\/trips(\?|$)/.test(r.url))
    expect(get, 'GET /api/trips must fire').toBeDefined()
    expect(get!.status).toBeLessThan(400)
    await expect(page.locator('[data-testid="trips-empty"]')).toBeVisible()
  })

  test('Plan-a-trip CTA → /trips/new', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/trips')
    await page
      .getByRole('link', { name: /new trip|start.*trip|plan/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/trips\/new$/)
  })

  test('Created trip shows up in trips-live grid', async ({ page }) => {
    await signupAndCreateTrip(page)
    await page.goto(APP_BASE + '/trips')
    await expect(page.locator('[data-testid="trips-live"]')).toBeVisible()
    await expect(
      page.locator('[data-testid="trips-live"]').getByText(/Iceland Loop/i),
    ).toBeVisible()
  })

  test('Trip card link navigates to /trips/:id', async ({ page }) => {
    const { tripId } = await signupAndCreateTrip(page)
    await page.goto(APP_BASE + '/trips')
    await page.locator(`a[href="/trips/${tripId}"]`).first().click()
    await expect(page).toHaveURL(new RegExp(`/trips/${tripId}$`))
  })

  test('Reload preserves the created trip (read-after-write)', async ({ page }) => {
    await signupAndCreateTrip(page)
    await page.goto(APP_BASE + '/trips')
    await page.reload()
    await expect(page.locator('[data-testid="trips-live"]')).toBeVisible()
    await expect(
      page.locator('[data-testid="trips-live"]').getByText(/Iceland Loop/i),
    ).toBeVisible()
  })

  test('Heading is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/trips')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })
})
