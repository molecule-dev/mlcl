/**
 * /customers — list, search, create form (toggle), navigate to detail.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, apiHeaders, captureNetwork, seedCustomer, signup } from './_helpers.js'

test.describe('customers page', () => {
  test('initial load issues GET /api/customers and renders heading', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/customers')
      await expect(page.getByRole('heading', { name: /customers/i, level: 1 })).toBeVisible()
    })
    const get = reqs.find((r) => r.method === 'GET' && /\/api\/customers(\?|$)/.test(r.url))
    expect(get?.status, 'GET /api/customers').toBeLessThan(400)
  })

  test('"New customer" toggles the create form and creates a customer (POST → list update)', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/customers')
    await page.getByRole('button', { name: /new customer/i }).click()
    const company = `Globex ${Date.now()}`
    await page
      .getByLabel(/company/i)
      .first()
      .fill(company)
    await page.getByLabel(/contact name/i).fill('Buyer Bot')
    await page.getByLabel(/contact email/i).fill(`buyer+${Date.now()}@globex.test`)
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /save customer/i }).click()
      await expect(page.getByText(company)).toBeVisible({ timeout: 10000 })
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/customers(\?|$)/.test(r.url))
    expect(post?.status, 'POST /api/customers').toBe(201)
  })

  test('created customer survives reload (read-after-write)', async ({ page }) => {
    const { accessToken } = await signup(page)
    const company = `Persisty ${Date.now()}`
    await seedCustomer(page, accessToken, { company })
    await page.goto(APP_BASE + '/customers')
    await expect(page.getByText(company)).toBeVisible({ timeout: 10000 })
    await page.reload()
    await expect(page.getByText(company)).toBeVisible({ timeout: 10000 })
  })

  test('search filters the visible rows by company name', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedCustomer(page, accessToken, { company: 'AAACorp' })
    await seedCustomer(page, accessToken, { company: 'BBBCorp' })
    await page.goto(APP_BASE + '/customers')
    await expect(page.getByText('AAACorp')).toBeVisible()
    await expect(page.getByText('BBBCorp')).toBeVisible()
    await page.getByPlaceholder(/search/i).fill('AAA')
    await expect(page.getByText('AAACorp')).toBeVisible()
    await expect(page.getByText('BBBCorp')).not.toBeVisible()
  })

  test('clicking a customer name navigates to /customers/:id', async ({ page }) => {
    const { accessToken } = await signup(page)
    const seeded = await seedCustomer(page, accessToken)
    await page.goto(APP_BASE + '/customers')
    await page.getByRole('link', { name: seeded.company }).click()
    await page.waitForURL(/\/customers\/[0-9a-f-]{36}/, { timeout: 5000 })
  })

  test('GET /api/customers returns array shape on a fresh account', async ({ page }) => {
    const { accessToken } = await signup(page)
    const res = await page.request.get(`${API_BASE}/customers`, {
      headers: apiHeaders(accessToken),
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })

  test('cross-tenant: customers seeded by user A do not leak to user B', async ({
    page,
    browser,
  }) => {
    const { accessToken: tokenA } = await signup(page)
    const seeded = await seedCustomer(page, tokenA, { company: `LeakProbe ${Date.now()}` })
    const ctxB = await browser.newContext()
    const pageB = await ctxB.newPage()
    await signup(pageB)
    await pageB.goto(APP_BASE + '/customers')
    await expect(pageB.getByText(seeded.company)).not.toBeVisible({ timeout: 5000 })
    await ctxB.close()
  })
})
