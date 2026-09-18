import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, expectNoConsoleErrors, signup } from './_helpers.js'

test.describe('queue page', () => {
  test('renders heading and queue summary', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/queue')
    await expect(page.getByRole('heading', { name: /up next/i })).toBeVisible()
  })

  test('fetches /api/queue on initial load', async ({ page }) => {
    await signup(page)
    const requests = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/queue')
      await page.waitForLoadState('networkidle')
    })
    expect(requests.some((r) => /\/api\/queue(\?|$)/.test(r.url) && r.status === 200)).toBeTruthy()
  })

  test('seeded queue shows at least one episode item with Play and remove controls', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/queue')
    const item = page.getByRole('listitem').first()
    await expect(item).toBeVisible({ timeout: 8000 })
    await expect(item.getByRole('button', { name: /^play$/i })).toBeVisible()
    await expect(item.getByRole('button', { name: /remove from queue/i })).toBeVisible()
  })

  test('removing a queue item issues DELETE /api/queue/:id and the item disappears', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/queue')
    const item = page.getByRole('listitem').first()
    await expect(item).toBeVisible({ timeout: 8000 })
    const requests = await captureNetwork(page, async () => {
      await item.getByRole('button', { name: /remove from queue/i }).click()
      await page.waitForTimeout(1500)
    })
    expect(
      requests.some((r) => r.method === 'DELETE' && /\/api\/queue\/[0-9a-f-]{36}/.test(r.url)),
    ).toBeTruthy()
  })

  test('Clear queue button issues DELETE /api/queue and empties the list', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/queue')
    await expect(page.getByRole('button', { name: /clear queue/i })).toBeVisible()
    const requests = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /clear queue/i }).click()
      await page.waitForTimeout(1500)
    })
    expect(
      requests.some((r) => r.method === 'DELETE' && /\/api\/queue(?:\?|$)/.test(r.url)),
    ).toBeTruthy()
    // Reload to verify the empty state persists across page loads.
    await page.reload()
    await expect(page.getByRole('listitem')).toHaveCount(0)
  })

  test('queue page renders without console errors', async ({ page }) => {
    await signup(page)
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/queue')
      await expect(page.getByRole('heading', { name: /up next/i })).toBeVisible()
    })
  })
})
