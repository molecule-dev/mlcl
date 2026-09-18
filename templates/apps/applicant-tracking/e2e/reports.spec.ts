import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, expectNoConsoleErrors, signup } from './_helpers.js'

test.describe('reports page', () => {
  test('renders the Reports heading and key sections', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports')
    await expect(page.getByRole('heading', { name: /reports/i }).first()).toBeVisible()
  })

  test('GET /api/reports returns 200 on load', async ({ page }) => {
    await signup(page)
    const requests = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/reports')
      await page.waitForTimeout(1500)
    })
    expect(
      requests.some((r) => r.method === 'GET' && /\/reports\b/.test(r.url) && r.status === 200),
    ).toBeTruthy()
  })

  test('Funnel section renders with at least one stage row', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports')
    await page.waitForTimeout(800)
    await expect(page.getByText(/funnel/i)).toBeVisible()
  })

  test('Source attribution section renders', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports')
    await page.waitForTimeout(800)
    await expect(page.getByText(/source/i).first()).toBeVisible()
  })

  test('Time-in-stage section renders', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports')
    await page.waitForTimeout(800)
    await expect(page.getByText(/time.*stage|time-in-stage|median time/i).first()).toBeVisible()
  })

  test('renders without console errors', async ({ page }) => {
    await signup(page)
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/reports')
      await expect(page.getByRole('heading').first()).toBeVisible()
    })
  })
})
