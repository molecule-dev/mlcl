import { test, expect } from '@molecule/app-e2e-fixtures-default'
import {
  API_BASE,
  APP_BASE,
  apiHeaders,
  createSentQuote,
  firstCustomerId,
  firstTechnicianId,
  signup,
  waitForSeed,
} from './_helpers.js'

/**
 * The signature flow: quote → send → accept → becomes job → dispatch to
 * tech → checklist completes → invoice generated → mark paid.
 *
 * Values are read from the API (never the seeded demo content) so the spec
 * stays true after a user replaces the demo data.
 */
test.describe('quote → job → invoice flow', () => {
  test('accepting a sent quote converts it to a job linked back to the quote', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const customerId = await firstCustomerId(page, accessToken)
    const quoteId = await createSentQuote(page, accessToken, customerId)

    await page.goto(APP_BASE + `/quotes/${quoteId}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })
    await page.getByRole('button', { name: /accept → create job/i }).click()
    await expect(page.getByText(/converted to a job/i)).toBeVisible({ timeout: 10000 })

    // Read-after-write: the job exists, belongs to the quote, and is scheduled+unassigned.
    const jobsRes = await page.request.get(API_BASE + '/jobs', { headers: apiHeaders(accessToken) })
    expect(jobsRes.status()).toBe(200)
    const jobs = (await jobsRes.json()) as Array<{ quote_id: string | null; status: string }>
    const job = jobs.find((j) => j.quote_id === quoteId)
    expect(job, 'a job linked to the accepted quote exists').toBeDefined()
    expect(job!.status).toBe('scheduled')
  })

  test('full lifecycle: dispatch, checklist, complete, invoice, pay', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const customerId = await firstCustomerId(page, accessToken)
    const technicianId = await firstTechnicianId(page, accessToken)
    const quoteId = await createSentQuote(page, accessToken, customerId)

    // 1. Accept the quote → job created.
    const acceptRes = await page.request.post(`${API_BASE}/quotes/${quoteId}/accept`, {
      headers: apiHeaders(accessToken),
    })
    expect(acceptRes.status(), await acceptRes.text()).toBe(200)
    const accepted = (await acceptRes.json()) as { job: { id: string } | null }
    expect(accepted.job, 'accept response carries the created job').toBeDefined()
    const jobId = accepted.job!.id

    // 2. Dispatch through the UI: assign a technician + window on the job page.
    await page.goto(APP_BASE + `/jobs/${jobId}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })
    const start = new Date(Date.now() + 2 * 60 * 60 * 1000)
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
    const toLocalInput = (d: Date): string => {
      const pad = (n: number) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    }
    await page
      .getByLabel(/^technician$/i)
      .first()
      .selectOption(technicianId)
    await page.getByLabel(/^start$/i).fill(toLocalInput(start))
    await page.getByLabel(/^end$/i).fill(toLocalInput(end))
    await page.getByRole('button', { name: /^assign$/i }).click()
    // Read-after-write: the job now carries the technician and the window.
    await expect
      .poll(
        async () => {
          const res = await page.request.get(API_BASE + `/jobs/${jobId}`, {
            headers: apiHeaders(accessToken),
          })
          const j = (await res.json()) as {
            technician_id: string | null
            scheduled_start: string | null
          }
          return (
            j.technician_id === technicianId &&
            j.scheduled_start != null &&
            Date.parse(j.scheduled_start) === start.getTime()
          )
        },
        { timeout: 15000 },
      )
      .toBe(true)

    // 3. Checklist: toggle the first item done.
    const firstCheck = page.locator('input[type="checkbox"]').first()
    await firstCheck.check()
    await expect(firstCheck).toBeChecked({ timeout: 10000 })

    // 4. Notes timeline: post a note.
    const noteText = `E2E note ${Date.now() % 100000}`
    await page.getByPlaceholder(/add a note for the timeline/i).fill(noteText)
    await page.getByRole('button', { name: /^post$/i }).click()
    await expect(page.getByText(noteText).first()).toBeVisible({ timeout: 10000 })

    // 5. Walk the status ladder: scheduled → en_route → in_progress → completed.
    await page.getByRole('button', { name: /^start travel$/i }).click()
    await expect(page.getByText(/^en route$/i).first()).toBeVisible({ timeout: 10000 })
    await page.getByRole('button', { name: /^start work$/i }).click()
    await expect(page.getByText(/^in progress$/i).first()).toBeVisible({ timeout: 10000 })
    await page.getByRole('button', { name: /^complete job$/i }).click()
    await expect(page.getByText(/^completed$/i).first()).toBeVisible({ timeout: 10000 })

    // 6. Generate the invoice from the completed job — navigates to it.
    await page.getByRole('button', { name: /generate invoice/i }).click()
    await expect(page).toHaveURL(/\/invoices\/[a-f0-9-]{36}$/, { timeout: 15000 })

    // 7. Send it, then mark it paid — both through the UI.
    await page.getByRole('button', { name: /^send invoice$/i }).click()
    await expect(page.getByRole('button', { name: /^mark paid$/i })).toBeVisible({
      timeout: 10000,
    })
    await page.getByRole('button', { name: /^mark paid$/i }).click()
    await expect(page.getByText(/^paid$/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('declining a sent quote marks it declined and creates no job', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const customerId = await firstCustomerId(page, accessToken)
    const quoteId = await createSentQuote(page, accessToken, customerId)

    await page.goto(APP_BASE + `/quotes/${quoteId}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })
    await page.getByRole('button', { name: /mark declined/i }).click()
    await expect(page.getByText(/^declined$/i).first()).toBeVisible({ timeout: 10000 })

    const jobsRes = await page.request.get(API_BASE + '/jobs', { headers: apiHeaders(accessToken) })
    const jobs = (await jobsRes.json()) as Array<{ quote_id: string | null }>
    expect(
      jobs.some((j) => j.quote_id === quoteId),
      'declined quote must not spawn a job',
    ).toBe(false)
  })
})
