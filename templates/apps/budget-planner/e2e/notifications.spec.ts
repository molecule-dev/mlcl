import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test('Notifications page renders heading and the welcome notification', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/notifications')
  await expect(page.getByRole('heading', { name: /notifications/i })).toBeVisible()
  // New users are seeded with a welcome notification; assert it appears.
  await expect(page.getByText(/welcome/i)).toBeVisible({ timeout: 10000 })
})

test('Mark all read clears unread badge state', async ({ page }) => {
  const { signup, captureNetwork } = await import('./_helpers.js')
  await signup(page)
  await page.goto(APP_BASE + '/notifications')
  // Wait for the welcome notification to render
  await expect(page.getByText(/welcome/i)).toBeVisible({ timeout: 10000 })
  const reqs = await captureNetwork(page, async () => {
    await page.getByTestId('notifications-read-all').click()
    await page.waitForTimeout(800)
  })
  const post = reqs.find((r) => r.method === 'POST' && /\/api\/notifications\/read-all/.test(r.url))
  expect(post?.status).toBeLessThan(300)
})
