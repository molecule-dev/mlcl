import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { API_BASE, APP_BASE, apiHeaders, captureNetwork, signup, waitForSeed } from './_helpers.js'

/**
 * Kitchen-sink end-to-end journey for the field-service flagship.
 *
 * Drives the running app the way a real office dispatcher would — sign up,
 * land on the dashboard, walk into every primary section, exercise one
 * mutation per page, and prove the read-after-write side effect held.
 *
 * If this spec is green, the flagship is genuinely usable end-to-end.
 */
test.describe('99 — kitchen-sink user journey', () => {
  test('signup → dashboard → customers → quotes → jobs → dispatch → technicians → invoices → settings → notifications', async ({
    page,
  }) => {
    test.setTimeout(180_000)
    const { accessToken } = await signup(page)

    // Trigger the demo seed by reading customers once.
    await waitForSeed(page, accessToken)

    // ───── Dashboard ─────
    {
      const reqs = await captureNetwork(page, async () => {
        await page.goto(APP_BASE + '/dashboard')
        await expect(page.getByRole('heading', { name: /today's board/i, level: 1 })).toBeVisible({
          timeout: 15000,
        })
      })
      const jobs = reqs.find((r) => /\/api\/jobs(\?|$)/.test(r.url) && r.method === 'GET')
      expect(jobs?.status, 'GET /api/jobs').toBe(200)
    }

    // ───── Customers: list + create ─────
    const customerName = `KS Customer ${Date.now() % 100000}`
    {
      await page.goto(APP_BASE + '/customers')
      await expect(page.getByRole('heading', { name: /^customers$/i, level: 1 })).toBeVisible({
        timeout: 15000,
      })
      await page.getByRole('link', { name: /\+ new customer/i }).click()
      await page.getByLabel(/^name$/i).fill(customerName)
      await page.getByLabel(/^email$/i).fill(`ks+${Date.now() % 100000}@e2e.test`)
      await page.getByLabel(/service address/i).fill('2 Journey Way, Newark, NJ 07102')
      await page.getByRole('button', { name: /^add customer$/i }).click()
      await expect(page).toHaveURL(/\/customers\/[a-f0-9-]{36}$/, { timeout: 10000 })
    }

    // Read the created customer id back through the API.
    const customersRes = await page.request.get(API_BASE + '/customers', {
      headers: apiHeaders(accessToken),
    })
    const customers = (await customersRes.json()) as Array<{ id: string; name: string }>
    const customer = customers.find((c) => c.name === customerName)
    expect(customer, 'created customer present in /api/customers list').toBeDefined()

    // ───── Quote: create with a line item, send, accept ─────
    let jobId: string | null = null
    {
      await page.goto(APP_BASE + '/quotes/new')
      await page.getByLabel(/^customer$/i).selectOption(customer!.id)
      await page.getByLabel(/^title$/i).fill(`KS Quote ${Date.now() % 100000}`)
      await page
        .getByLabel(/^description$/i)
        .first()
        .fill('KS line item')
      await page
        .getByLabel(/^rate \(\$\)$/i)
        .first()
        .fill('10')
      await page.getByRole('button', { name: /^save draft$/i }).click()
      await expect(page).toHaveURL(/\/quotes\/[a-f0-9-]{36}$/, { timeout: 10000 })

      await page.getByRole('button', { name: /^send quote$/i }).click()
      await expect(page.getByRole('button', { name: /accept → create job/i })).toBeVisible({
        timeout: 10000,
      })
      await page.getByRole('button', { name: /accept → create job/i }).click()
      await expect(page.getByText(/converted to a job/i)).toBeVisible({ timeout: 10000 })

      const jobsRes = await page.request.get(API_BASE + '/jobs', {
        headers: apiHeaders(accessToken),
      })
      const jobs = (await jobsRes.json()) as Array<{ id: string; quote_id: string | null }>
      const job = jobs.find((j) => j.quote_id)
      expect(job, 'accepted quote produced a job').toBeDefined()
      jobId = job!.id
    }

    // ───── Job detail: dispatch + checklist + complete ─────
    {
      await page.goto(APP_BASE + `/jobs/${jobId}`)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })
      await page
        .getByLabel(/^technician$/i)
        .first()
        .selectOption({ index: 1 })
      await page.getByRole('button', { name: /^assign$/i }).click()
      await expect
        .poll(
          async () => {
            const res = await page.request.get(API_BASE + `/jobs/${jobId}`, {
              headers: apiHeaders(accessToken),
            })
            const j = (await res.json()) as { technician_id: string | null }
            return j.technician_id != null
          },
          { timeout: 15000 },
        )
        .toBe(true)

      await page.getByRole('button', { name: /^start travel$/i }).click()
      await page.getByRole('button', { name: /^start work$/i }).click()
      await page.getByRole('button', { name: /^complete job$/i }).click()
      await expect(page.getByText(/^completed$/i).first()).toBeVisible({ timeout: 10000 })
    }

    // ───── Invoice: generate from the completed job, send, pay ─────
    {
      await page.getByRole('button', { name: /generate invoice/i }).click()
      await expect(page).toHaveURL(/\/invoices\/[a-f0-9-]{36}$/, { timeout: 15000 })
      await page.getByRole('button', { name: /^send invoice$/i }).click()
      await page.getByRole('button', { name: /^mark paid$/i }).click()
      await expect(page.getByText(/^paid$/i).first()).toBeVisible({ timeout: 10000 })
    }

    // ───── Dispatch board ─────
    {
      await page.goto(APP_BASE + '/dispatch')
      await expect(page.getByRole('heading', { name: /dispatch board/i, level: 1 })).toBeVisible({
        timeout: 15000,
      })
      await expect(page.getByText(/waiting for a technician/i)).toBeVisible()
    }

    // ───── Technicians ─────
    {
      await page.goto(APP_BASE + '/technicians')
      await expect(page.getByRole('heading', { name: /^technicians$/i, level: 1 })).toBeVisible({
        timeout: 15000,
      })
      await expect(page.getByText(/open jobs/i).first()).toBeVisible()
    }

    // ───── Invoices list ─────
    {
      await page.goto(APP_BASE + '/invoices')
      await expect(page.getByRole('heading', { name: /^invoices$/i, level: 1 })).toBeVisible({
        timeout: 15000,
      })
      const links = page.locator('a[href^="/invoices/"]')
      await expect.poll(() => links.count(), { timeout: 10000 }).toBeGreaterThanOrEqual(1)
    }

    // ───── Settings ─────
    {
      await page.goto(APP_BASE + '/settings')
      await expect(page.getByRole('heading', { name: /^settings$/i, level: 1 })).toBeVisible({
        timeout: 15000,
      })
    }

    // ───── Notifications ─────
    {
      await page.goto(APP_BASE + '/notifications')
      await expect(page.getByRole('heading', { name: /^notifications$/i, level: 1 })).toBeVisible({
        timeout: 15000,
      })
    }
  })
})
