import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { API_BASE, APP_BASE, apiHeaders, firstCustomerId, signup, waitForSeed } from './_helpers.js'

/** Drive a job through to a DRAFT invoice via the API; returns invoice id. */
async function createDraftInvoice(
  page: import('@playwright/test').Page,
  accessToken: string,
): Promise<string> {
  const customerId = await firstCustomerId(page, accessToken)
  const jobRes = await page.request.post(API_BASE + '/jobs', {
    headers: apiHeaders(accessToken),
    data: {
      customer_id: customerId,
      title: `E2E Invoice Job ${Date.now() % 100000}`,
      description: 'Created by the e2e suite for invoicing.',
    },
  })
  expect(jobRes.status(), await jobRes.text()).toBe(201)
  const job = (await jobRes.json()) as { id: string }

  const completeRes = await page.request.post(`${API_BASE}/jobs/${job.id}/status`, {
    headers: apiHeaders(accessToken),
    data: { status: 'completed' },
  })
  expect(completeRes.status(), await completeRes.text()).toBe(200)

  const invoiceRes = await page.request.post(`${API_BASE}/jobs/${job.id}/invoice`, {
    headers: apiHeaders(accessToken),
  })
  expect(invoiceRes.status(), await invoiceRes.text()).toBe(201)
  const invoice = (await invoiceRes.json()) as { id: string }
  return invoice.id
}

test.describe('invoice detail', () => {
  test('detail page renders number, line items, total and status actions', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const invoiceId = await createDraftInvoice(page, accessToken)
    await page.goto(APP_BASE + `/invoices/${invoiceId}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/^total$/i).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /^send invoice$/i })).toBeVisible()
    await expect(page.getByText(/status is record-keeping only/i)).toBeVisible()
  })

  test('send → mark paid walks the invoice lifecycle', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const invoiceId = await createDraftInvoice(page, accessToken)
    await page.goto(APP_BASE + `/invoices/${invoiceId}`)
    await page.getByRole('button', { name: /^send invoice$/i }).click()
    await expect(page.getByRole('button', { name: /^mark paid$/i })).toBeVisible({
      timeout: 10000,
    })
    await page.getByRole('button', { name: /^mark paid$/i }).click()
    await expect(page.getByText(/^paid$/i).first()).toBeVisible({ timeout: 10000 })
  })
})
