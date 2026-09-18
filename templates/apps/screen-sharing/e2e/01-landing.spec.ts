import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('landing /', () => {
  test('loads the marketing hero and a sign-up CTA', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page).toHaveURL(/\/$/)
    const ctas = page.getByRole('link', { name: /sign\s*up|get\s*started|create/i })
    await expect(ctas.first()).toBeAttached()
  })

  test('header link "Sign in" routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const link = page.getByRole('link', { name: /sign\s*in|log\s*in/i }).first()
    await link.click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('clicking "Pricing" navigates to /pricing', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const link = page.getByRole('link', { name: /pricing/i }).first()
    await link.click()
    await expect(page).toHaveURL(/\/pricing/)
  })

  test('initial render does not error against /api', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/')
      await page.waitForLoadState('networkidle')
    })
    const fail5xx = reqs.filter((r) => r.status >= 500)
    expect(fail5xx, `5xx responses on landing: ${JSON.stringify(fail5xx)}`).toHaveLength(0)
  })
})
