import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup } from './_helpers'

test.describe('/notifications', () => {
  test('renders heading and an empty-or-feed state without crashing', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: /notifications/i })).toBeVisible()
    const empty = await page.getByTestId('notif-empty').count()
    const feed = await page.getByTestId('notif-feed').count()
    expect(empty + feed, 'either empty state or feed must render').toBeGreaterThan(0)
  })

  test('fires GET /api/security/findings and /api/shares/incoming on mount', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/notifications')
      await page.waitForLoadState('networkidle')
    })
    expect(
      reqs.find((r) => r.method === 'GET' && /\/api\/security\/findings/.test(r.url)),
    ).toBeDefined()
    expect(
      reqs.find((r) => r.method === 'GET' && /\/api\/shares\/incoming/.test(r.url)),
    ).toBeDefined()
  })
})
