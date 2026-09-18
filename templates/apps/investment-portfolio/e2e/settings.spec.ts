import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authHeaders, captureNetwork, signup } from './_helpers.js'

test.describe('/settings', () => {
  test('Profile name PATCH round-trips through API and reload', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle').catch(() => {})

    const nameField = page
      .locator('label')
      .filter({ hasText: /Full name/i })
      .locator('input')
      .first()
    await nameField.fill('Renamed Investor')

    const calls = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /^Save changes$/ })
        .first()
        .click()
      await page.waitForTimeout(1500)
    })
    const patch = calls.find((c) => c.method === 'PATCH' && /\/api\/users\//.test(c.url))
    expect(patch, 'PATCH /api/users/* not seen').toBeTruthy()
    expect(patch?.status).toBeLessThan(400)

    const me = await page.request.get(`${API_BASE}/users/me`, {
      headers: authHeaders(accessToken),
    })
    const meBody = (await me.json()) as { name?: string; props?: { name?: string } }
    const persistedName = meBody?.props?.name ?? meBody?.name
    expect(persistedName).toBe('Renamed Investor')

    await page.reload()
    await page.waitForLoadState('networkidle').catch(() => {})
    const after = await page
      .locator('label')
      .filter({ hasText: /Full name/i })
      .locator('input')
      .first()
      .inputValue()
    expect(after).toBe('Renamed Investor')
  })

  test('Advisor email is persisted via PUT /api/user-settings', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle').catch(() => {})

    const advisor = page
      .locator('label')
      .filter({ hasText: /Advisor email/i })
      .locator('input')
      .first()
    await advisor.fill('advisor@example.com')
    await page
      .getByRole('button', { name: /^Save changes$/ })
      .first()
      .click()
    await page.waitForTimeout(1500)

    const r = await page.request.get(`${API_BASE}/user-settings`, {
      headers: authHeaders(accessToken),
    })
    const body = (await r.json()) as { advisor_email?: string; data?: { advisor_email?: string } }
    const persisted = body?.data?.advisor_email ?? body?.advisor_email
    expect(persisted).toBe('advisor@example.com')
  })

  test('Tax-method LIFO selection PUTs and persists', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle').catch(() => {})

    await page
      .getByRole('button', { name: /Tax Lots/i })
      .first()
      .click()
    await page.waitForTimeout(300)
    await page
      .getByRole('button', { name: /^LIFO$/ })
      .first()
      .click()

    const calls = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /^Save method$/ })
        .first()
        .click()
      await page.waitForTimeout(1500)
    })
    const put = calls.find((c) => c.method === 'PUT' && /\/api\/user-settings/.test(c.url))
    expect(put).toBeTruthy()
    expect(put?.status).toBeLessThan(400)

    const r = await page.request.get(`${API_BASE}/user-settings`, {
      headers: authHeaders(accessToken),
    })
    const body = (await r.json()) as { tax_method?: string; data?: { tax_method?: string } }
    const persisted = body?.data?.tax_method ?? body?.tax_method
    expect(persisted).toBe('LIFO')
  })

  test('Notification preferences toggle persists via PUT /api/notification-preferences', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle').catch(() => {})
    await page
      .getByRole('button', { name: /^Notifications$/ })
      .first()
      .click()
    await page.waitForTimeout(300)

    const cb = page
      .locator('label')
      .filter({ hasText: /Price alerts/i })
      .locator('input[type="checkbox"]')
      .first()
    const before = await cb.isChecked()
    await cb.click()
    await page.waitForTimeout(800)

    const r = await page.request.get(`${API_BASE}/notification-preferences`, {
      headers: authHeaders(accessToken),
    })
    const body = (await r.json()) as { price_alerts?: boolean; data?: { price_alerts?: boolean } }
    const persisted = body?.data?.price_alerts ?? body?.price_alerts
    expect(persisted).toBe(!before)
  })
})
