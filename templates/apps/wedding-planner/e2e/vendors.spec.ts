import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, signup, uniqueEmail } from './_helpers.js'

test.describe('/vendors page', () => {
  test('renders pipeline chips and the seeded vendor rows', async ({ page }) => {
    const email = uniqueEmail('vendors-view')
    const { accessToken } = await signup(page, email)
    await page.goto(APP_BASE + '/vendors')
    await expect(page.locator('[data-mol-id="page-vendors"]')).toBeVisible({
      timeout: 15000,
    })

    const data = (await (
      await page.request.get(`${API_BASE}/vendors`, { headers: apiHeaders(accessToken) })
    ).json()) as { vendors: Array<{ id: string }>; status_counts: Record<string, number> }
    expect(data.vendors.length).toBeGreaterThan(0)

    for (const [status, count] of Object.entries(data.status_counts)) {
      const chip = page.locator(`[data-mol-id="vendors-count-${status}"]`)
      await expect(chip).toBeVisible()
      await expect(chip).toContainText(String(count))
    }
    for (const vendor of data.vendors.slice(0, 5)) {
      await expect(page.locator(`[data-mol-id="vendor-row-${vendor.id}"]`)).toBeVisible()
    }
  })

  test('add vendor POSTs and appears under its category', async ({ page }) => {
    const email = uniqueEmail('vendors-add')
    const { accessToken } = await signup(page, email)
    await page.goto(APP_BASE + '/vendors')
    await expect(page.locator('[data-mol-id="page-vendors"]')).toBeVisible({
      timeout: 15000,
    })

    const name = `E2E Florist ${Date.now()}`
    await page.locator('[data-mol-id="vendors-toggle-form"]').click()
    await page.locator('[data-mol-id="vendors-form-name"]').fill(name)
    await page.locator('[data-mol-id="vendors-form-category"]').selectOption('flowers')
    // Arm the POST waiter BEFORE clicking submit — the API readback below must
    // not race the form's own request.
    const posted = page.waitForResponse(
      (r) => /\/api\/vendors(\?|$)/.test(r.url()) && r.request().method() === 'POST',
      { timeout: 15000 },
    )
    await page.locator('[data-mol-id="vendors-form-submit"]').click()
    expect((await posted).status()).toBeLessThan(400)

    const data = (await (
      await page.request.get(`${API_BASE}/vendors`, { headers: apiHeaders(accessToken) })
    ).json()) as { vendors: Array<{ id: string; name: string; category: string }> }
    const created = data.vendors.find((v) => v.name === name)
    expect(created?.category).toBe('flowers')
    await expect(page.locator(`[data-mol-id="vendor-row-${created?.id}"]`)).toBeVisible({
      timeout: 10000,
    })
  })

  test('moving a vendor through the pipeline PUTs the status', async ({ page }) => {
    const email = uniqueEmail('vendors-status')
    const { accessToken } = await signup(page, email)

    // Seed via the API BEFORE the page loads — the list renders from the
    // page's own initial fetch, so a vendor added afterwards never shows its
    // status select until a reload. GET /wedding first so the lazily-seeded
    // starter kit exists for the POST.
    await page.request.get(`${API_BASE}/wedding`, { headers: apiHeaders(accessToken) })
    const created = await page.request.post(`${API_BASE}/vendors`, {
      headers: apiHeaders(accessToken),
      data: { name: `Pipeline ${Date.now()}`, category: 'music', status: 'researching' },
    })
    const vendor = (await created.json()) as { id: string }

    await page.goto(APP_BASE + '/vendors')
    await expect(page.locator('[data-mol-id="page-vendors"]')).toBeVisible({
      timeout: 15000,
    })

    const select = page.locator(`[data-mol-id="vendor-status-${vendor.id}"]`)
    await expect(select).toBeVisible({ timeout: 10000 })
    // Arm the PUT waiter BEFORE changing the select — the API readback below
    // must not race the page's own request.
    const put = page.waitForResponse(
      (r) => /\/api\/vendors\/[^/]+(\?|$)/.test(r.url()) && r.request().method() === 'PUT',
      { timeout: 15000 },
    )
    await select.selectOption('booked')
    expect((await put).status()).toBeLessThan(400)

    const data = (await (
      await page.request.get(`${API_BASE}/vendors`, { headers: apiHeaders(accessToken) })
    ).json()) as { vendors: Array<{ id: string; status: string }> }
    expect(data.vendors.find((v) => v.id === vendor.id)?.status).toBe('booked')
  })
})
