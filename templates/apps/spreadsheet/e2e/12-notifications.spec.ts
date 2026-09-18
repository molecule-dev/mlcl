import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiContext, apiSignup, signup, uniqueEmail } from './_helpers.js'

test.describe('notifications', () => {
  test('backend invariant: GET /notifications lazy-seeds welcome inbox on first request', async () => {
    const ctx = await apiContext()
    const me = await apiSignup(ctx, uniqueEmail('inv-notify'))
    const auth = { Authorization: `Bearer ${me.token}` }

    // First request — handler seeds a welcome inbox so the UI never
    // looks dead-empty for a brand-new user.
    const first = await ctx.get('/api/notifications', { headers: auth })
    expect(first.status()).toBe(200)
    const firstItems = (await first.json()) as Array<{
      id: string
      title: string
      read_at: string | null
    }>
    expect(firstItems.length).toBeGreaterThanOrEqual(1)
    expect(firstItems.every((n) => n.read_at === null)).toBe(true)

    // Second request — same count, no duplicate seeding.
    const second = await ctx.get('/api/notifications', { headers: auth })
    const secondItems = (await second.json()) as Array<{ id: string }>
    expect(secondItems.length).toBe(firstItems.length)

    await ctx.dispose()
  })

  test('backend invariant: unread-count drops to 0 after mark-all-read', async () => {
    const ctx = await apiContext()
    const me = await apiSignup(ctx, uniqueEmail('inv-mark'))
    const auth = { Authorization: `Bearer ${me.token}` }

    // Trigger seed + initial unread count.
    const before = await ctx.get('/api/notifications/unread-count', { headers: auth })
    const beforeCount = ((await before.json()) as { count: number }).count
    expect(beforeCount).toBeGreaterThan(0)

    const mark = await ctx.post('/api/notifications/mark-all-read', { headers: auth })
    expect(mark.status()).toBe(200)

    const after = await ctx.get('/api/notifications/unread-count', { headers: auth })
    expect(((await after.json()) as { count: number }).count).toBe(0)

    await ctx.dispose()
  })

  test('UI: notifications page renders the seeded welcome items after signup', async ({ page }) => {
    await signup(page, uniqueEmail('notify-ui'), 'TestPass123!')
    await page.goto(APP_BASE + '/notifications')
    // Header visible.
    await expect(page.getByRole('heading', { name: /notifications/i }).first()).toBeVisible({
      timeout: 10000,
    })
    // At least one of the welcome titles is present.
    await expect(
      page.getByText(/welcome to calcite|invite teammates|automations are on/i).first(),
    ).toBeVisible({ timeout: 10000 })
  })
})
