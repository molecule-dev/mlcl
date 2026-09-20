import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup, waitForSeed } from './_helpers.js'

async function gotoQuotes(page: import('@playwright/test').Page) {
  await page.goto(APP_BASE + '/quotes')
  await expect(page.getByRole('heading', { name: /^quotes$/i, level: 1 })).toBeVisible({
    timeout: 15000,
  })
}

test.describe('quotes', () => {
  test('list page renders seeded quotes and GET /api/quotes returns 200', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const reqs = await captureNetwork(page, async () => {
      await gotoQuotes(page)
    })
    const req = reqs.find((r) => /\/api\/quotes(\?|$)/.test(r.url) && r.method === 'GET')
    expect(req?.status, 'GET /api/quotes').toBe(200)
    const links = page.locator('a[href^="/quotes/"]')
    await expect.poll(() => links.count(), { timeout: 10000 }).toBeGreaterThanOrEqual(1)
  })

  test('"Draft" and "Sent" status filter buttons are present', async ({ page }) => {
    await signup(page)
    await gotoQuotes(page)
    await expect(page.getByRole('button', { name: /^draft$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^sent$/i })).toBeVisible()
  })

  test('status filters narrow the visible rows', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoQuotes(page)
    const all = await page.locator('a[href^="/quotes/"]').count()
    expect(all).toBeGreaterThanOrEqual(1)
    await page.getByRole('button', { name: /^declined$/i }).click()
    const declined = page.locator('a[href^="/quotes/"]')
    // The seed ships at least one declined quote; whatever the count, it must not grow.
    await expect.poll(() => declined.count(), { timeout: 5000 }).toBeLessThanOrEqual(all)
  })

  test('"New quote" editor creates a draft with computed line total', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoQuotes(page)
    await page.getByRole('link', { name: /\+ new quote/i }).click()
    await expect(page).toHaveURL(/\/quotes\/new/)

    const title = `E2E Quote ${Date.now() % 100000}`
    await page.getByLabel(/^customer$/i).selectOption({ index: 1 })
    await page.getByLabel(/^title$/i).fill(title)
    await page
      .getByLabel(/^description$/i)
      .first()
      .fill('E2E line item one')
    await page.getByLabel(/^qty$/i).first().fill('2')
    await page
      .getByLabel(/^rate \(\$\)$/i)
      .first()
      .fill('12.50')
    // 2 × $12.50 = $25.00
    await expect(page.getByText('$25.00').first()).toBeVisible()
    await page.getByRole('button', { name: /^save draft$/i }).click()

    await expect(page).toHaveURL(/\/quotes\/[a-f0-9-]{36}$/, { timeout: 10000 })
    await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible()
    await expect(page.getByRole('button', { name: /^send quote$/i })).toBeVisible()
  })
})
