import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, asList, captureNetwork, promoteToAdmin, signup } from './_helpers.js'

test.describe('/carriers', () => {
  test('renders the carrier list seeded for the new user', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/carriers')
      await expect(page.getByRole('heading', { name: /^Carriers$/i })).toBeVisible()
    })
    const listReq = reqs.find((r) => r.method === 'GET' && /\/api\/carriers(\?|$)/.test(r.url))
    expect(listReq, 'mount must fetch /api/carriers').toBeTruthy()
    expect(listReq?.status).toBe(200)
    const { body } = await apiRequest<{ data?: any[] }>(page, 'GET', '/api/carriers')
    const list = asList(body)
    expect(list.length).toBeGreaterThan(0)
    await expect(page.getByText(list[0].name).first()).toBeVisible()
  })

  test('"+ Connect carrier" creates a carrier that persists across reload', async ({ page }) => {
    await signup(page)
    // Carriers are an operator-managed global catalog: writes are gated behind
    // requireAdmin (P2H-3). Become the operator before driving the connect flow.
    await promoteToAdmin(page)
    await page.goto(APP_BASE + '/carriers')
    const code = `T${Math.floor(Math.random() * 99999)}`
    const name = `Test Carrier ${code}`
    await page.locator('[data-mol-id="button-connect-carrier"]').click()
    await page.locator('[data-mol-id="input-name"]').fill(name)
    await page.locator('[data-mol-id="input-code"]').fill(code)
    await page.locator('[data-mol-id="button-submit"]').click()
    await expect(page.locator('[data-mol-id="dialog-connect-carrier"]')).toBeHidden({
      timeout: 10_000,
    })

    const { body } = await apiRequest<{ data?: any[] }>(page, 'GET', '/api/carriers')
    const list = asList(body)
    expect(list.find((c: any) => c.name === name)).toBeTruthy()

    await page.reload()
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 10_000 })
  })

  test('cancel button closes the connect dialog without persisting', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/carriers')
    const before = (await apiRequest<{ data?: any[] }>(page, 'GET', '/api/carriers')).body as any
    await page.locator('[data-mol-id="button-connect-carrier"]').click()
    await page.locator('[data-mol-id="input-name"]').fill('Will Cancel')
    await page.locator('[data-mol-id="button-cancel"]').click()
    await expect(page.locator('[data-mol-id="dialog-connect-carrier"]')).toBeHidden()
    const after = (await apiRequest<{ data?: any[] }>(page, 'GET', '/api/carriers')).body as any
    expect((after.data ?? []).length).toBe((before.data ?? []).length)
  })

  test('clicking a carrier row opens its detail page', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/carriers')
    const link = page.locator('a[href^="/carriers/"]').first()
    await expect(link).toBeVisible()
    await link.click()
    await expect(page).toHaveURL(/\/carriers\/[a-f0-9-]+/i)
  })
})
