import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiContext, apiSignup, signup, uniqueEmail } from './_helpers.js'

test.describe('integrations', () => {
  test('connecting a provider persists across reload', async ({ page }) => {
    await signup(page, uniqueEmail('int-ui'), 'TestPass123!')
    await page.goto(APP_BASE + '/integrations')
    await expect(page.getByTestId('integrations-grid')).toBeVisible({ timeout: 10000 })

    // Click Connect on Slack.
    await page.getByTestId('connect-slack').click()

    // Status should flip to "Connected" — wait for either the disconnect button or the status badge.
    await expect(page.getByTestId('disconnect-slack')).toBeVisible({ timeout: 10000 })

    // Reload — connection persists, still shows Disconnect.
    await page.reload()
    await expect(page.getByTestId('disconnect-slack')).toBeVisible({ timeout: 10000 })
  })

  test('backend invariant: POST /integrations creates row scoped to user', async () => {
    const ctx = await apiContext()
    const me = await apiSignup(ctx, uniqueEmail('inv-int'))
    const auth = { Authorization: `Bearer ${me.token}` }

    const created = await ctx.post('/api/integrations', {
      headers: auth,
      data: { provider: 'webhook', status: 'connected' },
    })
    expect(created.status()).toBe(201)

    const list = await ctx.get('/api/integrations', { headers: auth })
    const items = (await list.json()) as Array<{ provider: string; status: string }>
    expect(items.some((i) => i.provider === 'webhook' && i.status === 'connected')).toBe(true)

    await ctx.dispose()
  })

  test('backend invariant: connecting the same provider twice is idempotent (no duplicate rows)', async () => {
    const ctx = await apiContext()
    const me = await apiSignup(ctx, uniqueEmail('inv-int-idem'))
    const auth = { Authorization: `Bearer ${me.token}` }

    // First connect → 201 Created.
    const first = await ctx.post('/api/integrations', {
      headers: auth,
      data: { provider: 'slack', status: 'connected' },
    })
    expect(first.status()).toBe(201)
    const firstBody = (await first.json()) as { id: string }

    // Second connect for the same provider → 200 OK (update path), not a
    // new row. Without the idempotent guard the UI would show two Slack
    // tiles after a double-click.
    const second = await ctx.post('/api/integrations', {
      headers: auth,
      data: { provider: 'slack', status: 'connected', tokens: { ok: true } },
    })
    expect(second.status()).toBe(200)
    const secondBody = (await second.json()) as { id: string }
    expect(secondBody.id).toBe(firstBody.id)

    // List confirms exactly one slack row for this user.
    const list = await ctx.get('/api/integrations', { headers: auth })
    const items = (await list.json()) as Array<{ provider: string }>
    const slackRows = items.filter((i) => i.provider === 'slack')
    expect(slackRows.length).toBe(1)

    await ctx.dispose()
  })
})
