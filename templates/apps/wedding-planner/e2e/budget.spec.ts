import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, signup, uniqueEmail } from './_helpers.js'

test.describe('/budget page', () => {
  test('renders the totals banner and one card per API category', async ({ page }) => {
    const email = uniqueEmail('budget-view')
    const { accessToken } = await signup(page, email)
    await page.goto(APP_BASE + '/budget')
    await expect(page.locator('[data-mol-id="page-budget"]')).toBeVisible({ timeout: 15000 })

    const data = (await (
      await page.request.get(`${API_BASE}/budget`, { headers: apiHeaders(accessToken) })
    ).json()) as { by_category: Array<{ category: string }>; items: unknown[] }
    expect(data.items.length).toBeGreaterThan(0)
    await expect(page.locator('[data-mol-id="budget-totals"]')).toBeVisible()
    for (const cat of data.by_category) {
      await expect(page.locator(`[data-mol-id="budget-category-${cat.category}"]`)).toBeVisible()
    }
  })

  test('add line item POSTs and renders a new row', async ({ page }) => {
    const email = uniqueEmail('budget-add')
    const { accessToken } = await signup(page, email)
    await page.goto(APP_BASE + '/budget')
    await expect(page.locator('[data-mol-id="page-budget"]')).toBeVisible({ timeout: 15000 })

    const label = `E2E line ${Date.now()}`
    await page.locator('[data-mol-id="budget-toggle-form"]').click()
    await page.locator('[data-mol-id="budget-form-label"]').fill(label)
    await page.locator('[data-mol-id="budget-form-estimated"]').fill('1234')
    await page.locator('[data-mol-id="budget-form-actual"]').fill('1000')
    // Arm the POST waiter BEFORE clicking submit — the API readback below must
    // not race the form's own request.
    const posted = page.waitForResponse(
      (r) => /\/api\/budget(\?|$)/.test(r.url()) && r.request().method() === 'POST',
      { timeout: 15000 },
    )
    await page.locator('[data-mol-id="budget-form-submit"]').click()
    expect((await posted).status()).toBeLessThan(400)

    const data = (await (
      await page.request.get(`${API_BASE}/budget`, { headers: apiHeaders(accessToken) })
    ).json()) as { items: Array<{ id: string; label: string; estimated_cents: number }> }
    const created = data.items.find((i) => i.label === label)
    expect(created?.estimated_cents).toBe(123400)
    await expect(page.locator(`[data-mol-id="budget-row-${created?.id}"]`)).toBeVisible({
      timeout: 10000,
    })
  })

  test('inline edit saves new estimated/actual amounts', async ({ page }) => {
    const email = uniqueEmail('budget-edit')
    const { accessToken } = await signup(page, email)

    // Seed via the API BEFORE the page loads — the table renders from the
    // page's own initial fetch, so a row created afterwards never appears
    // until a reload. GET /wedding first: it lazily provisions the starter
    // kit (awaited server-side) so the POST can never 404 on a missing
    // wedding if the dashboard's own seeding fetch is still in flight.
    await page.request.get(`${API_BASE}/wedding`, { headers: apiHeaders(accessToken) })
    const created = await page.request.post(`${API_BASE}/budget`, {
      headers: apiHeaders(accessToken),
      data: { label: `Edit me ${Date.now()}`, category: 'decor', estimated_cents: 50000 },
    })
    const item = (await created.json()) as { id: string }

    await page.goto(APP_BASE + '/budget')
    await expect(page.locator('[data-mol-id="page-budget"]')).toBeVisible({ timeout: 15000 })

    await page.locator(`[data-mol-id="budget-edit-${item.id}"]`).click()
    await page.locator(`[data-mol-id="budget-edit-estimated-${item.id}"]`).fill('600')
    await page.locator(`[data-mol-id="budget-edit-actual-${item.id}"]`).fill('650')
    await page.locator(`[data-mol-id="budget-save-${item.id}"]`).click()

    const data = (await (
      await page.request.get(`${API_BASE}/budget`, { headers: apiHeaders(accessToken) })
    ).json()) as { items: Array<{ id: string; estimated_cents: number; actual_cents: number }> }
    const row = data.items.find((i) => i.id === item.id)
    expect(row?.estimated_cents).toBe(60000)
    expect(row?.actual_cents).toBe(65000)
  })

  test('over-estimate actuals flip the delta chip to over', async ({ page }) => {
    const email = uniqueEmail('budget-over')
    const { accessToken } = await signup(page, email)

    // The starter kit carries ~$29k of estimates, so the actual must dwarf it
    // for the delta chip to flip to "over" ($10k was not enough — it left
    // "$6,289 to spend").
    await page.request.get(`${API_BASE}/wedding`, { headers: apiHeaders(accessToken) })
    const created = await page.request.post(`${API_BASE}/budget`, {
      headers: apiHeaders(accessToken),
      data: {
        label: `Overspend ${Date.now()}`,
        estimated_cents: 100,
        actual_cents: 999_999_999,
      },
    })
    expect(created.status()).toBeLessThan(400)

    await page.goto(APP_BASE + '/budget')
    await expect(page.locator('[data-mol-id="budget-delta-chip"]')).toContainText(/over/i, {
      timeout: 15000,
    })
  })
})
