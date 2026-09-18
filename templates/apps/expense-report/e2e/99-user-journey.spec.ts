/**
 * Cross-page kitchen-sink flow: a real expense-report user signing up,
 * adding an expense, building a report, submitting it for approval, and
 * watching the activity feed reflect the action. Verifies backend
 * invariants (read-after-write) at each step.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, apiHeaders, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('expense-report kitchen-sink flow', () => {
  test('signup → add expense → create + submit report → notification', async ({ page }) => {
    const { email, accessToken } = await signup(page, uniqueEmail('journey'))

    // 1. Land on /dashboard with KPIs.
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.locator('h1').first()).toBeVisible()

    // 2. Add an expense via the UI.
    await page.goto(APP_BASE + '/expenses/new')
    await page.locator('#merchant').fill('E2E Tea House')
    await page.locator('#amount').fill('18.42')
    await page.locator('#date').fill(new Date().toISOString().slice(0, 10))
    const expenseReqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /save expense/i })
        .first()
        .click()
      await page.waitForURL(/\/expenses(?!\/new)/, { timeout: 10000 })
    })
    const expensePost = expenseReqs.find(
      (r) => r.method === 'POST' && /\/api\/expenses(\?|$)/.test(r.url),
    )
    expect(expensePost?.status).toBeLessThan(400)

    // Read-after-write: the expense list should now contain the new row.
    const list = await page.request.get(`${API_BASE}/expenses`, {
      headers: apiHeaders(accessToken),
    })
    expect(list.status()).toBeLessThan(400)
    const expenses = (await list.json()) as Array<{ merchant?: string }>
    expect(expenses.some((e) => e.merchant === 'E2E Tea House')).toBe(true)

    // 3. Create + submit a report containing that draft expense.
    await page.goto(APP_BASE + '/reports/new')
    await page.locator('#title').fill('E2E Journey Report')
    await page.locator('#purpose').fill('Kitchen-sink test')
    await page.locator('#approver').fill(`approver+${email}`)
    const reportReqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /submit for approval/i })
        .first()
        .click()
      await page.waitForURL('**/reports/list', { timeout: 15000 })
    })
    const created = reportReqs.find(
      (r) => r.method === 'POST' && /\/api\/reports(\?|$)/.test(r.url),
    )
    expect(created?.status).toBeLessThan(400)
    const submitted = reportReqs.find(
      (r) => r.method === 'POST' && /\/api\/reports\/[\w-]+\/submit/.test(r.url),
    )
    expect(submitted?.status).toBeLessThan(400)

    // Read-after-write: the report list contains the new submitted report.
    const reportsRes = await page.request.get(`${API_BASE}/reports`, {
      headers: apiHeaders(accessToken),
    })
    expect(reportsRes.status()).toBeLessThan(400)
    const reports = (await reportsRes.json()) as Array<{
      title?: string
      status?: string
    }>
    const report = reports.find((r) => r.title === 'E2E Journey Report')
    expect(report?.status).toBe('submitted')

    // 4. Activity feed reflects the submission (notification was recorded).
    const notifsRes = await page.request.get(`${API_BASE}/notifications`, {
      headers: apiHeaders(accessToken),
    })
    expect(notifsRes.status()).toBeLessThan(400)
    const notifs = (await notifsRes.json()) as Array<{ title?: string; type?: string }>
    expect(
      notifs.some((n) => /E2E Journey Report/.test(n.title ?? '') || n.type === 'submitted'),
    ).toBe(true)

    // 5. Settings persists across reload — change name, reload, verify.
    await page.goto(APP_BASE + '/settings')
    const newName = 'Journey User ' + Date.now()
    await page.locator('#profile-name').fill(newName)
    await page.locator('[data-mol-id="settings-save-profile"]').click()
    await expect(page.locator('[data-mol-id="settings-profile-saved"]')).toBeVisible({
      timeout: 5000,
    })
    await page.reload()
    await page.waitForLoadState('networkidle')
    expect(await page.locator('#profile-name').inputValue()).toBe(newName)

    // 6. Theme/lang/etc. — sign out cleanly so the next test gets a fresh
    //    session.
    const userMenu = page.getByRole('button', { name: /open user menu|account|profile/i }).first()
    await userMenu.click()
    const signOut = page.getByRole('button', { name: /sign\s*out|log\s*out/i }).first()
    if (await signOut.count().catch(() => 0)) {
      await signOut.click()
      await page.waitForURL(/\/(login|$)/, { timeout: 5000 }).catch(() => {})
    }
  })
})
