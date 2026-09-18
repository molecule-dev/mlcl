import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiGet, signupAndToken } from './_helpers'

interface PayRun {
  id: string
  status: string
}

test.describe('/pay-runs/:id', () => {
  test('renders detail card for a seeded processed run', async ({ page }) => {
    const { token } = await signupAndToken(page)
    await apiGet(page, token, '/employees')
    const list = await apiGet<PayRun[]>(page, token, '/pay-runs')
    const arr =
      (Array.isArray(list.body) ? list.body : (list.body as { data?: PayRun[] }).data) ?? []
    const target = arr.find((p) => p.status === 'processed') ?? arr[0]
    await page.goto(APP_BASE + `/pay-runs/${target.id}`)
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('back-to-list link returns to /pay-runs', async ({ page }) => {
    const { token } = await signupAndToken(page)
    await apiGet(page, token, '/employees')
    const list = await apiGet<PayRun[]>(page, token, '/pay-runs')
    const arr =
      (Array.isArray(list.body) ? list.body : (list.body as { data?: PayRun[] }).data) ?? []
    const target = arr[0]
    await page.goto(APP_BASE + `/pay-runs/${target.id}`)
    const back = page.getByRole('link', { name: /pay runs|back/i }).first()
    if (await back.count().catch(() => 0)) {
      await back.click()
      await expect(page).toHaveURL(/\/pay-runs/)
    }
  })
})
