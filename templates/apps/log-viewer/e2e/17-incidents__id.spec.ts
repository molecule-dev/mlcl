import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, API_BASE, captureNetwork, getAccessToken, signup } from './_helpers'

// /incidents/:id — incident detail with hero, timeline, evidence, actions.

async function firstIncidentId(page: import('@playwright/test').Page): Promise<string | null> {
  const token = await getAccessToken(page)
  const res = await page.request.get(API_BASE + '/incidents', {
    headers: { Authorization: `Bearer ${token}` },
  })
  const body = await res.json()
  const items: Array<{ id: string }> = Array.isArray(body) ? body : body.data || body.results || []
  return items[0]?.id ?? null
}

test.describe('/incidents/:id', () => {
  test('redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto(APP_BASE + '/incidents/anything')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('shows incident hero from GET /api/incidents/:id', async ({ page }) => {
    await signup(page)
    const id = await firstIncidentId(page)
    test.skip(!id, 'no incidents seeded')
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/incidents/${id}`)
      await page.waitForResponse((r) => new RegExp(`/api/incidents/${id}`).test(r.url()), {
        timeout: 10_000,
      })
    })
    expect(
      reqs.find((r) => r.method === 'GET' && new RegExp(`/api/incidents/${id}`).test(r.url)),
    ).toBeDefined()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('"All incidents" back-link goes to /incidents', async ({ page }) => {
    await signup(page)
    const id = await firstIncidentId(page)
    test.skip(!id, 'no incidents seeded')
    await page.goto(APP_BASE + `/incidents/${id}`)
    await page
      .getByRole('link', { name: /all incidents|back/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/incidents$/)
  })

  test('"Mark resolved" PATCHes /api/incidents/:id and shows confirmation', async ({ page }) => {
    await signup(page)
    const id = await firstIncidentId(page)
    test.skip(!id, 'no incidents seeded')
    await page.goto(APP_BASE + `/incidents/${id}`)
    await page.waitForResponse((r) => new RegExp(`/api/incidents/${id}`).test(r.url()))
    const btn = page.locator('[data-mol-id="incident-resolve"]')
    if (await btn.isDisabled()) test.skip(true, 'incident already resolved')
    const respPromise = page.waitForResponse(
      (r) => r.request().method() === 'PATCH' && new RegExp(`/api/incidents/${id}`).test(r.url()),
      { timeout: 10_000 },
    )
    await btn.click()
    const resp = await respPromise
    expect(resp.status()).toBeLessThan(300)
    await expect(page.locator('[data-mol-id="incident-action-msg"]')).toBeVisible()
    // Read-after-write — incident is resolved on the server.
    const token = await getAccessToken(page)
    const res = await page.request.get(API_BASE + `/incidents/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const body = await res.json()
    const inc = body?.data ?? body
    expect(inc.status).toBe('resolved')
  })

  test('"Open postmortem" opens the editor dialog', async ({ page }) => {
    await signup(page)
    const id = await firstIncidentId(page)
    test.skip(!id, 'no incidents seeded')
    await page.goto(APP_BASE + `/incidents/${id}`)
    await page.locator('[data-mol-id="incident-postmortem"]').click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.locator('[data-mol-id="incident-pm-textarea"]').fill('Root cause: ...')
    await expect(page.locator('[data-mol-id="incident-pm-textarea"]')).toHaveValue(
      'Root cause: ...',
    )
  })

  test('renders the timeline with at least 1 event', async ({ page }) => {
    await signup(page)
    const id = await firstIncidentId(page)
    test.skip(!id, 'no incidents seeded')
    await page.goto(APP_BASE + `/incidents/${id}`)
    await page.waitForResponse((r) => new RegExp(`/api/incidents/${id}`).test(r.url()))
    await expect(page.locator('ol li').first()).toBeVisible({ timeout: 5_000 })
  })
})
