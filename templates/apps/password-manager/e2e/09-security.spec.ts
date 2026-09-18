import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup, signupAndAddItem } from './_helpers'

test.describe('/security', () => {
  test('renders score (default 100) and metric tiles', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/security')
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('security-score')).toHaveText(/^\d{1,3}$/)
    await expect(page.getByTestId('security-metric-weak')).toBeVisible()
    await expect(page.getByTestId('security-metric-reused')).toBeVisible()
    await expect(page.getByTestId('security-metric-breached')).toBeVisible()
    await expect(page.getByTestId('security-metric-old')).toBeVisible()
  })

  test('Re-scan vault POSTs /api/security/refresh', async ({ page }) => {
    await signupAndAddItem(page, 'security-scan.example.com', 'weak') // weak password to potentially trigger findings
    await page.goto(APP_BASE + '/security')
    await page.waitForLoadState('networkidle')
    const reqs = await captureNetwork(page, async () => {
      await page.getByTestId('security-refresh').click()
      await page.waitForTimeout(1500)
    })
    const refresh = reqs.find((r) => r.method === 'POST' && /\/api\/security\/refresh/.test(r.url))
    expect(refresh, 'POST /api/security/refresh must fire').toBeDefined()
    expect(refresh!.status).toBeLessThan(300)
    const list = reqs.find((r) => r.method === 'GET' && /\/api\/security\/findings/.test(r.url))
    expect(list, 'subsequent GET /api/security/findings must fire after refresh').toBeDefined()
  })

  test('initial GET /api/security/findings fires when page loads', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/security')
      await page.waitForLoadState('networkidle')
    })
    const get = reqs.find((r) => r.method === 'GET' && /\/api\/security\/findings/.test(r.url))
    expect(get).toBeDefined()
    expect(get!.status).toBeLessThan(400)
  })
})
