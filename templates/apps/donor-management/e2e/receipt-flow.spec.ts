import { test, expect } from '@molecule/app-e2e-fixtures-default'
import {
  API_BASE,
  APP_BASE,
  apiHeaders,
  createDonorWithPastYearGift,
  signup,
  waitForSeed,
} from './_helpers.js'

/**
 * The signature flow: donor → gift in a campaign → campaign totals move →
 * year-end: generate a numbered, itemized receipt → print view → the gifts
 * it covers are marked receipted.
 */
test.describe('year-end receipt flow', () => {
  test('generate produces a numbered receipt with line items and marks gifts receipted', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const { donorId, year, amountCents } = await createDonorWithPastYearGift(page, accessToken)

    // -- the Receipts page's generate form --
    await page.goto(APP_BASE + '/receipts')
    await expect(page.getByRole('heading', { name: /tax receipts/i, level: 1 })).toBeVisible({
      timeout: 15000,
    })
    // The Donor/Year selects are wrapped in <label>s whose computed text
    // folds in every <option> — getByLabel never matches them. The
    // accessible role/name pairs do.
    await page.getByRole('combobox', { name: /^donor$/i }).selectOption(donorId)
    await page.getByRole('combobox', { name: /^year$/i }).selectOption(String(year))
    await page.getByRole('button', { name: /^preview$/i }).click()

    // Preview lists the unreceipted gift and offers the generate button.
    await expect(page.getByText(/unreceipted gifts/i)).toBeVisible({ timeout: 10000 })
    await page.getByRole('button', { name: /^generate receipt/i }).click()

    // The new receipt appears in the table with a YYYY-NNNNN number.
    // Receipt rows link to /receipts/<uuid> with the number as the text —
    // no href substring is stable across uuids, so match on the text alone.
    const receiptLink = page.locator('a[href^="/receipts/"]', {
      hasText: new RegExp(`^${year}-\\d{5}$`),
    })
    await expect(receiptLink.first()).toBeVisible({ timeout: 10000 })
    await receiptLink.first().click()

    // -- the print-friendly receipt view --
    await expect(page).toHaveURL(/\/receipts\/[a-f0-9-]{36}$/, { timeout: 10000 })
    await expect(
      page.getByRole('heading', { name: /receipt for tax purposes/i, level: 1 }),
    ).toBeVisible()
    await expect(page.getByText(/receipt #/i)).toBeVisible()
    await expect(
      page.getByText(new RegExp(`^\\$${(amountCents / 100).toFixed(2)}$`)).first(),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: /print receipt/i })).toBeVisible()

    // -- the gift is now receipted, via the API the pages read --
    const giftsRes = await page.request.get(`${API_BASE}/gifts?donor_id=${donorId}`, {
      headers: apiHeaders(accessToken),
    })
    const gifts = (await giftsRes.json()) as Array<{
      amount_cents: number
      receipted: boolean
      receipt_id: string | null
    }>
    const covered = gifts.find((g) => g.amount_cents === amountCents)
    expect(covered?.receipted, 'gift marked receipted').toBe(true)
    expect(covered?.receipt_id).toBeTruthy()
  })

  test('deleting a receipt un-marks its gifts', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const { donorId, year } = await createDonorWithPastYearGift(page, accessToken)

    const genRes = await page.request.post(`${API_BASE}/receipts/generate`, {
      headers: apiHeaders(accessToken),
      data: { donor_id: donorId, year },
    })
    expect(genRes.status(), await genRes.text()).toBe(201)
    const receipt = (await genRes.json()) as { id: string }

    const delRes = await page.request.delete(`${API_BASE}/receipts/${receipt.id}`, {
      headers: apiHeaders(accessToken),
    })
    expect(delRes.status()).toBe(204)

    const giftsRes = await page.request.get(`${API_BASE}/gifts?donor_id=${donorId}`, {
      headers: apiHeaders(accessToken),
    })
    const gifts = (await giftsRes.json()) as Array<{ receipted: boolean }>
    expect(
      gifts.every((g) => !g.receipted),
      'gifts un-marked after receipt deletion',
    ).toBe(true)
  })

  test('a second receipt for the same donor+year is rejected', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const { donorId, year } = await createDonorWithPastYearGift(page, accessToken)

    const first = await page.request.post(`${API_BASE}/receipts/generate`, {
      headers: apiHeaders(accessToken),
      data: { donor_id: donorId, year },
    })
    expect(first.status()).toBe(201)
    const second = await page.request.post(`${API_BASE}/receipts/generate`, {
      headers: apiHeaders(accessToken),
      data: { donor_id: donorId, year },
    })
    expect(second.status(), 'duplicate donor+year receipt must 409').toBe(409)
  })
})
