import { test, expect, type Page } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, createGroupViaApi, seedExpense, signup } from './_helpers.js'

interface SummaryShape {
  you_owe_cents: number
  you_are_owed_cents: number
  groups: { id: string; name: string; my_balance_cents: number }[]
  friends: { name: string; net_cents: number; is_self: boolean }[]
}

async function getSummary(page: Page, accessToken: string): Promise<SummaryShape> {
  const res = await page.request.get(API_BASE + '/dashboard/summary', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return (await res.json()) as SummaryShape
}

test.describe('/balances page', () => {
  test('summary cards and sections render', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/balances')
    await expect(page.locator('[data-mol-id="page-balances"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="balances-by-friend"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="balances-by-group"]')).toBeVisible()
  })

  test('totals shown match the dashboard summary API', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/balances')
    const summary = await getSummary(page, accessToken)
    const owed = summary.you_are_owed_cents
    await expect(page.getByText('Owed to you').first()).toBeVisible()
    const cents = (dollars: string): number =>
      Math.round(Number(dollars.replace(/[^0-9.]/g, '')) * 100)
    // The hero card renders the API total as currency — compare numerically.
    const hero = page
      .locator('[data-mol-id="page-balances"]')
      .getByText(new RegExp('^\\$[\\d,]+\\.\\d{2}$'))
    const values = await hero.allTextContents()
    const parsed = values.map(cents)
    expect(parsed).toContain(owed)
    expect(parsed).toContain(summary.you_owe_cents)
  })

  test('a fresh debt shows as a per-friend row and a per-group row', async ({ page }) => {
    const { accessToken } = await signup(page)
    const group = await createGroupViaApi(page, accessToken)
    const friend = group.members.find((m) => !m.is_self)!
    // The friend fronts 80.00 split equally 3 ways → the user owes 26.67-ish.
    await seedExpense(page, accessToken, {
      group_id: group.id,
      payer_member_id: friend.id,
      amount_cents: 8000,
      description: 'E2E Balances Expense',
      split_method: 'equal',
    })
    await page.goto(APP_BASE + '/balances')
    await expect(page.locator('[data-mol-id="balance-group-' + group.id + '"]')).toBeVisible({
      timeout: 10000,
    })
    const summary = await getSummary(page, accessToken)
    const friendNet = summary.friends.find((f) => f.name === friend.name)
    expect(friendNet, 'friend aggregate exists').toBeTruthy()
    expect(friendNet!.net_cents).toBeGreaterThan(0)

    await expect(
      page
        .locator('[data-mol-id="balances-by-friend"]')
        .getByText(friend.name, { exact: true })
        .first(),
    ).toBeVisible()
  })

  test('by-group rows link into each group detail', async ({ page }) => {
    const { accessToken } = await signup(page)
    const group = await createGroupViaApi(page, accessToken)
    await page.goto(APP_BASE + '/balances')
    await page.locator(`[data-mol-id="balance-group-${group.id}"]`).click()
    await page.waitForURL(new RegExp(`**/groups/${group.id}`), { timeout: 5000 })
  })
})
