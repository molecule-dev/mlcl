import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/ (Landing)', () => {
  test('renders the Motion brought to life hero', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(
      page.getByRole('heading', { name: /Motion brought to life/i, level: 1 }),
    ).toBeVisible()
  })

  test('Sign in link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /^Sign in$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('Start animating link navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /Start animating/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('Open Vivace link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.getByRole('link', { name: /Open Vivace/i }).click()
    await expect(page).toHaveURL(/\/login$/)
  })

  // Privacy/Terms come from LegalModalLinks, which opens the legal HTML in
  // place rather than navigating. These asserted a URL change the app no longer
  // performs; the routes are covered separately below so the deep links keep
  // their coverage.
  test('Privacy footer control opens the policy in place', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.getByRole('button', { name: /^Privacy$/ }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText(/privacy/i)
  })

  test('Terms footer control opens the terms in place', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.getByRole('button', { name: /^Terms$/ }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText(/terms/i)
  })

  test('/privacy still serves a direct link', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page.getByRole('heading', { name: /privacy/i }).first()).toBeVisible()
  })

  test('/terms still serves a direct link', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.getByRole('heading', { name: /terms/i }).first()).toBeVisible()
  })

  test('Pricing footer link navigates to /pricing', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.getByRole('link', { name: /^Pricing$/ }).click()
    await expect(page).toHaveURL(/\/pricing$/)
  })

  test('sample project cards are real links to /projects/sample-*', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const sampleLinks = await page.locator('a[href^="/projects/sample-"]').all()
    expect(sampleLinks.length).toBeGreaterThan(0)
    const hrefs = await Promise.all(sampleLinks.map((l) => l.getAttribute('href')))
    for (const h of hrefs) expect(h).toMatch(/^\/projects\/sample-/)
  })

  test('landing renders without backend hits and no console errors', async ({ page }) => {
    const errs: string[] = []
    page.on('console', (m) => {
      if (m.type() === 'error') errs.push(m.text())
    })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/', { waitUntil: 'networkidle' }).catch(() => {})
    })
    const fatal = errs.filter((e) => !/favicon|Failed to load resource/.test(e))
    expect(fatal, 'no console errors on landing').toEqual([])
    const apiCalls = reqs.filter((r) => /\/api\//.test(r.url))
    expect(apiCalls, 'landing must not hit /api/* — it is a public marketing page').toEqual([])
  })
})
