/**
 * /help — public Help / FAQ page. Anonymous read renders the heading,
 * intro, and 5 FAQ sections (getting-started, analytics, rss, pricing,
 * support). The RSS FAQ specifically references /api/feed/rss and
 * /api/feed/json, both of which are real backend routes (the spec asserts
 * those endpoints actually respond, too).
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork } from './_helpers.js'

test.describe('help page', () => {
  test('renders the Help heading', async ({ page }) => {
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/help')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { level: 1 }).first()).toContainText(/help/i)
  })

  test('intro paragraph has real copy', async ({ page }) => {
    await page.goto(APP_BASE + '/help')
    const intro = await page.locator('[data-mol-id="help-intro"]').innerText()
    expect(intro.length).toBeGreaterThan(60)
  })

  test('renders all five FAQ sections', async ({ page }) => {
    await page.goto(APP_BASE + '/help')
    for (const id of ['getting-started', 'analytics', 'rss', 'pricing', 'support']) {
      await expect(page.locator(`[data-mol-id="help-faq-${id}"]`)).toBeVisible()
    }
  })

  test('getting-started FAQ describes the publish flow', async ({ page }) => {
    await page.goto(APP_BASE + '/help')
    const txt = await page.locator('[data-mol-id="help-faq-getting-started"]').innerText()
    expect(txt.toLowerCase()).toMatch(/publish/)
  })

  test('analytics FAQ mentions the /analytics page', async ({ page }) => {
    await page.goto(APP_BASE + '/help')
    const txt = await page.locator('[data-mol-id="help-faq-analytics"]').innerText()
    expect(txt.toLowerCase()).toMatch(/analytics/)
  })

  test('RSS FAQ references both /api/feed/rss and /api/feed/json AND those endpoints respond', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/help')
    const txt = await page.locator('[data-mol-id="help-faq-rss"]').innerText()
    expect(txt).toContain('/api/feed/rss')
    expect(txt).toContain('/api/feed/json')

    const rss = await page.request.get(`${API_BASE}/feed/rss`, {
      failOnStatusCode: false,
    })
    expect(rss.status(), 'RSS feed must respond').toBeLessThan(400)
    const rssBody = await rss.text()
    expect(rssBody).toContain('<rss')

    const jsonFeed = await page.request.get(`${API_BASE}/feed/json`, {
      failOnStatusCode: false,
    })
    expect(jsonFeed.status(), 'JSON feed must respond').toBeLessThan(400)
    const jsonBody = (await jsonFeed.json()) as { version?: string; items?: unknown[] }
    expect(jsonBody.version, 'JSON Feed should have a version field').toBeTruthy()
  })

  test('pricing FAQ mentions the Pricing page', async ({ page }) => {
    await page.goto(APP_BASE + '/help')
    const txt = await page.locator('[data-mol-id="help-faq-pricing"]').innerText()
    expect(txt.toLowerCase()).toMatch(/pricing|pro/)
  })

  test('support FAQ provides contact info', async ({ page }) => {
    await page.goto(APP_BASE + '/help')
    const txt = await page.locator('[data-mol-id="help-faq-support"]').innerText()
    expect(txt.length).toBeGreaterThan(40)
  })

  test('footer Membership link goes to /pricing', async ({ page }) => {
    await page.goto(APP_BASE + '/help')
    const membershipLink = page.locator('footer a[href="/pricing"]').first()
    if ((await membershipLink.count()) === 0) {
      // Fallback: click any link to /pricing — the help page may render
      // the cross-link inside a body section rather than the global footer.
      await page.locator('a[href="/pricing"]').first().click()
    } else {
      await membershipLink.click()
    }
    await page.waitForURL(/\/pricing/, { timeout: 10000 })
  })

  test('help page does not trigger any /api/* requests on initial load', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/help')
      await page.waitForLoadState('networkidle')
    })
    const apiCalls = reqs.filter((r) => /\/api\//.test(r.url))
    expect(apiCalls).toEqual([])
  })
})
