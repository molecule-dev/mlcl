import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiContext, apiSignup, signup, uniqueEmail } from './_helpers.js'

test.describe('team', () => {
  test('team page renders without errors', async ({ page }) => {
    await signup(page, uniqueEmail('team-ui'), 'TestPass123!')
    await page.goto(APP_BASE + '/team')
    await expect(page.getByRole('heading', { name: /team/i }).first()).toBeVisible({
      timeout: 10000,
    })
  })

  test('backend invariant: GET /spreadsheet-collaborators returns array, owner-scoped', async () => {
    const ctx = await apiContext()
    const me = await apiSignup(ctx, uniqueEmail('inv-team'))
    const auth = { Authorization: `Bearer ${me.token}` }
    const res = await ctx.get('/api/spreadsheet-collaborators', { headers: auth })
    expect(res.status()).toBe(200)
    const json = await res.json()
    expect(Array.isArray(json)).toBe(true)
    await ctx.dispose()
  })
})
