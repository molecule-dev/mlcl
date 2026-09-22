/**
 * /invoices/:id — invoice detail, Mark paid (read-after-write status flip),
 * Download CSV (data: URL with real fields), back link.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, captureNetwork, seedInvoice, signup } from './_helpers.js'

test.describe('invoice detail page', () => {
  test('loads invoice on mount and shows the auto-generated number', async ({ page }) => {
    const { accessToken } = await signup(page)
    const seeded = await seedInvoice(page, accessToken)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/invoices/${seeded.id}`)
      await expect(page.getByText(seeded.number ?? '')).toBeVisible({ timeout: 10000 })
    })
    expect(
      reqs.find((r) => r.method === 'GET' && new RegExp(`/api/invoices/${seeded.id}$`).test(r.url))
        ?.status,
    ).toBeLessThan(400)
    await expect(page.getByRole('heading', { name: /invoice/i, level: 1 })).toBeVisible()
  })

  test('Mark paid flips status to "paid" via PUT and persists across reload', async ({ page }) => {
    const { accessToken } = await signup(page)
    const seeded = await seedInvoice(page, accessToken, { status: 'sent' })
    await page.goto(APP_BASE + `/invoices/${seeded.id}`)
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /^mark paid$/i }).click()
      await expect(page.locator('article').getByText(/^paid$/i)).toBeVisible({ timeout: 10000 })
    })
    const put = reqs.find(
      (r) => r.method === 'PUT' && new RegExp(`/api/invoices/${seeded.id}$`).test(r.url),
    )
    expect(put?.status, 'PUT /api/invoices/:id status flip').toBeLessThan(400)
    // Read-after-write via API
    const fresh = await page.request.get(`${API_BASE}/invoices/${seeded.id}`, {
      headers: apiHeaders(accessToken),
    })
    const body = (await fresh.json()) as { status: string; paid_at?: string | null }
    expect(body.status).toBe('paid')
    expect(body.paid_at).toBeTruthy()
    // Reload and re-assert UI
    await page.reload()
    await expect(page.locator('article').getByText(/^paid$/i)).toBeVisible({ timeout: 10000 })
  })

  test('Download CSV link contains real number/customer/total in its data: URL', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const seeded = await seedInvoice(page, accessToken, {
      customer_name: 'CsvCo',
      subtotal_cents: 9999,
      total_cents: 9999,
      amount_cents: 9999,
    })
    await page.goto(APP_BASE + `/invoices/${seeded.id}`)
    const link = page.getByRole('link', { name: /download csv/i })
    await expect(link).toBeVisible()
    const href = await link.getAttribute('href')
    expect(href).toMatch(/^data:text\/csv/)
    const decoded = decodeURIComponent((href ?? '').replace(/^data:text\/csv;charset=utf-8,/, ''))
    expect(decoded).toContain(`number,${seeded.number}`)
    expect(decoded).toContain('CsvCo')
    expect(decoded).toContain('total_cents,9999')
  })

  test('back link returns to /invoices', async ({ page }) => {
    const { accessToken } = await signup(page)
    const seeded = await seedInvoice(page, accessToken)
    await page.goto(APP_BASE + `/invoices/${seeded.id}`)
    await page.getByRole('link', { name: /All invoices/ }).click()
    await page.waitForURL('**/invoices', { timeout: 5000 })
  })

  test('non-existent id renders the missing-invoice placeholder', async ({ page }) => {
    // The 404 from GET /api/invoices/:id IS the case under test.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: /status of 404/,
    })
    await signup(page)
    await page.goto(APP_BASE + '/invoices/00000000-0000-0000-0000-000000000000')
    await expect(page.getByRole('heading', { name: /Invoice record unavailable/i })).toBeVisible({
      timeout: 10000,
    })
  })
})
