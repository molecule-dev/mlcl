/**
 * Per-page coverage for /settings. Cross-references e2e/observations/settings.md.
 * Detailed PATCH/reload flow lives in 07-settings-persist.spec.ts.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('/settings', () => {
  test('renders the settings heading and all six toggles', async ({ page }) => {
    await signup(page, uniqueEmail('na-settings-page'))
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings')
      await expect(page.getByRole('heading', { name: /settings/i }).first()).toBeVisible()
    })
    for (const id of [
      '#setting-breaking',
      '#setting-daily',
      '#setting-email',
      '#setting-hide-read',
      '#setting-bias-balanced',
      '#setting-bias-meters',
    ]) {
      await expect(page.locator(id)).toBeVisible()
    }
    expect(reqs.some((r) => /\/api\/preferences/.test(r.url) && r.method === 'GET')).toBe(true)
  })

  test('toggling a switch fires PATCH /api/preferences', async ({ page }) => {
    await signup(page, uniqueEmail('na-settings-patch'))
    await page.goto(APP_BASE + '/settings')
    const breaking = page.locator('#setting-breaking')
    await expect(breaking).toBeVisible()
    const reqs = await captureNetwork(page, async () => {
      await Promise.all([
        page.waitForResponse(
          (r) => r.url().endsWith('/api/preferences') && r.request().method() === 'PATCH',
          { timeout: 15_000 },
        ),
        breaking.click(),
      ])
    })
    expect(reqs.some((r) => /\/api\/preferences/.test(r.url) && r.method === 'PATCH')).toBe(true)
  })

  test('Sign-out clears the session and redirects to /login', async ({ page }) => {
    await signup(page, uniqueEmail('na-settings-signout'))
    await page.goto(APP_BASE + '/settings')
    await page
      .getByRole('button', { name: /sign\s*out/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('toggling Daily digest persists across reload', async ({ page }) => {
    await signup(page, uniqueEmail('na-settings-daily-persist'))
    await page.goto(APP_BASE + '/settings')
    const daily = page.locator('#setting-daily')
    await expect(daily).toBeVisible()
    const before = await daily.getAttribute('aria-checked')
    await Promise.all([
      page.waitForResponse(
        (r) => r.url().endsWith('/api/preferences') && r.request().method() === 'PATCH',
        { timeout: 15_000 },
      ),
      daily.click(),
    ])
    await page.reload()
    await expect(page.locator('#setting-daily')).toHaveAttribute(
      'aria-checked',
      before === 'true' ? 'false' : 'true',
      { timeout: 10_000 },
    )
  })

  test('toggling Email digest fires PATCH /api/preferences', async ({ page }) => {
    await signup(page, uniqueEmail('na-settings-email'))
    await page.goto(APP_BASE + '/settings')
    const email = page.locator('#setting-email')
    await expect(email).toBeVisible()
    const [resp] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().endsWith('/api/preferences') && r.request().method() === 'PATCH',
        { timeout: 15_000 },
      ),
      email.click(),
    ])
    expect(resp.status()).toBe(200)
  })

  test('toggling Hide-read fires PATCH /api/preferences', async ({ page }) => {
    await signup(page, uniqueEmail('na-settings-hide-read'))
    await page.goto(APP_BASE + '/settings')
    const hide = page.locator('#setting-hide-read')
    await expect(hide).toBeVisible()
    const [resp] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().endsWith('/api/preferences') && r.request().method() === 'PATCH',
        { timeout: 15_000 },
      ),
      hide.click(),
    ])
    expect(resp.status()).toBe(200)
  })

  test('toggling balanced-coverage bias preference fires PATCH /api/preferences', async ({
    page,
  }) => {
    await signup(page, uniqueEmail('na-settings-balanced'))
    await page.goto(APP_BASE + '/settings')
    const balanced = page.locator('#setting-bias-balanced')
    await expect(balanced).toBeVisible()
    const [resp] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().endsWith('/api/preferences') && r.request().method() === 'PATCH',
        { timeout: 15_000 },
      ),
      balanced.click(),
    ])
    expect(resp.status()).toBe(200)
  })

  test('toggling bias-meters preference persists across reload', async ({ page }) => {
    await signup(page, uniqueEmail('na-settings-meters-persist'))
    await page.goto(APP_BASE + '/settings')
    const meters = page.locator('#setting-bias-meters')
    await expect(meters).toBeVisible()
    const before = await meters.getAttribute('aria-checked')
    await Promise.all([
      page.waitForResponse(
        (r) => r.url().endsWith('/api/preferences') && r.request().method() === 'PATCH',
        { timeout: 15_000 },
      ),
      meters.click(),
    ])
    await page.reload()
    await expect(page.locator('#setting-bias-meters')).toHaveAttribute(
      'aria-checked',
      before === 'true' ? 'false' : 'true',
      { timeout: 10_000 },
    )
  })
})
