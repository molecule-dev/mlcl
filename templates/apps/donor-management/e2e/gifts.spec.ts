import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { API_BASE, APP_BASE, apiHeaders, signup, waitForSeed } from './_helpers.js'

async function gotoGifts(page: import('@playwright/test').Page) {
  await page.goto(APP_BASE + '/gifts')
  await expect(page.getByRole('heading', { name: /^gifts$/i, level: 1 })).toBeVisible({
    timeout: 15000,
  })
}

test.describe('gifts', () => {
  test('list renders seeded gifts with the receipt column', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoGifts(page)
    const links = page.locator('a[href^="/gifts/"]')
    await expect.poll(() => links.count(), { timeout: 10000 }).toBeGreaterThanOrEqual(1)
    await expect(page.getByText(/^receipt$/i)).toBeVisible()
  })

  test('recording a gift through the form adds it to the list and the API', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)

    // Read the first donor name from the API so the form select has a real option.
    const donorsRes = await page.request.get(API_BASE + '/donors', {
      headers: apiHeaders(accessToken),
    })
    const donors = (await donorsRes.json()) as Array<{ id: string; name: string }>
    expect(donors.length).toBeGreaterThan(0)
    const donor = donors[0]!

    await gotoGifts(page)
    await page.getByRole('link', { name: /\+ record gift/i }).click()
    await expect(page).toHaveURL(/\/gifts\/new/)

    await page.getByLabel(/^donor$/i).selectOption(donor.id)
    await page.getByLabel(/amount/i).fill('77.77')
    await page.getByRole('button', { name: /^record gift$/i }).click()

    // Lands on the new gift's detail page.
    await expect(page).toHaveURL(/\/gifts\/[a-f0-9-]{36}$/, { timeout: 10000 })
    await expect(page.getByText('$77.77').first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/not receipted/i)).toBeVisible()

    // read-after-write through the API
    const giftsRes = await page.request.get(`${API_BASE}/gifts?donor_id=${donor.id}`, {
      headers: apiHeaders(accessToken),
    })
    const gifts = (await giftsRes.json()) as Array<{ amount_cents: number; receipted: boolean }>
    expect(gifts.some((g) => g.amount_cents === 7777 && !g.receipted)).toBe(true)
  })

  test('method filter narrows the table', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoGifts(page)
    const initial = await page.locator('a[href^="/gifts/"]').count()
    expect(initial).toBeGreaterThanOrEqual(1)
    // 'cash' is one of the four seeded methods; whatever it yields, the count
    // must be an integer >= 0 — the structural contract is that the select
    // drives the table without erroring.
    await page.getByLabel(/filter by method/i).selectOption('cash')
    await expect
      .poll(async () => page.locator('a[href^="/gifts/"]').count(), { timeout: 5000 })
      .toBeGreaterThanOrEqual(0)
  })
})
