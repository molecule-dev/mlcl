import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, firstCustomerId, signup, waitForSeed } from './_helpers.js'

test.describe('customer detail', () => {
  test('detail page renders profile stats and service history sections', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const id = await firstCustomerId(page, accessToken)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/customers/${id}`)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })
    })
    const req = reqs.find(
      (r) => /\/api\/customers\/[a-f0-9-]{36}/.test(r.url) && r.method === 'GET',
    )
    expect(req?.status, 'GET /api/customers/:id').toBe(200)
    await expect(page.getByText(/^jobs$/i).first()).toBeVisible()
    await expect(page.getByText(/^quotes$/i).first()).toBeVisible()
    await expect(page.getByText(/service history/i)).toBeVisible()
    await expect(page.getByText(/billed to date/i)).toBeVisible()
  })

  test('"New quote" CTA on detail links to /quotes/new', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const id = await firstCustomerId(page, accessToken)
    await page.goto(APP_BASE + `/customers/${id}`)
    await page.getByRole('link', { name: /\+ new quote/i }).click()
    await expect(page).toHaveURL(/\/quotes\/new/)
  })
})
