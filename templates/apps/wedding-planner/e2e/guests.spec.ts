import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, signup, uniqueEmail } from './_helpers.js'

test.describe('/guests page', () => {
  test('renders the starter rows the API returns', async ({ page }) => {
    const email = uniqueEmail('guests-list')
    const { accessToken } = await signup(page, email)
    await page.goto(APP_BASE + '/guests')

    const res = await page.request.get(`${API_BASE}/guests`, {
      headers: apiHeaders(accessToken),
    })
    const rows = ((await res.json()) as Array<{ id: string }>) ?? []
    expect(rows.length).toBeGreaterThan(0)

    await expect(page.locator('[data-mol-id="page-guests"]')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-mol-id="guests-count"]')).toContainText(String(rows.length))
    // Every API row has a rendered table row.
    for (const row of rows.slice(0, 5)) {
      await expect(page.locator(`[data-mol-id="guest-row-${row.id}"]`)).toBeVisible()
    }
  })

  test('add-guest form creates a row via POST /api/guests', async ({ page }) => {
    const email = uniqueEmail('guests-add')
    const { accessToken } = await signup(page, email)
    await page.goto(APP_BASE + '/guests')
    await expect(page.locator('[data-mol-id="page-guests"]')).toBeVisible({ timeout: 15000 })

    const before = await (
      await page.request.get(`${API_BASE}/guests`, { headers: apiHeaders(accessToken) })
    ).json()

    await page.locator('[data-mol-id="guests-toggle-form"]').click()
    const name = `E2E Guest ${Date.now()}`
    await page.locator('[data-mol-id="guests-form-name"]').fill(name)
    await page.locator('[data-mol-id="guests-form-side"]').selectOption('partner_b')
    // Arm the POST waiter BEFORE clicking submit — the API readback below must
    // not race the form's own request.
    const posted = page.waitForResponse(
      (r) => /\/api\/guests(\?|$)/.test(r.url()) && r.request().method() === 'POST',
      { timeout: 15000 },
    )
    await page.locator('[data-mol-id="guests-form-submit"]').click()
    expect((await posted).status()).toBeLessThan(400)

    const after = (await (
      await page.request.get(`${API_BASE}/guests`, { headers: apiHeaders(accessToken) })
    ).json()) as Array<{ id: string; name: string; side: string }>
    expect(after.length).toBe(before.length + 1)
    const created = after.find((g) => g.name === name)
    expect(created?.side).toBe('partner_b')
    await expect(page.locator(`[data-mol-id="guest-row-${created?.id}"]`)).toBeVisible({
      timeout: 10000,
    })
  })

  test('status filter narrows the table to matching rows', async ({ page }) => {
    const email = uniqueEmail('guests-filter')
    const { accessToken } = await signup(page, email)
    await page.goto(APP_BASE + '/guests')
    await expect(page.locator('[data-mol-id="page-guests"]')).toBeVisible({ timeout: 15000 })

    // The starter kit seeds lazily when the wedding row is created, so a
    // readback that races the seed commit computes the expected count from a
    // partial list — poll until seeded rows exist, then derive from API data.
    let pending: Array<{ rsvp_status: string }> = []
    await expect
      .poll(async () => {
        const res = await page.request.get(`${API_BASE}/guests`, {
          headers: apiHeaders(accessToken),
        })
        const all = (await res.json()) as Array<{ rsvp_status: string }>
        pending = all.filter((g) => g.rsvp_status === 'pending')
        return all.length
      })
      .toBeGreaterThan(0)

    await page.locator('[data-mol-id="guests-filter-status"]').selectOption('pending')
    await expect(page.locator('[data-mol-id="guests-count"]')).toContainText(
      String(pending.length),
      { timeout: 10000 },
    )
  })

  test('changing a status inline PUTs and updates the chip', async ({ page }) => {
    const email = uniqueEmail('guests-status')
    const { accessToken } = await signup(page, email)
    await page.goto(APP_BASE + '/guests')
    await expect(page.locator('[data-mol-id="page-guests"]')).toBeVisible({ timeout: 15000 })

    // Add a known pending guest, then flip it to yes in the UI.
    await page.locator('[data-mol-id="guests-toggle-form"]').click()
    const name = `Rsvp Flip ${Date.now()}`
    await page.locator('[data-mol-id="guests-form-name"]').fill(name)
    // Arm the POST waiter BEFORE clicking submit — the API readback below must
    // not race the form's own request.
    const posted = page.waitForResponse(
      (r) => /\/api\/guests(\?|$)/.test(r.url()) && r.request().method() === 'POST',
      { timeout: 15000 },
    )
    await page.locator('[data-mol-id="guests-form-submit"]').click()
    expect((await posted).status()).toBeLessThan(400)

    const list = (await (
      await page.request.get(`${API_BASE}/guests`, { headers: apiHeaders(accessToken) })
    ).json()) as Array<{ id: string; name: string }>
    const target = list.find((g) => g.name === name)
    expect(target).toBeTruthy()

    const select = page.locator(`[data-mol-id="guest-status-${target?.id}"]`)
    await expect(select).toBeVisible({ timeout: 10000 })
    // Arm the PUT waiter BEFORE changing the select — the API readback below
    // must not race the page's own request.
    const put = page.waitForResponse(
      (r) => /\/api\/guests\/[^/]+(\?|$)/.test(r.url()) && r.request().method() === 'PUT',
      { timeout: 15000 },
    )
    await select.selectOption('yes')
    expect((await put).status()).toBeLessThan(400)

    const after = (await (
      await page.request.get(`${API_BASE}/guests`, { headers: apiHeaders(accessToken) })
    ).json()) as Array<{ id: string; rsvp_status: string }>
    expect(after.find((g) => g.id === target?.id)?.rsvp_status).toBe('yes')
  })

  test('removing a guest deletes the row everywhere', async ({ page }) => {
    const email = uniqueEmail('guests-del')
    const { accessToken } = await signup(page, email)
    await page.goto(APP_BASE + '/guests')
    await expect(page.locator('[data-mol-id="page-guests"]')).toBeVisible({ timeout: 15000 })

    await page.locator('[data-mol-id="guests-toggle-form"]').click()
    const name = `Bye Guest ${Date.now()}`
    await page.locator('[data-mol-id="guests-form-name"]').fill(name)
    // Arm the POST waiter BEFORE clicking submit — the API readback below must
    // not race the form's own request.
    const posted = page.waitForResponse(
      (r) => /\/api\/guests(\?|$)/.test(r.url()) && r.request().method() === 'POST',
      { timeout: 15000 },
    )
    await page.locator('[data-mol-id="guests-form-submit"]').click()
    expect((await posted).status()).toBeLessThan(400)

    const list = (await (
      await page.request.get(`${API_BASE}/guests`, { headers: apiHeaders(accessToken) })
    ).json()) as Array<{ id: string; name: string }>
    const target = list.find((g) => g.name === name)
    expect(target).toBeTruthy()

    // Two-step inline confirm: the first click ARMS the button, the second
    // commits. The native window.confirm dialog is gone. Arm the DELETE
    // waiter BEFORE the commit click — the API readback below must not race
    // the page's own request.
    const removeBtn = page.locator(`[data-mol-id="guest-remove-${target?.id}"]`)
    await removeBtn.click()
    await expect(removeBtn).toContainText(`Remove ${name} from the list?`, { timeout: 5000 })
    const deleted = page.waitForResponse(
      (r) => /\/api\/guests\/[^/]+(\?|$)/.test(r.url()) && r.request().method() === 'DELETE',
      { timeout: 15000 },
    )
    await removeBtn.click()
    expect((await deleted).status()).toBeLessThan(400)

    const after = (await (
      await page.request.get(`${API_BASE}/guests`, { headers: apiHeaders(accessToken) })
    ).json()) as Array<{ id: string }>
    expect(after.find((g) => g.id === target?.id)).toBeUndefined()
  })
})
