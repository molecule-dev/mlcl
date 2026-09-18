import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, whereUrl } from './_helpers.js'

test.describe('Landing page (/)', () => {
  test('renders Fugue brand and value-prop heading', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('link', { name: /^Fugue$/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Layer everything/i, level: 1 })).toBeVisible()
  })

  test('Sign in nav link routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /^Sign in$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('"Open the studio" nav link routes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /open the studio/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('"Start producing" hero CTA routes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /start producing/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('feature cards advertise the four pillars (tracks, samples, mixer, collab)', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('heading', { name: /Unlimited tracks/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /samples/i }).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: /mixer/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /collaboration/i })).toBeVisible()
  })

  test('footer copyright is present (no broken Lorem/placeholder)', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByText(/© 20\d\d.*Fugue/)).toBeVisible()
  })

  test('Landing page makes no broken /api/* request', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/')
      await page.waitForLoadState('networkidle')
    })
    const apiCalls = whereUrl(reqs, /\/api\//)
    for (const c of apiCalls) {
      expect(c.status, `${c.method} ${c.url} should not 5xx`).toBeLessThan(500)
    }
  })

  test('bottom CTA "Hit play on your next track" CTA also routes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const ctas = page.getByRole('link', { name: /start producing/i })
    // `await ctas.count()` is a one-shot read with no auto-wait: page.goto
    // resolves on 'load', which in this Vite dev SPA is before React paints,
    // so it measured 0 and failed before the CTAs existed. toHaveCount polls,
    // and asserting the exact 2 (hero + bottom) is stricter than the old >= 2.
    await expect(ctas).toHaveCount(2)
    // Scope the bottom CTA to the section that carries the "Hit play on your
    // next track" heading rather than trusting nth(1) to be the bottom one —
    // this is what the test name actually claims.
    const bottomCta = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: /Hit play on your next track/i }) })
      .getByRole('link', { name: /start producing/i })
    await expect(bottomCta).toBeVisible()
    await bottomCta.click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('Fugue brand mark on landing has href="/" and stays on landing when clicked', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/')
    const brand = page.getByRole('link', { name: /^Fugue$/ }).first()
    await expect(brand).toBeVisible()
    await expect(brand).toHaveAttribute('href', '/')
    await brand.click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('hero h1 brand value-prop is the page <h1> (only one h1, accessible-tree level 1)', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/')
    const h1s = page.getByRole('heading', { level: 1 })
    await expect(h1s).toHaveCount(1)
    await expect(h1s).toContainText(/Layer everything/i)
  })

  test('landing renders without console errors and without redirecting to /login', async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    await page.goto(APP_BASE + '/')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/$/)
    const fatal = errors.filter(
      (e) => !/favicon|net::ERR_|Failed to load resource|404 \(Not Found\)/i.test(e),
    )
    expect(fatal, 'fatal console errors on landing').toEqual([])
  })
})
