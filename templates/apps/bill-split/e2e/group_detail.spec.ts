import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, createGroupViaApi, getGroupDetail, seedExpense, signup } from './_helpers.js'

test.describe('/groups/:id detail page', () => {
  test('renders balances and settle-up sections for a fresh group', async ({ page }) => {
    const { accessToken } = await signup(page)
    const group = await createGroupViaApi(page, accessToken)
    await page.goto(APP_BASE + `/groups/${group.id}`)
    await expect(page.locator('[data-mol-id="page-group-detail"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="group-balances"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="group-settle-up"]')).toBeVisible()
    // A fresh group is already square.
    await expect(page.getByText(/everyone is square/i)).toBeVisible()
  })

  test('every member from the API renders a balance row', async ({ page }) => {
    const { accessToken } = await signup(page)
    const group = await createGroupViaApi(page, accessToken)
    await page.goto(APP_BASE + `/groups/${group.id}`)
    await expect(page.locator('[data-mol-id="group-balances"]')).toBeVisible()
    for (const member of group.members) {
      await expect(
        page.locator('[data-mol-id="group-balances"]').getByText(member.name, { exact: true }),
      ).toBeVisible()
    }
  })

  test('an expense created through the API shows as a row with its amount', async ({ page }) => {
    const { accessToken } = await signup(page)
    const group = await createGroupViaApi(page, accessToken)
    const self = group.members.find((m) => m.is_self)!
    const expense = await seedExpense(page, accessToken, {
      group_id: group.id,
      payer_member_id: self.id,
      amount_cents: 4500,
      description: 'E2E Dinner Row',
    })
    await page.goto(APP_BASE + `/groups/${group.id}`)
    const row = page.locator(`[data-mol-id="expense-row-${expense.id}"]`)
    await expect(row).toBeVisible()
    await expect(row).toContainText('E2E Dinner Row')
    await expect(row).toContainText('$45.00')
  })

  test('deleting an expense removes its row', async ({ page }) => {
    const { accessToken } = await signup(page)
    const group = await createGroupViaApi(page, accessToken)
    const self = group.members.find((m) => m.is_self)!
    const expense = await seedExpense(page, accessToken, {
      group_id: group.id,
      payer_member_id: self.id,
      amount_cents: 2000,
      description: 'E2E To Delete',
    })
    await page.goto(APP_BASE + `/groups/${group.id}`)
    await page.locator(`[data-mol-id="btn-delete-expense-${expense.id}"]`).click()
    await expect(page.locator(`[data-mol-id="expense-row-${expense.id}"]`)).toBeHidden({
      timeout: 10000,
    })
  })

  test('Add expense CTA preselects this group on /expenses/new', async ({ page }) => {
    const { accessToken } = await signup(page)
    const group = await createGroupViaApi(page, accessToken)
    await page.goto(APP_BASE + `/groups/${group.id}`)
    await page.locator('[data-mol-id="btn-group-add-expense"]').click()
    await page.waitForURL(new RegExp(`\\/expenses\\/new\\?group=${group.id}`), { timeout: 5000 })
    await expect(page.locator('#expense-group')).toHaveValue(group.id)
  })

  test('adding a member through the form grows the balance list', async ({ page }) => {
    const { accessToken } = await signup(page)
    const group = await createGroupViaApi(page, accessToken, { member_names: [] })
    await page.goto(APP_BASE + `/groups/${group.id}`)
    await page.locator('#new-member-name').fill('E2E Late Joiner')
    await page.locator('[data-mol-id="btn-add-member"]').click()
    await expect(
      page.locator('[data-mol-id="group-balances"]').getByText('E2E Late Joiner'),
    ).toBeVisible({ timeout: 10000 })
    const detail = await getGroupDetail(page, accessToken, group.id)
    expect(detail.members.map((m) => m.name)).toContain('E2E Late Joiner')
  })

  test('unknown group id shows the not-found panel with a way back', async ({ page }) => {
    // Expected 4xx: an unknown group id legitimately 404s the group,
    // expenses, and settlements fetches the detail page fires — Chrome logs
    // each as a console error before the not-found panel renders.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 404' })
    await signup(page)
    await page.goto(APP_BASE + '/groups/00000000-0000-4000-8000-000000000000')
    await expect(page.locator('[data-mol-id="group-not-found"]')).toBeVisible({ timeout: 10000 })
    await page.locator('[data-mol-id="btn-back-to-groups"]').click()
    await page.waitForURL(/\/groups($|\?)/, { timeout: 5000 })
  })
})
