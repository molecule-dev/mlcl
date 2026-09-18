import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedGoal, signup } from './_helpers.js'

test('Goals page renders without leaked design-mockup goal data for a fresh user', async ({
  page,
}) => {
  await signup(page)
  await page.goto(APP_BASE + '/goals')
  await page.waitForLoadState('networkidle')
  // No fake "Hawaii Vacation $3,200 / $5,000" type rows
  await expect(page.getByText(/Hawaii Vacation/i)).toHaveCount(0)
})

test('Add Goal form persists and shows on /goals (read-after-write)', async ({ page }) => {
  const { accessToken } = await signup(page)
  const goalName = `Rainy Day Fund ${Date.now()}`

  await page.goto(APP_BASE + '/goals/new')
  await page.waitForLoadState('networkidle')
  await page.locator('[data-mol-id="add-goal-name"]').fill(goalName)
  await page.locator('[data-mol-id="add-goal-target"]').fill('10000')
  await page.locator('[data-mol-id="add-goal-current"]').fill('250')
  await page.locator('[data-mol-id="add-goal-target-date"]').fill('2030-12-31')

  const reqs = await captureNetwork(page, async () => {
    await page.locator('form button[type="submit"]').first().click()
    await page.waitForTimeout(2000)
  })
  const post = reqs.find((r) => /\/api\/goals$/.test(r.url) && r.method === 'POST')
  expect(post, 'POST /api/goals did not fire').toBeTruthy()
  expect(post!.status).toBeLessThan(300)

  const list = await page.request.get('/api/goals', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  expect(list.status()).toBe(200)
  const body = (await list.json()) as Array<{ name: string; target_amount: number | string }>
  const created = body.find((g) => g.name === goalName)
  expect(created, 'goal not in GET /api/goals').toBeTruthy()
  expect(Number(created!.target_amount)).toBe(10000)

  await page.goto(APP_BASE + '/goals')
  await page.waitForLoadState('networkidle')
  await expect(page.getByText(goalName).first()).toBeVisible({ timeout: 10_000 })
})

test('PUT /api/goals/:id updates current_amount (read-after-write)', async ({ page }) => {
  const { accessToken } = await signup(page)
  const g = await seedGoal(page, accessToken, { name: 'Bumpable Goal' })
  const put = await page.request.put(`/api/goals/${g.id}`, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    data: { current_amount: 999 },
  })
  expect(put.status()).toBe(200)
  const get = await page.request.get(`/api/goals/${g.id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const body = (await get.json()) as { current_amount: number | string }
  expect(Number(body.current_amount)).toBe(999)
})
