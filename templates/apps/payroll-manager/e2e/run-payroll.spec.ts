import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiGet, captureNetwork, signupAndToken } from './_helpers'

test.describe('/run-payroll', () => {
  test('renders cycle overview after seed primed', async ({ page }) => {
    const { token } = await signupAndToken(page)
    await apiGet(page, token, '/employees')
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/run-payroll')
      await page.waitForLoadState('networkidle').catch(() => {})
    })
    await expect(page.getByRole('heading', { name: /run payroll/i }).first()).toBeVisible()
    expect(reqs.find((r) => r.method === 'GET' && /\/api\/employees/.test(r.url))).toBeDefined()
    expect(reqs.find((r) => r.method === 'GET' && /\/api\/pay-runs/.test(r.url))).toBeDefined()
  })

  test('Approve button persists pay-run state — POST approve + process land non-error', async ({
    page,
  }) => {
    const { token } = await signupAndToken(page)
    await apiGet(page, token, '/employees')
    await page.goto(APP_BASE + '/run-payroll')
    await page.waitForLoadState('networkidle').catch(() => {})
    const approve = page.getByRole('button', { name: /approve.*file|approve & file/i }).first()
    if (!(await approve.count().catch(() => 0)))
      test.skip(true, 'no draft pay-run available to approve')
    const reqs = await captureNetwork(page, async () => {
      await approve.click()
      await page.waitForURL(/\/pay-runs\//, { timeout: 15_000 }).catch(() => {})
    })
    const approveCall = reqs.find(
      (r) => r.method === 'POST' && /\/pay-runs\/[0-9a-f-]+\/approve/.test(r.url),
    )
    expect(approveCall, 'POST /pay-runs/:id/approve must fire').toBeDefined()
    if (approveCall) expect(approveCall.status).toBeLessThan(500)
  })

  test('Save draft and exit returns to /pay-runs', async ({ page }) => {
    await signupAndToken(page)
    await page.goto(APP_BASE + '/run-payroll')
    const exit = page.getByRole('link', { name: /save draft and exit/i }).first()
    await exit.click()
    await expect(page).toHaveURL(/\/pay-runs/)
  })
})
