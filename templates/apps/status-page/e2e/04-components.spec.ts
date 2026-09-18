import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  captureNetwork,
  createComponent,
  getAccessToken,
  listAuditFiltered,
  signup,
} from './_helpers.js'

test.describe('/components', () => {
  test('Add component button reveals an inline form that creates a real component', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/components')

    await page.getByTestId('add-component-btn').click()
    await expect(page.getByTestId('add-component-form')).toBeVisible()

    const name = `UI-comp-${Date.now()}`
    await page.getByTestId('add-component-name').fill(name)
    await page.getByTestId('add-component-group').fill('ui-flow')
    await page.getByTestId('add-component-description').fill('created via add-component-form')

    const respPromise = page.waitForResponse(
      (resp) => resp.url().endsWith('/components') && resp.request().method() === 'POST',
      { timeout: 15_000 },
    )
    await page.getByTestId('add-component-submit').click()
    const resp = await respPromise
    expect(resp.status(), `POST /components: ${await resp.text().catch(() => '')}`).toBe(201)

    // The new component must show up in the list AND the form must close.
    await expect(page.getByTestId('add-component-form')).toBeHidden({ timeout: 5_000 })
    await expect(page.getByText(name, { exact: false })).toBeVisible({ timeout: 5_000 })

    // Audit log must record the create.
    const audit = await listAuditFiltered(page, { scope: 'components', action: 'component.create' })
    expect(audit.some((a) => a.summary === name)).toBeTruthy()
  })

  test('component status update via API persists and updates the public page', async ({ page }) => {
    await signup(page)
    const c = await createComponent(page, { name: `status-${Date.now()}`, group: 'platform' })

    // Drive a status change via PUT /:id/status.
    const tok = await pageToken(page)
    const put = await page.request.put(`${API_BASE}/components/${c.id}/status`, {
      headers: { Authorization: `Bearer ${tok}` },
      data: { status: 'major_outage' },
    })
    expect(put.status()).toBe(200)

    // Public page now reflects the change.
    await page.context().clearCookies()
    await page.goto(APP_BASE + '/')
    await expect(page.getByText(c.name, { exact: false })).toBeVisible({ timeout: 15_000 })
    const text = await page.locator('body').innerText()
    expect(text.toLowerCase()).not.toMatch(/all systems operational/i)

    // History row must exist for that component.
    const history = await page.request.get(`${API_BASE}/components/${c.id}`, {
      headers: { Authorization: `Bearer ${tok}` },
    })
    expect(history.status()).toBe(200)
    const detail = (await history.json()) as Record<string, unknown>
    expect(detail.status).toBe('major_outage')
  })

  test('issues GET /api/components on load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/components')
      await page.waitForTimeout(1500)
    })
    const get = reqs.find((r) => r.url.includes('/api/components') && r.method === 'GET')
    expect(get?.status, 'GET /api/components').toBe(200)
  })
})

async function pageToken(page: import('@playwright/test').Page): Promise<string> {
  const tok = await getAccessToken(page)
  if (!tok) throw new Error('no auth token')
  return tok
}
