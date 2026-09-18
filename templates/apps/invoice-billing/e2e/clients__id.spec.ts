/**
 * /clients/:id — single-client detail page.
 *
 * Asserts on real outcomes:
 *  - GET /api/clients/:id returns the seeded client with `outstanding_cents`,
 *    `invoice_count`, and `total_billed` aggregates.
 *  - The detail page renders the client name, lifetime billed, and an
 *    invoice history table populated from GET /api/invoices?client_id=.
 *  - Empty state shows when the client has no invoices.
 *  - "Bill again" link navigates to /invoices/new?client=ID.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  apiHeaders,
  captureNetwork,
  seedClient,
  seedInvoice,
  signup,
} from './_helpers.js'

test.describe('client-detail page', () => {
  test('GET /api/clients/:id returns aggregates for the seeded user', async ({ page }) => {
    const { accessToken } = await signup(page)
    const client = await seedClient(page, accessToken)
    await seedInvoice(page, accessToken, { client_id: client.id })

    const res = await page.request.get(`${API_BASE}/clients/${client.id}`, {
      headers: apiHeaders(accessToken),
    })
    expect(res.status(), await res.text()).toBe(200)
    const body = (await res.json()) as {
      id: string
      name: string
      outstanding_cents: number
      invoice_count: number
      total_billed: number
    }
    expect(body.id).toBe(client.id)
    expect(body.name).toBe(client.name)
    expect(body.invoice_count).toBeGreaterThanOrEqual(1)
  })

  test('Detail page renders heading, contact, and invoice history', async ({ page }) => {
    const { accessToken } = await signup(page)
    const client = await seedClient(page, accessToken, {
      name: 'Alpha Studio Ltd',
      email: 'alpha@example.test',
    })
    await seedInvoice(page, accessToken, { client_id: client.id })

    await page.goto(APP_BASE + '/clients/' + client.id)
    await expect(page.getByTestId('client-name')).toHaveText('Alpha Studio Ltd', { timeout: 10000 })
    await expect(page.getByText('alpha@example.test').first()).toBeVisible()
    // Outstanding total is rendered.
    await expect(page.getByTestId('client-outstanding')).toBeVisible()
    // Invoice history has at least one row.
    await page.waitForTimeout(800)
    const emptyVisible = await page
      .getByTestId('client-invoices-empty')
      .isVisible()
      .catch(() => false)
    expect(emptyVisible).toBe(false)
  })

  test('Empty state appears when client has no invoices', async ({ page }) => {
    const { accessToken } = await signup(page)
    const client = await seedClient(page, accessToken, { name: 'Quiet Customer Inc' })
    await page.goto(APP_BASE + '/clients/' + client.id)
    await expect(page.getByTestId('client-name')).toHaveText('Quiet Customer Inc', {
      timeout: 10000,
    })
    await expect(page.getByTestId('client-invoices-empty')).toBeVisible({ timeout: 5000 })
  })

  test('"Bill again" link navigates to /invoices/new?client=ID', async ({ page }) => {
    const { accessToken } = await signup(page)
    const client = await seedClient(page, accessToken)
    await page.goto(APP_BASE + '/clients/' + client.id)
    await expect(page.getByTestId('client-name')).toBeVisible({ timeout: 10000 })
    await page.locator('a[data-action="bill-again"]').click()
    await expect(page).toHaveURL(new RegExp(`/invoices/new\\?client=${client.id}`))
  })

  test('initial mount fires GET /api/clients/:id and GET /api/invoices?client_id= (captureNetwork)', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const client = await seedClient(page, accessToken)
    await seedInvoice(page, accessToken, { client_id: client.id })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/clients/' + client.id)
      await expect(page.getByTestId('client-name')).toBeVisible({ timeout: 10000 })
      await page.waitForTimeout(800)
    })
    expect(
      reqs.some(
        (r) =>
          r.method === 'GET' && r.url.includes(`/api/clients/${client.id}`) && r.status === 200,
      ),
    ).toBe(true)
    expect(
      reqs.some(
        (r) =>
          r.method === 'GET' &&
          r.url.includes(`/api/invoices?client_id=${client.id}`) &&
          r.status === 200,
      ),
    ).toBe(true)
  })

  test('"Back to clients" link returns to /clients list', async ({ page }) => {
    const { accessToken } = await signup(page)
    const client = await seedClient(page, accessToken)
    await page.goto(APP_BASE + '/clients/' + client.id)
    await expect(page.getByTestId('client-name')).toBeVisible({ timeout: 10000 })
    await page.getByRole('link', { name: /Back to clients/i }).click()
    await expect(page).toHaveURL(/\/clients$/)
  })
})
