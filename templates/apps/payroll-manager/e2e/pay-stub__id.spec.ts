import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiGet, signupAndToken, unwrap } from './_helpers'

interface PayStub {
  id: string
  gross?: number | string
  net?: number | string
}
interface PayRun {
  id: string
  status: string
  stubs?: PayStub[]
}

test.describe('/pay-stub/:id', () => {
  test('renders a seeded pay stub fetched via its parent pay-run', async ({ page }) => {
    const { token } = await signupAndToken(page)
    await apiGet(page, token, '/employees')
    const runs = await apiGet<PayRun[]>(page, token, '/pay-runs')
    const list =
      (Array.isArray(runs.body) ? runs.body : (runs.body as { data?: PayRun[] }).data) ?? []
    const processed = list.find((r) => r.status === 'processed')
    expect(processed, 'demo seed must include a processed pay run').toBeTruthy()
    const detail = await apiGet<PayRun>(page, token, `/pay-runs/${processed!.id}`)
    const data = unwrap<PayRun>(detail.body) ?? detail.body
    expect(data.stubs?.length, 'processed pay run must have ≥1 pay stub').toBeGreaterThan(0)
    const stub = data.stubs![0]
    await page.goto(APP_BASE + `/pay-stub/${stub.id}`)
    await page.waitForLoadState('networkidle').catch(() => {})
    await expect(page.getByRole('heading').first()).toBeVisible()
  })
})
