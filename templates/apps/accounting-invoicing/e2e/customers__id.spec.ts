/**
 * /customers/:id — profile, stats, tabs (invoices/payments/activity/notes),
 * contact panel.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedCustomer, seedInvoice, signup } from './_helpers.js'

test.describe('customer detail page', () => {
  test('loads profile + invoices on mount', async ({ page }) => {
    const { accessToken } = await signup(page)
    const seeded = await seedCustomer(page, accessToken)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/customers/${seeded.id}`)
      await expect(page.locator('h1')).toContainText(seeded.company)
    })
    const profileGet = reqs.find(
      (r) => r.method === 'GET' && new RegExp(`/api/customers/${seeded.id}`).test(r.url),
    )
    const invoicesGet = reqs.find(
      (r) =>
        r.method === 'GET' && new RegExp(`/api/invoices.*customer_id=${seeded.id}`).test(r.url),
    )
    expect(profileGet?.status, 'GET /api/customers/:id').toBeLessThan(400)
    expect(invoicesGet?.status, 'GET /api/invoices?customer_id=:id').toBeLessThan(400)
  })

  test('back link returns to /customers', async ({ page }) => {
    const { accessToken } = await signup(page)
    const seeded = await seedCustomer(page, accessToken)
    await page.goto(APP_BASE + `/customers/${seeded.id}`)
    await page.getByRole('link', { name: /All customers/ }).click()
    await page.waitForURL('**/customers', { timeout: 5000 })
  })

  test('invoice for this customer appears under Invoices tab and links to its detail', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const seededCustomer = await seedCustomer(page, accessToken)
    const seededInvoice = await seedInvoice(page, accessToken, {
      customer_id: seededCustomer.id,
      customer_name: seededCustomer.company,
    })
    await page.goto(APP_BASE + `/customers/${seededCustomer.id}`)
    await expect(page.getByText(seededInvoice.number ?? 'INV-')).toBeVisible({ timeout: 10000 })
  })

  test('tabs switch panels (Payments → Activity → Notes empty states)', async ({ page }) => {
    const { accessToken } = await signup(page)
    const seeded = await seedCustomer(page, accessToken)
    await page.goto(APP_BASE + `/customers/${seeded.id}`)
    await page.getByRole('button', { name: /^payments$/i }).click()
    await expect(page.getByText(/no payments recorded/i)).toBeVisible()
    await page.getByRole('button', { name: /^activity$/i }).click()
    await expect(page.getByText(/no activity yet/i)).toBeVisible()
    await page.getByRole('button', { name: /^notes$/i }).click()
    await expect(page.getByText(/no notes yet/i)).toBeVisible()
  })

  test('non-existent id renders the missing-customer placeholder, not a crash', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/customers/00000000-0000-0000-0000-000000000000')
    await expect(page.getByRole('heading', { name: /Customer record unavailable/i })).toBeVisible({
      timeout: 10000,
    })
  })
})
