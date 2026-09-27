import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, bookViaApi, signup, splitViaApi } from './_helpers.js'

test.describe('/pay/:token (the public pay link)', () => {
  test('a person with only the link can see and settle their share', async ({ page, browser }) => {
    await signup(page)
    const booking = await bookViaApi(page, 2)
    const shares = await splitViaApi(page, booking.id, [
      { name: 'Traveler One' },
      { name: 'Traveler Two' },
    ])
    const share = shares[0]!

    // A fresh context: no session, no cookies. The token is all the payer has.
    const payer = await browser.newContext()
    const payPage = await payer.newPage()
    await payPage.goto(APP_BASE + `/pay/${share.pay_token}`)
    await expect(payPage.locator('[data-mol-id="pay-card"]')).toBeVisible({ timeout: 15_000 })
    await expect(payPage.getByRole('heading', { level: 1 })).toContainText(share.name)
    await expect(payPage.locator('[data-mol-id="pay-amount"]')).toBeVisible()

    await payPage.locator('[data-mol-id="pay-card-number"]').fill('4242 4242 4242 4242')
    const post = payPage.waitForResponse(
      (r) => r.request().method() === 'POST' && /\/api\/pay\/[^/]+\/pay/.test(r.url()),
      { timeout: 15_000 },
    )
    await payPage.locator('[data-mol-id="pay-submit"]').click()
    expect((await post).status()).toBe(200)
    await expect(payPage.locator('[data-mol-id="pay-done"]')).toBeVisible({ timeout: 10_000 })

    // Reloading shows it paid; paying twice is impossible.
    await payPage.reload()
    await expect(payPage.locator('[data-mol-id="pay-done"]')).toBeVisible({ timeout: 10_000 })
    await expect(payPage.locator('[data-mol-id="pay-submit"]')).toHaveCount(0)
    await payer.close()

    // The owner sees the share paid on the trip.
    await page.goto(APP_BASE + `/trips/${booking.trip_id}`)
    await expect(
      page.locator('[data-mol-id="trip-splits"] [data-mol-id="split-paid"]'),
    ).toHaveCount(1, { timeout: 15_000 })
  })

  test('an unknown token shows a clear message, not a crash', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto(APP_BASE + '/pay/not-a-real-token-value')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/no longer valid/i, {
      timeout: 15_000,
    })
    expect(errors).toEqual([])
    await ctx.close()
  })
})
