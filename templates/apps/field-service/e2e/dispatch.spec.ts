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

async function gotoDispatch(page: import('@playwright/test').Page) {
  await page.goto(APP_BASE + '/dispatch')
  await expect(page.getByRole('heading', { name: /dispatch board/i, level: 1 })).toBeVisible({
    timeout: 15000,
  })
}

/** Create an unassigned job through the API — the dispatch queue's input. */
async function createUnassignedJob(
  page: import('@playwright/test').Page,
  accessToken: string,
  customerId: string,
): Promise<string> {
  const res = await page.request.post(API_BASE + '/jobs', {
    headers: apiHeaders(accessToken),
    data: {
      customer_id: customerId,
      title: `E2E Dispatch Job ${Date.now() % 100000}`,
      description: 'Created by the e2e suite for dispatch.',
    },
  })
  expect(res.status(), await res.text()).toBe(201)
  const job = (await res.json()) as { id: string }
  return job.id
}

test.describe('dispatch', () => {
  test('board renders technician rows and six day columns', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const reqs = await captureNetwork(page, async () => {
      await gotoDispatch(page)
    })
    const techReq = reqs.find((r) => /\/api\/technicians(\?|$)/.test(r.url) && r.method === 'GET')
    expect(techReq?.status, 'GET /api/technicians').toBe(200)
    await expect(page.getByText(/waiting for a technician/i)).toBeVisible()
    // Monday..Saturday headers
    for (const day of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']) {
      await expect(
        page.getByRole('columnheader', { name: new RegExp(`^${day} `) }).first(),
      ).toBeVisible()
    }
  })

  test('week navigation buttons move the board a week', async ({ page }) => {
    await signup(page)
    await gotoDispatch(page)
    const next = page.getByRole('button', { name: /next week/i })
    await expect(next).toBeVisible()
    await next.click()
    await expect(page.getByText(/week of/i)).toBeVisible()
  })

  test('picking a queued job and scheduling assigns a technician', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const customerId = await firstCustomerId(page, accessToken)
    const jobId = await createUnassignedJob(page, accessToken, customerId)

    await gotoDispatch(page)
    const chip = page.getByRole('button', { name: /E2E Dispatch Job/ })
    await expect(chip).toBeVisible({ timeout: 10000 })
    await chip.click()

    // Pick the first active technician and the first day column.
    await page.getByLabel(/^technician$/i).selectOption({ index: 1 })
    await page.getByLabel(/^day$/i).selectOption({ index: 1 })
    await page.getByRole('button', { name: /^schedule$/i }).click()

    // Read-after-write: the job now carries the technician and a schedule window.
    await expect
      .poll(
        async () => {
          const res = await page.request.get(API_BASE + `/jobs/${jobId}`, {
            headers: apiHeaders(accessToken),
          })
          const job = (await res.json()) as {
            technician_id: string | null
            scheduled_start: string | null
          }
          return job.technician_id != null && job.scheduled_start != null
        },
        { timeout: 15000 },
      )
      .toBe(true)
  })
})
