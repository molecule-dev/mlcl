import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedBudget, seedCategory, signup } from './_helpers.js'

test('Budgets page renders without crashing for fresh user (no fake demo budgets)', async ({
  page,
}) => {
  await signup(page)
  await page.goto(APP_BASE + '/budgets')
  await page.waitForLoadState('networkidle')
  // No leaked design-mockup numbers — the polished mockup had "$2,400" etc.
  // We just assert page loads with the Add Budget CTA (button or link).
  const addBtn = page.getByRole('button', { name: /add budget/i }).first()
  await expect(addBtn).toBeVisible({ timeout: 10_000 })
  // Empty-state message confirms zero budgets render — no leaked design data
  await expect(page.getByText(/no budgets yet|add one to start tracking/i).first()).toBeVisible({
    timeout: 5_000,
  })
})

test('Add Budget form persists and shows up on /budgets (read-after-write)', async ({ page }) => {
  const { accessToken } = await signup(page)
  const cat = await seedCategory(page, accessToken, { name: 'Groceries', type: 'expense' })

  await page.goto(APP_BASE + '/budgets/new')
  await page.waitForLoadState('networkidle')

  await page.locator('[data-mol-id="add-budget-category"]').selectOption(cat.id)
  await page.locator('[data-mol-id="add-budget-amount"]').fill('250')

  const reqs = await captureNetwork(page, async () => {
    await page.locator('form button[type="submit"]').first().click()
    await page.waitForTimeout(2000)
  })
  const post = reqs.find((r) => /\/api\/budgets$/.test(r.url) && r.method === 'POST')
  expect(post, 'POST /api/budgets did not fire').toBeTruthy()
  expect(post!.status).toBeLessThan(300)

  // Read-after-write via API
  const list = await page.request.get('/api/budgets', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  expect(list.status()).toBe(200)
  const body = (await list.json()) as Array<{ category_id: string; amount: number | string }>
  const created = body.find((b) => b.category_id === cat.id)
  expect(created, 'budget not in GET /api/budgets').toBeTruthy()
  expect(Number(created!.amount)).toBe(250)
})

test('PUT /api/budgets/:id updates the amount (read-after-write)', async ({ page }) => {
  const { accessToken } = await signup(page)
  const cat = await seedCategory(page, accessToken, { name: 'Dining', type: 'expense' })
  const b = await seedBudget(page, accessToken, { category_id: cat.id, amount: 300 })

  const put = await page.request.put(`/api/budgets/${b.id}`, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    data: { amount: 555 },
  })
  expect(put.status()).toBe(200)

  const get = await page.request.get(`/api/budgets/${b.id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const body = (await get.json()) as { amount: number | string }
  expect(Number(body.amount)).toBe(555)
})
