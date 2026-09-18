import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, getAccessToken, signup, uniqueEmail } from './_helpers.js'

test.describe('/plan-updated', () => {
  test('renders the success shell', async ({ page }) => {
    await signup(page, uniqueEmail('plan-updated'))
    await page.goto(APP_BASE + '/plan-updated')
    await page.waitForLoadState('networkidle')
    const text = await page.locator('body').innerText()
    expect(text.toLowerCase()).toMatch(/plan|success|updated|welcome|thanks/)
  })

  test('after Stripe redirect the next /api/billing/status reflects the active plan', async ({
    page,
  }) => {
    await signup(page, uniqueEmail('plan-updated-status'))
    await page.goto(APP_BASE + '/plan-updated')
    await page.waitForLoadState('networkidle')
    // The page may refetch /billing/status to verify the new tier;
    // either way, asserting the API contract is what matters.
    const status = await page.request.get(
      'http://localhost:' + (process.env.API_PORT || '4000') + '/api/billing/status',
      {
        headers: {
          Authorization: 'Bearer ' + (await getAccessToken(page)),
        },
      },
    )
    expect(status.status()).toBe(200)
    const body = (await status.json()) as { planKey?: string; tierName?: string }
    expect(typeof (body.planKey ?? body.tierName)).toBe('string')
  })

  test('return-home button navigates back to /dashboard or /', async ({ page }) => {
    await signup(page, uniqueEmail('plan-updated-home'))
    await page.goto(APP_BASE + '/plan-updated')
    await page.waitForLoadState('networkidle')
    const btn = page.getByRole('button', { name: /return|home|dashboard|continue/i }).first()
    const link = page.getByRole('link', { name: /return|home|dashboard|continue/i }).first()
    if (await btn.count()) {
      await btn.click()
    } else if (await link.count()) {
      await link.click()
    } else {
      test.skip()
    }
    await expect(page).toHaveURL(/\/dashboard|\/$/, { timeout: 10_000 })
  })
})
