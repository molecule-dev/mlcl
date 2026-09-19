import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  createGroupViaApi,
  getGroupDetail,
  getSettlements,
  recordSettlement,
  seedExpense,
  signup,
} from './_helpers.js'

/**
 * The signature flow: group → non-even expense → computed balances →
 * record settlement → zero out. Expected values are read from the API (or
 * computed from amounts this test chose), never from the demo seed.
 */
test.describe('settle-up flow', () => {
  test('exact-split expense produces suggestions that zero the group via the UI', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const group = await createGroupViaApi(page, accessToken)
    const self = group.members.find((m) => m.is_self)!
    const others = group.members.filter((m) => !m.is_self)

    // Friend pays 90.00; exact split leaves the user and the other friend
    // 30.00 each and the payer carrying the rest.
    const expense = await seedExpense(page, accessToken, {
      group_id: group.id,
      payer_member_id: others[0].id,
      amount_cents: 9000,
      description: 'E2E Settle Flow Expense',
      split_method: 'exact',
      shares: group.members.map((m) => ({
        member_id: m.id,
        amount_cents: 3000,
      })),
    })
    expect(expense.shares.reduce((sum, s) => sum + s.amount_cents, 0)).toBe(9000)

    // ---- the group page shows the computed balances + suggestions ----
    await page.goto(APP_BASE + `/groups/${group.id}`)
    const settleSection = page.locator('[data-mol-id="group-settle-up"]')
    await expect(settleSection).toBeVisible()
    // Two debtors × 30.00 suggestions, naming the payer as recipient.
    await expect(settleSection.getByText(others[0].name, { exact: true }).first()).toBeVisible()
    await expect(settleSection.getByText('$30.00').first()).toBeVisible()

    // ---- record OUR suggestion through the UI ----
    await page.locator(`[data-mol-id="btn-record-settle-${self.id}"]`).click()
    await expect(page.getByText(/everyone is square/i)).toBeHidden({ timeout: 10000 })
    // The other friend still owes — exactly one suggestion remains.
    await expect(page.locator('[data-mol-id^="btn-record-settle-"]')).toHaveCount(1)

    // ---- API agrees: our net is zero, the rest unchanged ----
    let detail = await getGroupDetail(page, accessToken, group.id)
    const myBalance = detail.balances.find((b) => b.member_id === self.id)!
    expect(myBalance.net_cents).toBe(0)
    expect(myBalance.sent_cents).toBe(3000)
    expect(detail.balances.reduce((sum, b) => sum + b.net_cents, 0)).toBe(0)

    // ---- record the last suggestion; the group goes square in the UI ----
    await page.locator('[data-mol-id^="btn-record-settle-"]').first().click()
    await expect(page.getByText(/everyone is square/i)).toBeVisible({ timeout: 10000 })

    detail = await getGroupDetail(page, accessToken, group.id)
    expect(detail.suggestions).toEqual([])
    for (const balance of detail.balances) {
      expect(balance.net_cents, `${balance.name} fully settled`).toBe(0)
    }
    const settlements = await getSettlements(page, accessToken, group.id)
    expect(settlements.length).toBe(2)
    expect(settlements.reduce((sum, s) => sum + s.amount_cents, 0)).toBe(6000)
  })

  test('settlement recorded via the API shows in the history list', async ({ page }) => {
    const { accessToken } = await signup(page)
    const group = await createGroupViaApi(page, accessToken)
    const self = group.members.find((m) => m.is_self)!
    const friend = group.members.find((m) => !m.is_self)!

    await seedExpense(page, accessToken, {
      group_id: group.id,
      payer_member_id: friend.id,
      amount_cents: 5000,
      description: 'E2E History Expense',
      split_method: 'exact',
      shares: [
        { member_id: self.id, amount_cents: 2500 },
        { member_id: friend.id, amount_cents: 2500 },
      ],
    })
    await recordSettlement(page, accessToken, {
      group_id: group.id,
      from_member_id: self.id,
      to_member_id: friend.id,
      amount_cents: 2500,
      method: 'transfer',
    })

    await page.goto(APP_BASE + `/groups/${group.id}`)
    await expect(page.getByText(/everyone is square/i)).toBeVisible({ timeout: 10000 })
    await expect(
      page.locator('[data-mol-id="group-settle-up"]').getByText(/recorded payments/i),
    ).toBeVisible()
  })

  test('partial settlement keeps a residual suggestion for the remainder', async ({ page }) => {
    const { accessToken } = await signup(page)
    const group = await createGroupViaApi(page, accessToken)
    const self = group.members.find((m) => m.is_self)!
    const friend = group.members.find((m) => !m.is_self)!

    await seedExpense(page, accessToken, {
      group_id: group.id,
      payer_member_id: friend.id,
      amount_cents: 10000,
      description: 'E2E Partial Expense',
      split_method: 'exact',
      shares: [
        { member_id: self.id, amount_cents: 5000 },
        { member_id: friend.id, amount_cents: 5000 },
      ],
    })
    await recordSettlement(page, accessToken, {
      group_id: group.id,
      from_member_id: self.id,
      to_member_id: friend.id,
      amount_cents: 2000,
    })

    await page.goto(APP_BASE + `/groups/${group.id}`)
    await expect(page.locator('[data-mol-id="group-settle-up"]')).toBeVisible()
    // 50.00 owed minus the 20.00 paid leaves a single 30.00 suggestion.
    await expect(page.locator('[data-mol-id="group-settle-up"]').getByText('$30.00')).toBeVisible()
    await expect(page.locator('[data-mol-id^="btn-record-settle-"]')).toHaveCount(1)
  })
})
