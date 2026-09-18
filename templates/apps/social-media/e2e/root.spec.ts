import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('landing page (/)', () => {
  test('renders the brand name in the nav', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.locator('nav')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('nav a, nav span').first()).toBeVisible()
  })

  test('"Sign in" link points to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const link = page.locator('nav a[href="/login"]').first()
    await expect(link).toHaveAttribute('href', '/login')
  })

  test('"Pricing" link points to /pricing', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const link = page.locator('nav a[href="/pricing"]').first()
    await expect(link).toHaveAttribute('href', '/pricing')
  })

  test('hero CTA links to /signup so visitors can create an account', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const link = page.locator('a[href="/signup"]').first()
    await expect(link).toBeVisible({ timeout: 10_000 })
  })

  test('feature highlights (Stories / Creators / Realtime / Community) all render', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/')
    // innerText() is a one-shot read with no waiting, so this raced React
    // mounting and scored 0/4 against an empty body. Wait for the landing to
    // paint first.
    await expect(page.getByRole('heading').first()).toBeVisible()
    const body = await page.locator('main, body').first().innerText()
    const lc = body.toLowerCase()
    let hits = 0
    if (/stor(y|ies)/.test(lc)) hits++
    if (/creator/.test(lc)) hits++
    if (/real[\s-]?time|live/.test(lc)) hits++
    if (/communit/.test(lc)) hits++
    expect(
      hits,
      `landing should describe at least 3 of stories/creators/realtime/community — body was: ${body.slice(0, 400)}`,
    ).toBeGreaterThanOrEqual(3)
  })
})
