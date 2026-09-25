/**
 * `/about/` — the About page, reachable from the header and the footer, and
 * the site-wide promises: nothing calls an API, and every link and asset stays
 * under the base path.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { BASE_PATH, open, SITE_NAME } from './_helpers.js'

test.describe('about page', () => {
  test('renders the About heading and description', async ({ page }) => {
    await open(page, '/about/')
    await expect(page).toHaveTitle(`About | ${SITE_NAME}`)
    await expect(page.getByRole('heading', { name: 'About', level: 1 })).toBeVisible()
    const text = await page.locator('[data-mol-id="about-page"]').innerText()
    expect(text.length).toBeGreaterThan(40)
  })

  test('header and footer About links reach it; the site name goes home', async ({ page }) => {
    await open(page, '/')
    await page.locator('[data-mol-id="nav-about"]').click()
    await page.waitForURL(/\/about\/$/)
    await expect(page.locator('[data-mol-id="about-page"]')).toBeVisible()
    await page.locator('[data-mol-id="site-name"]').click()
    await page.waitForURL(/\/$/)
    await page.locator('[data-mol-id="footer-about"]').click()
    await page.waitForURL(/\/about\/$/)
  })

  test('no page makes an /api request', async ({ page }) => {
    // Read the page's own resource timeline instead of intercepting requests, so
    // the check runs the same way over the live preview and on a real browser.
    const apiCalls = async (): Promise<string[]> =>
      page.evaluate(() =>
        performance
          .getEntriesByType('resource')
          .map((entry) => entry.name)
          .filter((name) => /\/api\//.test(name)),
      )
    for (const path of ['/', '/about/']) {
      await open(page, path)
      await page.waitForLoadState('networkidle')
      expect(await apiCalls()).toEqual([])
    }
  })

  test('every link, stylesheet and script on the page stays under the base path', async ({
    page,
  }) => {
    await open(page, '/')
    const urls = await page.evaluate(() =>
      [
        ...Array.from(document.querySelectorAll('a[href]'), (a) => a.getAttribute('href')!),
        ...Array.from(document.querySelectorAll('link[href]'), (l) => l.getAttribute('href')!),
        ...Array.from(document.querySelectorAll('script[src]'), (s) => s.getAttribute('src')!),
      ].filter((u) => u.startsWith('/') && !u.startsWith('/__')),
    )
    expect(urls.length).toBeGreaterThan(5)
    for (const url of urls) expect(url.startsWith(BASE_PATH), url).toBe(true)
  })
})
