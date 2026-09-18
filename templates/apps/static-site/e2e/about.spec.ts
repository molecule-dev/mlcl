/**
 * `/about/` — the About page, reachable from the header and the footer. The
 * theme toggle in the header works on every page; nothing on the site calls
 * an API.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { open, SITE_NAME } from './_helpers.js'

test.describe('about page', () => {
  test('renders the About heading and description', async ({ page }) => {
    await open(page, '/about/')
    await expect(page).toHaveTitle(`About ${SITE_NAME} | ${SITE_NAME}`)
    await expect(page.getByRole('heading', { name: `About ${SITE_NAME}`, level: 1 })).toBeVisible()
    const description = await page.locator('[data-mol-id="about-description"]').innerText()
    expect(description.length).toBeGreaterThan(20)
  })

  test('header and footer About links reach it; the brand link goes home', async ({ page }) => {
    await open(page, '/')
    await page.locator('[data-mol-id="nav-about"]').click()
    await page.waitForURL(/\/about\/?$/)
    await expect(page.locator('[data-mol-id="about-page"]')).toBeVisible()
    await page
      .getByRole('link', { name: new RegExp(SITE_NAME) })
      .first()
      .click()
    await page.waitForURL(/\/$/)
    await page.locator('[data-mol-id="footer-about"]').click()
    await page.waitForURL(/\/about\/?$/)
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
    await open(page, '/about/')
    await page.waitForLoadState('networkidle')
    expect(await apiCalls()).toEqual([])
    await open(page, '/')
    await page.waitForLoadState('networkidle')
    expect(await apiCalls()).toEqual([])
  })

  test('the theme toggle switches the document theme', async ({ page }) => {
    await open(page, '/about/')
    const toggle = page.locator('[data-mol-id="site-header"]').getByRole('button').first()
    await expect(toggle).toBeVisible()
    const before = await page.evaluate(() => document.documentElement.className)
    await toggle.click()
    await expect
      .poll(async () => page.evaluate(() => document.documentElement.className))
      .not.toBe(before)
  })
})
