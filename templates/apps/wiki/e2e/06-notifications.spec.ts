import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { apiHeaders, API_BASE, signup } from './_helpers.js'

test.describe('notifications inbox', () => {
  test('empty by default', async ({ page }) => {
    await signup(page)
    await page.goto('/notifications')
    await expect(page.getByTestId('notifications-page')).toBeVisible()
    await expect(page.getByTestId('notifications-empty')).toBeVisible()
  })

  test('can seed via API → render in UI → mark all read', async ({ page }) => {
    const { accessToken } = await signup(page)

    for (const kind of ['mention', 'reply', 'edit'] as const) {
      const res = await page.request.post(`${API_BASE}/notifications`, {
        headers: apiHeaders(accessToken),
        data: {
          kind,
          title: `${kind} from teammate`,
          body: `A new ${kind} for you`,
        },
      })
      expect(res.status()).toBe(201)
    }

    await page.goto('/notifications')
    await expect(page.getByTestId('notifications-unread-badge')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('notifications-page')).toContainText('mention from teammate')

    // Mark all read.
    await page.getByTestId('notifications-mark-all-read').click()
    // Badge should disappear.
    await expect(page.getByTestId('notifications-unread-badge')).toBeHidden({ timeout: 10_000 })

    const r = await page.request.get(`${API_BASE}/notifications`, {
      headers: apiHeaders(accessToken),
    })
    const items = (await r.json()) as Array<{ read_at: string | null }>
    expect(items.length).toBeGreaterThan(0)
    expect(items.every((i) => i.read_at !== null)).toBe(true)
  })
})
