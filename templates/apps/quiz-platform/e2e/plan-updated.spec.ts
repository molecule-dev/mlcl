import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/plan-updated', () => {
  test('renders the plan-updated main landmark (anonymous)', async ({ page }) => {
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.getByTestId('plan-updated')).toBeVisible()
  })

  test('renders the H1 (plan updated copy)', async ({ page }) => {
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.getByRole('heading', { level: 1, name: /plan/i })).toBeVisible()
  })

  test('renders thank-you body copy', async ({ page }) => {
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.getByText(/thank/i).first()).toBeVisible()
  })

  test('signed-in CTA navigates to /discover', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    const back = page.getByTestId('plan-updated-back')
    await expect(back).toBeVisible()
    await back.click()
    await expect(page).toHaveURL(/\/discover/)
  })

  test('anonymous CTA navigates somewhere browseable (auth-aware fallback)', async ({
    page,
    context,
  }) => {
    await context.clearCookies()
    await page.goto(APP_BASE + '/plan-updated')
    await page
      .evaluate(() => {
        try {
          localStorage.clear()
        } catch {}
      })
      .catch(() => undefined)
    await page.goto(APP_BASE + '/plan-updated')
    const back = page.getByTestId('plan-updated-back')
    await expect(back).toBeVisible()
    await back.click()
    // Anonymous user clicking "back" lands on either / (landing) or
    // /login (if the destination was a guarded route). Both are valid
    // exits from /plan-updated.
    await expect(page).toHaveURL(/\/(login|discover)?$/)
  })

  test('does not fire backend XHR when standalone (captureNetwork sentinel)', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/plan-updated')
      await page.waitForLoadState('networkidle')
    })
    expect(reqs.filter((r) => r.url.includes('/api/'))).toEqual([])
  })
})

test.describe('/plan-updated — checkout return', () => {
  test('confirms the purchase when the provider returns with a payment id', async ({ page }) => {
    await signup(page)
    const confirmed = page
      .waitForResponse((r) => /\/verify-payment\//.test(r.url()), { timeout: 20_000 })
      .catch(() => null)
    // The provider's success_url lands on the APP origin, so this page is what
    // finishes the purchase — without the call the paid plan is never granted.
    await page.goto(APP_BASE + '/plan-updated?provider=stripe&sessionId=cs_test_e2e')
    expect(await confirmed).not.toBeNull()
  })
})
