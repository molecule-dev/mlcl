/**
 * /about — public marketing page. Anonymous read renders the
 * production About copy (mission, features, contact); footer links
 * navigate to /privacy, /terms, /help; header CTA links navigate to
 * /signup and /. No /api calls are expected — the page is fully static.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('about page', () => {
  test('renders the About WriteFlow heading and mission body', async ({ page }) => {
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/about')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'About WriteFlow', level: 1 })).toBeVisible()
    const intro = await page.locator('[data-mol-id="about-intro"]').innerText()
    expect(intro.length).toBeGreaterThan(60)
    const mission = await page.locator('[data-mol-id="about-mission"]').innerText()
    expect(mission.length).toBeGreaterThan(60)
  })

  test('shows at least four product features in the bullet list', async ({ page }) => {
    await page.goto(APP_BASE + '/about')
    await page.waitForLoadState('networkidle')
    const items = page.locator('[data-mol-id="about-features"] li')
    await expect(items.nth(3)).toBeAttached()
  })

  test('contact section is present with non-trivial copy', async ({ page }) => {
    await page.goto(APP_BASE + '/about')
    await page.waitForLoadState('networkidle')
    const contact = await page.locator('[data-mol-id="about-contact"]').innerText()
    expect(contact.length).toBeGreaterThan(40)
  })

  test('header logo navigates back to /', async ({ page }) => {
    await page.goto(APP_BASE + '/about')
    await page
      .getByRole('link', { name: /WriteFlow/ })
      .first()
      .click()
    await page.waitForURL(/.*\/$/, { timeout: 10000 })
    expect(new URL(page.url()).pathname).toBe('/')
  })

  test('header Get started link goes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/about')
    const link = page.getByRole('link', { name: 'Get started' }).first()
    await link.click()
    await page.waitForURL(/.*\/signup/, { timeout: 10000 })
  })

  test('footer Privacy / Terms open their policy modal, Help navigates', async ({ page }) => {
    // Privacy and Terms are LegalModalLinks buttons, not routes — the modal is
    // the footer's design in every flagship. Help is a real link.
    await page.goto(APP_BASE + '/about')
    await page.getByRole('button', { name: 'Privacy' }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('dialog')).toContainText(/privacy/i)
    await page.goto(APP_BASE + '/about')
    await page.getByRole('button', { name: 'Terms' }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('dialog')).toContainText(/terms/i)
    await page.goto(APP_BASE + '/about')
    await page.getByRole('link', { name: 'Help' }).first().click()
    await page.waitForURL(/\/help/, { timeout: 10000 })
  })

  test('about page does not trigger any /api/* requests (purely static)', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/about')
      await page.waitForLoadState('networkidle')
    })
    const apiCalls = reqs.filter((r) => /\/api\//.test(r.url))
    expect(apiCalls, JSON.stringify(apiCalls)).toEqual([])
  })

  test('header logo and footer Privacy link are reachable on a fresh nav', async ({ page }) => {
    await page.goto(APP_BASE + '/about')
    await expect(page.getByRole('link', { name: /WriteFlow/ }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Privacy' }).first()).toBeVisible()
  })

  test('header sign-in link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/about')
    await page
      .getByRole('link', { name: /sign\s*in/i })
      .first()
      .click()
    await page.waitForURL(/\/login/, { timeout: 10000 })
  })

  test('about page reload preserves URL and content', async ({ page }) => {
    await page.goto(APP_BASE + '/about')
    await page.reload()
    await expect(page).toHaveURL(/\/about/)
    await expect(page.getByRole('heading', { name: 'About WriteFlow', level: 1 })).toBeVisible()
  })
})
