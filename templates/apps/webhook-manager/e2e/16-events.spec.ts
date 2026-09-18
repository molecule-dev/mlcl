import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup } from './_helpers'

test.describe('/events', () => {
  test('redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto(APP_BASE + '/events')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('renders the Events catalog page', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/events')
    await expect(page.getByRole('heading', { level: 1, name: /events/i })).toBeVisible()
  })

  test('GET /api/events fires on render', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/events')
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    })
    const r = reqs.find((x) => x.method === 'GET' && /\/api\/events(?:[/?]|$)/.test(x.url))
    expect(r).toBeDefined()
    expect(r!.status).toBe(200)
  })

  test('empty state shows when no events have fired', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/events')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    // Either no event types yet OR a filter chip set to "all"
    const all = await page
      .getByRole('button', { name: /^all$/i })
      .first()
      .isVisible()
      .catch(() => false)
    const empty = await page
      .getByText(/no events|haven't|catalog is empty/i)
      .first()
      .isVisible()
      .catch(() => false)
    expect(all || empty).toBe(true)
  })
})
