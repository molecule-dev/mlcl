import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, bookViaApi, signup, splitViaApi } from './_helpers.js'

test.describe('/bills (who owes what)', () => {
  test('shows the empty state before any split', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/bills')
    await expect(page.getByRole('heading', { name: /^bills$/i })).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('[data-mol-id="bills-empty"]')).toBeVisible()
  })

  test('lists every share, pending and paid, with the outstanding total', async ({ page }) => {
    await signup(page)
    const booking = await bookViaApi(page, 2)
    const shares = await splitViaApi(page, booking.id, [
      { name: 'Traveler One' },
      { name: 'Traveler Two' },
    ])
    expect(shares).toHaveLength(2)

    // One share is settled through its public pay link.
    const res = await page.request.post(`${API_BASE}/pay/${shares[0]!.pay_token}/pay`, {
      data: { card_last4: '4242' },
    })
    expect(res.status()).toBe(200)

    await page.goto(APP_BASE + '/bills')
    const rows = page.locator('[data-mol-id="bill-row"]')
    await expect(rows).toHaveCount(2, { timeout: 15_000 })
    await expect(page.locator('[data-mol-id="bill-paid"]')).toHaveCount(1)
    await expect(page.locator('[data-mol-id="bill-pending"]')).toHaveCount(1)
    // The outstanding tile counts only the pending share.
    await expect(page.locator('[data-mol-id="bills-outstanding"]')).toContainText('1')
  })
})
