import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { api, signup } from './_helpers.js'

test.describe('notifications', () => {
  test('fresh user sees empty state', async ({ page }) => {
    await signup(page)
    await page.goto('/notifications')
    await expect(page.getByTestId('no-notifications')).toBeVisible()
  })

  test('unread-count returns 0 for fresh user', async ({ page }) => {
    await signup(page)
    const res = await api<{ count: number }>(page, 'GET', '/notifications/unread-count')
    expect(res.count).toBe(0)
  })

  test('mark-all-read endpoint succeeds for empty list', async ({ page }) => {
    await signup(page)
    await page.goto('/notifications')
    const button = page.getByTestId('mark-all-read')
    await expect(button).toBeDisabled()
  })
})
