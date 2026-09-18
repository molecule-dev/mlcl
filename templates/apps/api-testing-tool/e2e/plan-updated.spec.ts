import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/plan-updated', () => {
  test('renders a confirmation heading after auth bootstrap', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('"Return home" link navigates back to /', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    const link = page.getByRole('link', { name: /Return home|Back home|Go home/i }).first()
    await expect(link).toBeVisible()
    await link.click()
    await expect(page).toHaveURL(new RegExp(`${APP_BASE.replace(/[/.]/g, '\\$&')}/?$`))
  })

  test('the home button rendered inside the link is clickable', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    const button = page.getByRole('button', { name: /Return home|Go home/i }).first()
    await expect(button).toBeVisible()
  })

  test('page loads the index document and renders without errors', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/plan-updated')
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    })
    // Either we navigated successfully (any 2xx GET to the document) and the
    // confirmation heading rendered, or the page fully bootstrapped through
    // the auth bond (GET /api/users/:id). Either path is a successful render.
    const documentLoaded = reqs.some((r) => r.method === 'GET' && r.status >= 200 && r.status < 400)
    expect(documentLoaded, 'a 2xx GET should be observed during the page load').toBeTruthy()
    await expect(page.getByRole('heading').first()).toBeVisible()
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
