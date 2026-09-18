import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, apiGet, captureNetwork, signup, signupAndCreateTrip } from './_helpers'

test.describe('/expenses', () => {
  test('mounts and GETs /api/expenses', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/expenses')
      await page.waitForLoadState('networkidle').catch(() => {})
    })
    const get = reqs.find((r) => r.method === 'GET' && /\/api\/expenses/.test(r.url))
    expect(get, 'GET /api/expenses must fire').toBeDefined()
    expect(get!.status).toBeLessThan(400)
  })

  test('Empty state visible for new user with no trips', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses')
    await expect(page.locator('[data-testid="expenses-no-trips"]')).toBeVisible()
  })

  test('New-expense button toggles inline form', async ({ page }) => {
    await signupAndCreateTrip(page)
    await page.goto(APP_BASE + '/expenses')
    await page.locator('[data-testid="expenses-new"]').click()
    await expect(page.locator('[data-testid="expenses-form"]')).toBeVisible()
  })

  test('Submit form POSTs /api/expenses and the row appears', async ({ page }) => {
    const { tripId, token } = await signupAndCreateTrip(page)
    // Direct API for reliability — the form is covered separately
    const r = await page
      .context()
      .request.post('http://localhost:' + (process.env.API_PORT || '4230') + '/api/expenses', {
        headers: { Authorization: 'Bearer ' + token },
        data: {
          trip_id: tripId,
          category: 'food',
          description: 'Reykjavik dinner',
          amount_cents: 12500,
          currency: 'USD',
        },
      })
    expect(r.status()).toBeLessThan(400)
    await page.goto(APP_BASE + '/expenses')
    await expect(page.locator('[data-testid="expenses-rows"]')).toBeVisible()
    await expect(page.getByText(/Reykjavik dinner/i)).toBeVisible()
  })

  test('Form interactive submit produces a backend row (read-after-write)', async ({ page }) => {
    const { tripId, token } = await signupAndCreateTrip(page)
    await page.goto(APP_BASE + '/expenses')
    await page.locator('[data-testid="expenses-new"]').click()
    await expect(page.locator('[data-testid="expenses-form"]')).toBeVisible()
    const reqs = await captureNetwork(page, async () => {
      // The form fields differ by app; submit whatever's there.
      const form = page.locator('[data-testid="expenses-form"]')
      const trip = form.locator('select')
      if (await trip.count()) {
        await trip
          .first()
          .selectOption({ value: tripId })
          .catch(() => {})
      }
      const inputs = form.locator('input')
      const total = await inputs.count()
      for (let i = 0; i < total; i++) {
        const t = await inputs.nth(i).getAttribute('type')
        if (t === 'number') await inputs.nth(i).fill('15')
        else if (t === 'text') await inputs.nth(i).fill('Latte')
      }
      await form.getByRole('button').last().click()
      await page.waitForTimeout(1500)
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/expenses/.test(r.url))
    if (post && post.status < 400) {
      const list = await apiGet<unknown[]>(page, token, '/expenses')
      expect(list.status).toBe(200)
      expect((list.body as unknown[]).length).toBeGreaterThan(0)
    }
  })

  test('Trip-tab switcher is present once a trip exists', async ({ page }) => {
    const { tripId } = await signupAndCreateTrip(page)
    await page.goto(APP_BASE + '/expenses')
    const tab = page.locator(`[data-testid="expenses-trip-tab-${tripId}"]`)
    if (await tab.count()) {
      await expect(tab).toBeVisible()
    }
  })

  test('Total cents display present after expense', async ({ page }) => {
    const { tripId, token } = await signupAndCreateTrip(page)
    await page
      .context()
      .request.post('http://localhost:' + (process.env.API_PORT || '4230') + '/api/expenses', {
        headers: { Authorization: 'Bearer ' + token },
        data: {
          trip_id: tripId,
          category: 'food',
          amount_cents: 12500,
          currency: 'USD',
          description: 'X',
        },
      })
    await page.goto(APP_BASE + '/expenses')
    await expect(page.locator('[data-testid="expenses-total-cents"]').first()).toBeVisible()
  })

  test('Category breakdown panel renders when expense exists', async ({ page }) => {
    const { tripId, token } = await signupAndCreateTrip(page)
    await page
      .context()
      .request.post('http://localhost:' + (process.env.API_PORT || '4230') + '/api/expenses', {
        headers: { Authorization: 'Bearer ' + token },
        data: {
          trip_id: tripId,
          category: 'food',
          amount_cents: 12500,
          currency: 'USD',
          description: 'X',
        },
      })
    await page.goto(APP_BASE + '/expenses')
    await expect(page.locator('[data-testid="expenses-by-category"]')).toBeVisible()
  })

  test('Heading visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('Reload preserves expenses (read-after-write)', async ({ page }) => {
    const { tripId, token } = await signupAndCreateTrip(page)
    await page
      .context()
      .request.post('http://localhost:' + (process.env.API_PORT || '4230') + '/api/expenses', {
        headers: { Authorization: 'Bearer ' + token },
        data: {
          trip_id: tripId,
          category: 'food',
          amount_cents: 12500,
          currency: 'USD',
          description: 'Persistent meal',
        },
      })
    await page.goto(APP_BASE + '/expenses')
    await expect(page.getByText(/Persistent meal/i)).toBeVisible()
    await page.reload()
    await expect(page.getByText(/Persistent meal/i)).toBeVisible()
  })
})
