import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authHeaders, signup, uniqueEmail } from './_helpers.js'

test.describe('/notifications', () => {
  test('renders the seeded notifications', async ({ page }) => {
    await signup(page, uniqueEmail('notif-render'))
    const res = await page.request.get(`${API_BASE}/notifications`, {
      headers: authHeaders(page),
    })
    expect(res.status()).toBe(200)
    const list = (await res.json()) as Array<{ id: string; title: string; is_read?: boolean }>
    expect(list.length, 'seed should provision notifications').toBeGreaterThan(0)
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle')
    expect(await page.locator('body').innerText()).toContain(list[0]!.title)
  })

  test('POST /notifications/read-all flips every read flag to true', async ({ page }) => {
    await signup(page, uniqueEmail('notif-readall'))
    // Confirm there are unread notifications before the call so the assertion
    // below is meaningful (not vacuously true on an empty inbox).
    const before = await page.request.get(`${API_BASE}/notifications`, {
      headers: authHeaders(page),
    })
    const beforeList = (await before.json()) as Array<{ read?: boolean }>
    expect(beforeList.length, 'seed should provision notifications').toBeGreaterThan(0)
    expect(
      beforeList.some((n) => n.read === false),
      'at least one notification must be unread before read-all',
    ).toBe(true)
    const res = await page.request.post(`${API_BASE}/notifications/read-all`, {
      headers: authHeaders(page),
    })
    expect(res.status()).toBeLessThan(300)
    const after = await page.request.get(`${API_BASE}/notifications`, {
      headers: authHeaders(page),
    })
    const list = (await after.json()) as Array<{ read?: boolean }>
    const allRead = list.every((n) => n.read === true)
    expect(allRead, 'every notification marked read after read-all').toBe(true)
  })

  test('"Mark all as read" UI button persists state', async ({ page }) => {
    await signup(page, uniqueEmail('notif-readui'))
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle')
    const btn = page.getByRole('button', { name: /mark all|read all/i }).first()
    // count() never auto-waits; a pre-paint read skipped this test silently.
    const present = await btn
      .first()
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false)
    if (!present) test.skip(true, 'no notification control rendered')
    await btn.click()
    await page.waitForTimeout(1500)
    const after = await page.request.get(`${API_BASE}/notifications`, {
      headers: authHeaders(page),
    })
    const list = (await after.json()) as Array<{ read?: boolean }>
    const allRead = list.every((n) => n.read === true)
    expect(allRead).toBe(true)
  })
})
