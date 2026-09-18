import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  authHeaders,
  captureNetwork,
  installTemplate,
  signup,
} from './_helpers.js'

test.describe('/templates/:id', () => {
  test('renders the template detail page', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/templates/lead-routing')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('install button creates a workflow row', async ({ page }) => {
    await signup(page)
    const result = await installTemplate(page, 'refund-triage')
    expect(result.workflow_id).toBeTruthy()
  })

  test('captureNetwork: /templates/:id calls /api/templates/:id', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/templates/lead-routing')
      await page.waitForLoadState('networkidle')
    })
    const call = reqs.find(
      (r) => r.method === 'GET' && /\/api\/templates\/lead-routing/.test(r.url),
    )
    expect(call, '/templates/:id must call /api/templates/:id').toBeTruthy()
    expect(call!.status).toBe(200)
  })

  test('unknown template id returns 404', async ({ page }) => {
    await signup(page)
    const res = await page.request.get(`${API_BASE}/templates/this-does-not-exist-xyz`, {
      headers: authHeaders(page),
    })
    expect(res.status()).toBe(404)
  })
})
