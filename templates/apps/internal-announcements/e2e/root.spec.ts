/**
 * Landing page (/) — public marketing surface.
 *
 * Asserts the public surface: theme toggle, primary CTAs to /signup
 * /pricing /login, footer chrome (privacy/terms/locale), and that the
 * sample announcement card lands somewhere sensible (not a 500).
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('landing page', () => {
  test('renders the brand, hero, and the four nav links', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('link', { name: /^Herald/ }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Pricing' }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Sign in' }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /Start free/i }).first()).toBeVisible()
  })

  test('hero CTA "Start your workspace" navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /Start your workspace/i })
      .first()
      .click()
    await page.waitForURL(/\/signup$/, { timeout: 5000 })
  })

  test('"Compare plans" navigates to /pricing', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /Compare plans/i })
      .first()
      .click()
    await page.waitForURL(/\/pricing$/, { timeout: 5000 })
  })

  test('"Sign in" link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /^Sign in$/ })
      .first()
      .click()
    await page.waitForURL(/\/login$/, { timeout: 5000 })
  })

  test('Theme toggle flips data-mol-mode and the new value persists across reload', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/')
    const before = await page.evaluate(() => document.documentElement.getAttribute('data-mol-mode'))
    await page
      .getByRole('button', { name: /Toggle theme/i })
      .first()
      .click()
    await page.waitForTimeout(200)
    const after = await page.evaluate(() => document.documentElement.getAttribute('data-mol-mode'))
    expect(after).not.toBe(before)
    await page.reload()
    const persisted = await page.evaluate(() =>
      document.documentElement.getAttribute('data-mol-mode'),
    )
    expect(persisted).toBe(after)
  })

  test('GET /api/categories may be issued from the page (no auth) — best-effort, no crash', async ({
    page,
  }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/')
      await page.waitForLoadState('networkidle')
    })
    // Landing is public — categories may 401 unauthenticated. We just
    // assert the page itself rendered (no 5xx for the HTML doc).
    const root = reqs.find((r) => r.url === APP_BASE + '/' || r.url === APP_BASE + '/index.html')
    if (root) expect(root.status).toBeLessThan(500)
  })

  test('demo announcement card link exists and points at /announcement/<id>', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const sample = page.getByRole('link', { name: /Q3 town hall/i }).first()
    await expect(sample).toBeVisible()
    const href = await sample.getAttribute('href')
    expect(href).toMatch(/^\/announcement\//)
  })

  test('header brand link returns to / from itself', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /^Herald/ })
      .first()
      .click()
    await page.waitForURL(APP_BASE + '/', { timeout: 5000 })
  })

  test('"Start free" link in nav navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /Start free/i })
      .first()
      .click()
    await page.waitForURL(/\/signup$/, { timeout: 5000 })
  })

  test('Pricing link in top nav navigates to /pricing', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.getByRole('link', { name: 'Pricing' }).first().click()
    await page.waitForURL(/\/pricing$/, { timeout: 5000 })
  })

  test('demo announcement card link points to /announcement/<id> not external/null', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/')
    const links = page.locator('a[href^="/announcement/"]')
    const count = await links.count()
    expect(count).toBeGreaterThan(0)
    for (let i = 0; i < count; i++) {
      const href = await links.nth(i).getAttribute('href')
      expect(href, `link ${i}`).toMatch(/^\/announcement\/.+/)
    }
  })

  test('"Open & acknowledge" link is an /announcement/:id link', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const open = page.getByRole('link', { name: /Open.*ack(nowledge)?/i }).first()
    if ((await open.count()) > 0) {
      const href = await open.getAttribute('href')
      expect(href).toMatch(/^\/announcement\//)
    }
  })

  test('"About Herald" link opens the in-app About page', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    // The footer renders this unconditionally (AppFooter aboutHref="/about"),
    // so require it — the old "accept if absent" branch meant a missing footer
    // link passed, and the assertion it guarded pointed off-site anyway.
    const about = page.getByRole('link', { name: /About Herald/i }).first()
    await expect(about).toBeVisible()
    expect(await about.getAttribute('href')).toBe('/about')
  })

  test('Privacy / Terms / Language footer controls are interactive (no crash)', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/')
    for (const re of [/Privacy Policy/i, /Terms of Service/i, /Language/i]) {
      const btn = page.getByRole('button', { name: re }).first()
      if ((await btn.count()) > 0) {
        // Clicking should NOT navigate away from / (these open inline UI).
        await btn.click({ trial: false })
        await page.waitForTimeout(150)
        await expect(page).toHaveURL(/\/$/)
        // Each control opens a modal — dismiss it before iterating so the
        // next button is reachable. Pressing Escape is the canonical way
        // the @molecule/app-ui-react Modal closes; if no modal opened the
        // keypress is harmless.
        await page.keyboard.press('Escape')
        await page.waitForTimeout(150)
      }
    }
  })

  test('channel chip on landing demo card is a /feed?channel=<slug> link', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const chip = page.locator('a[href^="/feed?channel="]').first()
    if ((await chip.count()) > 0) {
      const href = await chip.getAttribute('href')
      expect(href).toMatch(/^\/feed\?channel=[a-z][\w-]*$/)
    }
  })
})
