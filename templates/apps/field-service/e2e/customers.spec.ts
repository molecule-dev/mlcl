import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { API_BASE, APP_BASE, apiHeaders, captureNetwork, signup, waitForSeed } from './_helpers.js'

async function gotoCustomers(page: import('@playwright/test').Page) {
  await page.goto(APP_BASE + '/customers')
  await expect(page.getByRole('heading', { name: /^customers$/i, level: 1 })).toBeVisible({
    timeout: 15000,
  })
}

test.describe('customers', () => {
  test('list page renders seeded book and GET /api/customers returns 200', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const reqs = await captureNetwork(page, async () => {
      await gotoCustomers(page)
    })
    const req = reqs.find((r) => /\/api\/customers(\?|$)/.test(r.url) && r.method === 'GET')
    expect(req?.status, 'GET /api/customers').toBe(200)
    const links = page.locator('a[href^="/customers/"]')
    await expect.poll(() => links.count(), { timeout: 10000 }).toBeGreaterThanOrEqual(1)
  })

  test('page heading "Customers" renders', async ({ page }) => {
    await signup(page)
    await gotoCustomers(page)
    await expect(page.getByRole('heading', { name: /^customers$/i, level: 1 })).toBeVisible()
  })

  test('search box narrows visible rows', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoCustomers(page)
    // Row links only — the header's "+ New customer" CTA (href="/customers/new")
    // also matches a[href^="/customers/"] and must not count as a row.
    const rowLinks = page.locator('a[href^="/customers/"]:not([href="/customers/new"])')
    const initial = await rowLinks.count()
    expect(initial).toBeGreaterThanOrEqual(1)
    await page.getByRole('searchbox').fill('zzzzz-no-match-zzzzz')
    await expect.poll(async () => rowLinks.count(), { timeout: 5000 }).toBe(0)
  })

  test('"New customer" page creates a row that survives reload', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoCustomers(page)
    await page.getByRole('link', { name: /\+ new customer/i }).click()
    await expect(page).toHaveURL(/\/customers\/new/)

    const name = `E2E Customer ${Date.now() % 100000}`
    await page.getByLabel(/^name$/i).fill(name)
    await page.getByLabel(/^email$/i).fill(`ops+${Date.now() % 100000}@e2e.test`)
    await page.getByLabel(/^phone$/i).fill('(555) 000-1111')
    await page.getByLabel(/service address/i).fill('1 Test Way, Newark, NJ 07102')
    await page.getByRole('button', { name: /^add customer$/i }).click()

    await expect(page).toHaveURL(/\/customers\/[a-f0-9-]{36}$/, { timeout: 10000 })
    await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible()
    await page.goto(APP_BASE + '/customers')
    await expect(page.getByRole('link', { name })).toBeVisible({ timeout: 10000 })

    // read-after-write through the API the page reads
    const list = await page.request.get(API_BASE + '/customers', {
      headers: apiHeaders(accessToken),
    })
    const rows = (await list.json()) as Array<{ name: string }>
    expect(
      rows.some((r) => r.name === name),
      'created customer present in /api/customers',
    ).toBe(true)
  })
})
