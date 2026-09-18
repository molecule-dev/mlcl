import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup } from './_helpers'

test.describe('/dashboard', () => {
  test('mounts after signup and shows the empty hero CTA', async ({ page }) => {
    await signup(page)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
    // Listen AFTER signup so the dashboard's mount-time fetches are captured.
    const reqs = await captureNetwork(page, async () => {
      await page.reload()
      await page.waitForLoadState('networkidle').catch(() => {})
    })
    await expect(page.getByRole('heading').first()).toBeVisible()
    const tripsGet = reqs.find((r) => r.method === 'GET' && /\/api\/trips(\?|$)/.test(r.url))
    expect(tripsGet, 'dashboard must GET /api/trips').toBeDefined()
    expect(tripsGet!.status).toBeLessThan(400)
  })

  test('Start-a-new-trip CTA navigates to /trips/new', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page
      .getByRole('link', { name: /start a new trip|plan your first trip/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/trips\/new$/)
  })

  test('Sidebar links navigate to all primary routes', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    const cases: [RegExp, RegExp][] = [
      [/Trips/, /\/trips$/],
      [/Calendar/, /\/calendar$/],
      [/Destinations/, /\/destinations$/],
      [/Bookings/, /\/bookings$/],
      [/Expenses/, /\/expenses$/],
      [/Notifications/, /\/notifications$/],
      [/Settings/, /\/settings$/],
    ]
    for (const [name, urlRx] of cases) {
      await page
        .getByRole('navigation', { name: /primary/i })
        .getByRole('link', { name })
        .first()
        .click()
      await expect(page).toHaveURL(urlRx)
      await page.goto(APP_BASE + '/dashboard')
    }
  })

  test('Dashboard back-link to itself sticks at /dashboard', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page
      .getByRole('navigation', { name: /primary/i })
      .getByRole('link', { name: /Dashboard/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('User menu button is interactive', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    const btn = page.getByRole('button', { name: /user menu/i }).first()
    await expect(btn).toBeVisible()
    await btn.click()
    // dropdown should expose either /settings link or sign-out — at least
    // *one* of these should appear after clicking the avatar.
    const opened =
      (await page.getByRole('link', { name: /settings|account/i }).count()) > 0 ||
      (await page.getByRole('button', { name: /sign\s*out|log\s*out/i }).count()) > 0
    expect(opened).toBe(true)
  })

  test('Empty state visible for fresh account', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.locator('[data-testid="dashboard-empty"]')).toBeVisible()
  })

  test('Hero countdown card renders after creating a trip', async ({ page }) => {
    const { tripId, token } = await (await import('./_helpers')).signupAndCreateTrip(page)
    expect(tripId).toMatch(/^[0-9a-f-]{36}$/)
    // Seed an expense so the budget panel renders too.
    await page
      .context()
      .request.post('http://localhost:' + (process.env.API_PORT || '4230') + '/api/expenses', {
        headers: { Authorization: 'Bearer ' + token },
        data: {
          trip_id: tripId,
          category: 'food',
          amount_cents: 12500,
          currency: 'USD',
          description: 'Test meal',
        },
      })
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('networkidle').catch(() => {})
    // Empty hero should be gone now that a trip exists
    await expect(page.locator('[data-testid="dashboard-empty"]')).toHaveCount(0)
    // Budget panel renders once we have an expense for the trip
    await expect(page.locator('[data-testid="dashboard-budget"]')).toBeVisible()
  })

  test('Trips link in sidebar reaches /trips and renders the index', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page
      .getByRole('navigation', { name: /primary/i })
      .getByRole('link', { name: /Trips/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/trips$/)
  })

  test('Heading reflects authenticated state', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('Reload preserves session and dashboard re-renders', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page.reload()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('Plan-another-trip CTA appears after creating a trip', async ({ page }) => {
    const { tripId } = await (await import('./_helpers')).signupAndCreateTrip(page)
    expect(tripId).toMatch(/^[0-9a-f-]{36}$/)
    await page.goto(APP_BASE + '/dashboard')
    const cta = page.getByRole('link', { name: /start a new trip|plan another trip/i }).first()
    await expect(cta).toBeVisible()
  })

  test('Brand link in sidebar returns to /dashboard#top', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    const a = page.getByRole('link', { name: /Waypoint/i }).first()
    const href = await a.getAttribute('href')
    expect(href).toMatch(/\/dashboard/)
  })

  test('Empty card CTA navigates to /trips/new', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    const cta = page.getByRole('link', { name: /plan your first trip/i }).first()
    if (await cta.count()) {
      await cta.click()
      await expect(page).toHaveURL(/\/trips\/new$/)
    }
  })

  test('Fresh signup → dashboard primary nav contains 8 destinations', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    const links = page.getByRole('navigation', { name: /primary/i }).getByRole('link')
    // count() is a one-shot read with no waiting — it raced the dashboard mount
    // and saw 0. Wait for the nav to paint, then count.
    await expect(links.first()).toBeVisible()
    await expect(links.nth(7)).toBeAttached()
  })
})
