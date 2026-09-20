import { test, expect } from '@molecule/app-e2e-fixtures-default'
import {
  API_BASE,
  APP_BASE,
  apiHeaders,
  captureNetwork,
  firstCustomerId,
  signup,
  waitForSeed,
} from './_helpers.js'

async function createJobViaApi(
  page: import('@playwright/test').Page,
  accessToken: string,
  customerId: string,
): Promise<string> {
  const res = await page.request.post(API_BASE + '/jobs', {
    headers: apiHeaders(accessToken),
    data: {
      customer_id: customerId,
      title: `E2E Job ${Date.now() % 100000}`,
      description: 'Created by the e2e suite.',
      checklist: ['E2E step one', 'E2E step two'],
    },
  })
  expect(res.status(), await res.text()).toBe(201)
  const job = (await res.json()) as { id: string }
  return job.id
}

test.describe('job detail', () => {
  test('detail page renders window, technician, address, checklist and notes', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const customerId = await firstCustomerId(page, accessToken)
    const jobId = await createJobViaApi(page, accessToken, customerId)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/jobs/${jobId}`)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })
    })
    const req = reqs.find((r) => /\/api\/jobs\/[a-f0-9-]{36}/.test(r.url) && r.method === 'GET')
    expect(req?.status, 'GET /api/jobs/:id').toBe(200)
    await expect(page.getByText(/schedule window/i)).toBeVisible()
    await expect(page.getByText(/^technician$/i)).toBeVisible()
    await expect(page.getByText(/service address/i)).toBeVisible()
    await expect(page.getByText(/^checklist$/i)).toBeVisible()
    await expect(page.getByText(/notes timeline/i)).toBeVisible()
    await expect(page.getByText(/0 of 2 done/i)).toBeVisible()
  })

  test('adding a checklist item grows the progress count', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const customerId = await firstCustomerId(page, accessToken)
    const jobId = await createJobViaApi(page, accessToken, customerId)
    await page.goto(APP_BASE + `/jobs/${jobId}`)
    await expect(page.getByText(/0 of 2 done/i)).toBeVisible({ timeout: 10000 })
    await page.getByPlaceholder(/add a checklist item/i).fill('E2E step three')
    await page.getByRole('button', { name: /^add$/i }).click()
    await expect(page.getByText(/0 of 3 done/i)).toBeVisible({ timeout: 10000 })
  })

  test('posting a note appends to the timeline', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const customerId = await firstCustomerId(page, accessToken)
    const jobId = await createJobViaApi(page, accessToken, customerId)
    await page.goto(APP_BASE + `/jobs/${jobId}`)
    const noteText = `E2E note ${Date.now() % 100000}`
    await page.getByPlaceholder(/add a note for the timeline/i).fill(noteText)
    await page.getByRole('button', { name: /^post$/i }).click()
    await expect(page.getByText(noteText).first()).toBeVisible({ timeout: 10000 })
  })

  test('cancel action moves the job to cancelled', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const customerId = await firstCustomerId(page, accessToken)
    const jobId = await createJobViaApi(page, accessToken, customerId)
    await page.goto(APP_BASE + `/jobs/${jobId}`)
    await page.getByRole('button', { name: /^cancel job$/i }).click()
    await expect(page.getByText(/^cancelled$/i).first()).toBeVisible({ timeout: 10000 })
  })
})
