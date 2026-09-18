import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  apiHeaders,
  captureNetwork,
  seedAccount,
  seedBudget,
  seedCategory,
  seedGoal,
  seedTransaction,
  signup,
} from './_helpers.js'

interface NotificationItem {
  id: string
  type: string
  title: string
  body: string
  severity: 'info' | 'warning' | 'critical' | 'success'
  link: string
  ts: string
}

test.describe('/notifications: derived alert feed', () => {
  test('Empty user sees the all-clear empty-state message', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByRole('heading', { name: /notifications/i }).first()).toBeVisible()
    await expect(page.locator('[data-mol-id="notifications-empty"]')).toBeVisible()
  })

  test('GET /api/notifications returns an array on the data field', async ({ page }) => {
    const { accessToken } = await signup(page)
    const res = await page.request.get(`${API_BASE}/notifications`, {
      headers: apiHeaders(accessToken),
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as { data: NotificationItem[]; count: number }
    expect(Array.isArray(body.data)).toBe(true)
    expect(typeof body.count).toBe('number')
  })

  test('Budget overspend produces a budget_exceeded notification with link to /budgets', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const acct = await seedAccount(page, accessToken, { name: 'Daily checking' })
    const cat = await seedCategory(page, accessToken, { name: 'Coffee', type: 'expense' })
    await seedBudget(page, accessToken, { category_id: cat.id, amount: 50 })
    // Create a transaction that overshoots the budget
    await seedTransaction(page, accessToken, {
      account_id: acct.id,
      category_id: cat.id,
      amount: 75,
      type: 'expense',
      description: 'Overshoot transaction',
    })

    const res = await page.request.get(`${API_BASE}/notifications`, {
      headers: apiHeaders(accessToken),
    })
    const body = (await res.json()) as { data: NotificationItem[] }
    const exceeded = body.data.find((n) => n.type === 'budget_exceeded')
    expect(exceeded, JSON.stringify(body)).toBeDefined()
    expect(exceeded?.severity).toBe('critical')
    expect(exceeded?.link).toBe('/budgets')
  })

  test('Goal milestone (100%) shows up as a notification with link to /goals', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedGoal(page, accessToken, {
      name: 'Emergency fund',
      target_amount: 1000,
      current_amount: 1000,
    })
    const res = await page.request.get(`${API_BASE}/notifications`, {
      headers: apiHeaders(accessToken),
    })
    const body = (await res.json()) as { data: NotificationItem[] }
    const milestone = body.data.find(
      (n) => n.type === 'goal_milestone' && /100/.test(n.title) && /Emergency fund/.test(n.title),
    )
    expect(milestone, JSON.stringify(body)).toBeDefined()
    expect(milestone?.severity).toBe('success')
    expect(milestone?.link).toBe('/goals')
  })

  test('Notifications page renders derived items as list with deep links', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedGoal(page, accessToken, {
      name: 'Vacation',
      target_amount: 1000,
      current_amount: 800,
    })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/notifications')
      await expect(page.locator('[data-mol-id="notifications-list"]')).toBeVisible({
        timeout: 10_000,
      })
    })
    const get = reqs.find((r) => /\/api\/notifications/.test(r.url) && r.method === 'GET')
    expect(get).toBeDefined()
    expect(get?.status).toBe(200)
    // Expect at least one notification "View details" deep-link to /goals
    const link = page.locator('a[href="/goals"]').first()
    await expect(link).toBeVisible()
  })
})
