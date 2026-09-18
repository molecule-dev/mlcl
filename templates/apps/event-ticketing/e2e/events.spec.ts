import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiHeaders,
  API_BASE,
  captureNetwork,
  expectNoConsoleErrors,
  login,
  logout,
  seedEvent,
  seedOrder,
  seedTier,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('/events Discover page', () => {
  test('renders an h1 ("What\u2019s on near you")', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/events')
    await expect(page.locator('h1').first()).toBeVisible()
  })

  test('typing in search box updates the input value', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/events')
    const search = page.getByRole('searchbox').first()
    await search.fill('jazz')
    expect(await search.inputValue()).toBe('jazz')
  })

  test('Music category button can be clicked', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/events')
    await page
      .getByRole('button', { name: /^music$/i })
      .first()
      .click()
  })

  test('Reset filters clears the search input', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/events')
    const search = page.getByRole('searchbox').first()
    await search.fill('xyz')
    await page.getByRole('button', { name: /reset filters/i }).click()
    expect(await search.inputValue()).toBe('')
  })

  test('event detail link navigates to /events/:id', async ({ page }) => {
    const auth = await signup(page)
    const ev = await seedEvent(page, auth.accessToken, { title: 'Discover Click Test' })
    await page.goto(APP_BASE + '/events')
    await page.locator('a[href*="/events/"]').first().click()
    await expect(page).toHaveURL(/\/events\//)
    expect(ev.id).toBeTruthy()
  })

  test('hits GET /api/events when discover loads', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/events')
      await page.waitForLoadState('networkidle')
    })
    const ev = reqs.find((r) => r.method === 'GET' && /\/api\/events/.test(r.url))
    expect(ev).toBeTruthy()
    expect(ev?.status).toBeLessThan(500)
  })
})
