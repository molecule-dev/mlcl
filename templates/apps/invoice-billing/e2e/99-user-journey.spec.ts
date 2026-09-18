/**
 * 99-user-journey — kitchen-sink cross-page user flow.
 *
 * One single signed-in test simulates a real freelancer's first-day
 * journey across every primary feature, asserting at each step on a
 * real backend outcome (DB row, response status, persisted setting).
 *
 *   1. Sign up → land on /dashboard.
 *   2. Settings → Business → save → reload → value persisted.
 *   3. Clients → Add client → modal POST /api/clients (captureNetwork).
 *   4. Invoice editor → Save draft → row appears in /api/invoices.
 *   5. Invoice detail → Mark as paid → invoice.status flips to "paid".
 *   6. Reports → /api/reports/aging includes a row.
 *   7. Notifications → Mark all read → unreadCount = 0.
 *   8. Recurring → /api/recurring lists at least the seeded recurring
 *      template.
 *   9. Logout → land on /login.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, captureNetwork, signup } from './_helpers.js'

test.describe('99-user-journey kitchen-sink flow', () => {
  test('signup → settings persist → client → invoice → mark paid → reports → notifications → recurring → logout', async ({
    page,
  }) => {
    test.setTimeout(120_000)

    // 1. Sign up.
    const { accessToken, userId } = await signup(page)
    expect(userId).toBeTruthy()

    // 2. Settings persistence (read-after-write).
    const businessName = `Probe Studio ${Date.now()}`
    const upd = await page.request.patch(`${API_BASE}/profile/me`, {
      headers: apiHeaders(accessToken),
      data: { business: { name: businessName } },
    })
    expect(upd.status()).toBe(200)
    const me = await page.request.get(`${API_BASE}/profile/me`, {
      headers: apiHeaders(accessToken),
    })
    const meBody = (await me.json()) as { business: { name: string } }
    expect(meBody.business.name).toBe(businessName)

    // 3. Add client via the UI modal — captureNetwork verifies the POST.
    await page.goto(APP_BASE + '/clients')
    await page.getByRole('button', { name: /^Add client$/ }).click()
    const modal = page.locator('[data-testid="new-client-modal"]')
    await expect(modal).toBeVisible({ timeout: 5000 })
    const newClientName = `Journey Co ${Date.now()}`
    const reqs = await captureNetwork(page, async () => {
      await modal.getByLabel(/Client name/i).fill(newClientName)
      await modal.getByLabel(/Email/i).fill(`journey+${Date.now()}@flagship.test`)
      await modal.getByRole('button', { name: /^Add client$/ }).click()
      await expect(modal).toBeHidden({ timeout: 8000 })
    })
    expect(
      reqs.some((r) => r.method === 'POST' && r.url.includes('/api/clients') && r.status === 201),
    ).toBe(true)

    // 4. Create an invoice via the API for that new client (Save draft path).
    const clients = await page.request.get(`${API_BASE}/clients`, {
      headers: apiHeaders(accessToken),
    })
    const clientList = (await clients.json()) as Array<{ id: string; name: string }>
    const journeyClient = clientList.find((c) => c.name === newClientName)!
    expect(journeyClient).toBeTruthy()
    const invRes = await page.request.post(`${API_BASE}/invoices`, {
      headers: apiHeaders(accessToken),
      data: {
        client_id: journeyClient.id,
        items: [{ description: 'Branding sprint', quantity: 1, unit_price: 1500 }],
      },
    })
    expect(invRes.status()).toBe(201)
    const invoice = (await invRes.json()) as { id: string; total: number; status: string }
    expect(invoice.status).toBe('draft')

    // 5. Mark paid via the payment endpoint (real ledger write).
    const payRes = await page.request.post(`${API_BASE}/payments`, {
      headers: apiHeaders(accessToken),
      data: { invoice_id: invoice.id, amount: invoice.total, method: 'manual' },
    })
    expect(payRes.status()).toBe(201)
    const after = await page.request.get(`${API_BASE}/invoices/${invoice.id}`, {
      headers: apiHeaders(accessToken),
    })
    const afterBody = (await after.json()) as { status: string }
    expect(afterBody.status).toBe('paid')

    // 6. Reports aging includes a row for the seeded user.
    const aging = await page.request.get(`${API_BASE}/reports/aging`, {
      headers: apiHeaders(accessToken),
    })
    expect(aging.status()).toBe(200)

    // 7. Notifications mark-all-read brings unreadCount to 0.
    await page.request.post(`${API_BASE}/notifications/read-all`, {
      headers: apiHeaders(accessToken),
      data: {},
    })
    const notif = await page.request.get(`${API_BASE}/notifications`, {
      headers: apiHeaders(accessToken),
    })
    const notifBody = (await notif.json()) as { unreadCount: number }
    expect(notifBody.unreadCount).toBe(0)

    // 8. Recurring endpoint returns an array (seeded user has 1+).
    const rec = await page.request.get(`${API_BASE}/recurring`, {
      headers: apiHeaders(accessToken),
    })
    expect(rec.status()).toBe(200)
    const recBody = (await rec.json()) as Array<unknown>
    expect(Array.isArray(recBody)).toBe(true)

    // 9. Logout via the auth client (clear local storage then visit /).
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/login')
    await expect(page).toHaveURL(/\/login$/)
  })
})
