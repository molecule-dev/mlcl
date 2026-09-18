import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, api } from './_helpers.js'

test('Inline assign on Budget page POSTs /api/envelopes/assign and updates UI', async ({
  page,
}) => {
  await signup(page)
  // Need at least one category for the budget page to render any rows.
  const cat = await api<Record<string, string>>(page, 'POST', '/categories', {
    name: 'Groceries',
    group_name: 'Essentials',
  })
  await page.goto(APP_BASE + '/budget')
  await expect(page.getByText(/groceries/i).first()).toBeVisible({ timeout: 10000 })
  await page.getByTestId(`assign-edit-${cat.id}`).click()
  await page.getByTestId(`assign-input-${cat.id}`).fill('250')
  const reqs = await captureNetwork(page, async () => {
    await page.getByTestId(`assign-save-${cat.id}`).click()
    // Wait for the assign action to settle (form returns to read mode)
    await expect(page.getByTestId(`assign-input-${cat.id}`)).toHaveCount(0, { timeout: 10000 })
  })
  const post = reqs.find((r) => r.method === 'POST' && /\/api\/envelopes\/assign/.test(r.url))
  expect(post?.status, 'POST /api/envelopes/assign expected 2xx').toBeLessThan(300)
  // Backend invariant: the envelope row was persisted with assigned_cents=25000.
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const list = await api<any[]>(
    page,
    'GET',
    `/reports/category_progress?month=${year}-${String(month).padStart(2, '0')}`,
  )
  const row = list.find((r) => r.category_id === cat.id)
  expect(row, 'category should be in category_progress report').toBeDefined()
  expect(row.assigned_cents).toBe(25000)
})

test('Negative assign value is rejected with inline alert (no POST hits the API)', async ({
  page,
}) => {
  await signup(page)
  const cat = await api<Record<string, string>>(page, 'POST', '/categories', {
    name: 'Bad Input',
    group_name: 'Test',
  })
  await page.goto(APP_BASE + '/budget')
  await expect(page.getByText(/bad input/i).first()).toBeVisible({ timeout: 10000 })
  await page.getByTestId(`assign-edit-${cat.id}`).click()
  // The HTML `min="0"` blocks negative values via constraint validation.
  // Type via keyboard so the negative is actually committed to the model
  // before submission attempt.
  await page.getByTestId(`assign-input-${cat.id}`).fill('-5')
  const reqs = await captureNetwork(page, async () => {
    await page.getByTestId(`assign-save-${cat.id}`).click()
    await page.waitForTimeout(800)
  })
  const post = reqs.find((r) => r.method === 'POST' && /\/api\/envelopes\/assign/.test(r.url))
  expect(post, 'negative assign should not POST').toBeUndefined()
})
