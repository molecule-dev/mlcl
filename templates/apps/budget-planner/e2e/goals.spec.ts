import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, api } from './_helpers.js'

test('New goal toggles the form', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/goals')
  await expect(page.locator('input[name="name"]')).toHaveCount(0)
  await page.getByRole('button', { name: /new goal/i }).click()
  await expect(page.locator('input[name="name"]')).toBeVisible()
  await page.getByRole('button', { name: /cancel/i }).click()
  await expect(page.locator('input[name="name"]')).toHaveCount(0)
})

test('Empty state renders when no goals', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/goals')
  await expect(page.getByText(/no goals yet/i)).toBeVisible()
})

test('Submitting valid goal creates a row and persists across reload', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/goals')
  await page.getByRole('button', { name: /new goal/i }).click()
  await page.locator('input[name="name"]').fill('Rainy Day Fund')
  await page.locator('input[name="target"]').fill('5000')
  await page.locator('input[name="monthly"]').fill('250')
  const reqs = await captureNetwork(page, async () => {
    await page.getByRole('button', { name: /create goal/i }).click()
    await expect(page.getByText('Rainy Day Fund')).toBeVisible({ timeout: 10000 })
  })
  const post = reqs.find(
    (r) => r.method === 'POST' && /\/api\/goals(?!\/[\w-]+\/contributions)/.test(r.url),
  )
  expect(post?.status).toBeLessThan(300)
  const goals = await api<Array<Record<string, unknown>>>(page, 'GET', '/goals')
  const g = goals.find((x) => (x as any).name === 'Rainy Day Fund')
  expect(g).toBeDefined()
  expect((g as any).target_cents).toBe(500000)
  await page.reload()
  await expect(page.getByText('Rainy Day Fund')).toBeVisible()
})

test('Form rejects empty name with inline error', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/goals')
  await page.getByRole('button', { name: /new goal/i }).click()
  await page.locator('input[name="target"]').fill('1000')
  await page.getByRole('button', { name: /create goal/i }).click()
  await expect(page.getByRole('alert')).toBeVisible()
})

test('Form rejects zero/negative target with inline error', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/goals')
  await page.getByRole('button', { name: /new goal/i }).click()
  await page.locator('input[name="name"]').fill('Bad Target')
  await page.locator('input[name="target"]').fill('0')
  await page.getByRole('button', { name: /create goal/i }).click()
  await expect(page.getByRole('alert')).toBeVisible()
})

test('Clicking a goal card navigates to /goals/:id', async ({ page }) => {
  await signup(page)
  const g = await api<Record<string, string>>(page, 'POST', '/goals', {
    name: 'Vacation',
    target_cents: 200000,
    monthly_contribution_cents: 0,
  })
  await page.goto(APP_BASE + '/goals')
  await page.getByRole('link', { name: /vacation/i }).click()
  await expect(page).toHaveURL(new RegExp(`/goals/${g.id}`))
})
