import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, listNotifications, signup } from './_helpers.js'

test.describe('/notifications', () => {
  test('renders the notifications page', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('GET /api/notifications returns shape: data,total,unread', async ({ page }) => {
    await signup(page)
    const data = await listNotifications(page)
    expect(Array.isArray(data.data)).toBe(true)
    expect(typeof data.total).toBe('number')
    expect(typeof data.unread).toBe('number')
  })

  test('captureNetwork: /notifications calls /api/notifications', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/notifications')
      await page.waitForLoadState('networkidle')
    })
    const call = reqs.find((r) => r.method === 'GET' && /\/api\/notifications/.test(r.url))
    expect(call).toBeTruthy()
    expect(call!.status).toBe(200)
  })

  test('empty-state shows a meaningful message for fresh users', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle')
    const body = (await page.locator('body').innerText()).toLowerCase()
    expect(body).toMatch(/no\s+notifications|all caught up|nothing|empty|inbox/)
  })
})
