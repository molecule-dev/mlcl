import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, api } from './_helpers.js'

test('New category button toggles the New category form', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/categories')
  await expect(page.locator('input[name="name"]')).toHaveCount(0)
  await page.getByRole('button', { name: /new category/i }).click()
  await expect(page.locator('input[name="name"]')).toBeVisible()
})

test('Submitting the New category form persists the row across reload', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/categories')
  await page.getByRole('button', { name: /new category/i }).click()
  const reqs = await captureNetwork(page, async () => {
    await page.locator('input[name="name"]').fill('Groceries')
    await page.locator('input[name="group_name"]').fill('Essentials')
    await page.getByRole('button', { name: /create category/i }).click()
    await expect(page.getByText('Groceries')).toBeVisible({ timeout: 10000 })
  })
  const post = reqs.find((r) => r.method === 'POST' && /\/api\/categories/.test(r.url))
  expect(post?.status).toBeLessThan(300)
  await page.reload()
  await expect(page.getByText('Groceries')).toBeVisible()
  // Read-after-write
  const cats = await api<Array<Record<string, unknown>>>(page, 'GET', '/categories')
  expect(cats.find((c) => c.name === 'Groceries')).toBeDefined()
})

test('Edit button reveals inline edit form, saves rename', async ({ page }) => {
  await signup(page)
  const cat = await api<Record<string, string>>(page, 'POST', '/categories', {
    name: 'Old Name',
    group_name: 'Misc',
  })
  await page.goto(APP_BASE + '/categories')
  await page.getByRole('button', { name: /^edit$/i }).click()
  const inputs = page.locator('input').filter({ hasNotText: '' })
  await inputs.first().fill('New Name')
  const reqs = await captureNetwork(page, async () => {
    await page.getByRole('button', { name: /^save$/i }).click()
    await expect(page.getByText('New Name')).toBeVisible({ timeout: 10000 })
  })
  const put = reqs.find(
    (r) => r.method === 'PUT' && new RegExp(`/api/categories/${cat.id}`).test(r.url),
  )
  expect(put?.status).toBeLessThan(300)
  // Persist
  const got = await api<Record<string, string>>(page, 'GET', `/categories/${cat.id}`)
  expect(got.name).toBe('New Name')
})

test('Archive button hides the category from the list', async ({ page }) => {
  await signup(page)
  await api(page, 'POST', '/categories', { name: 'Archive Me', group_name: 'Misc' })
  await page.goto(APP_BASE + '/categories')
  await expect(page.getByText('Archive Me')).toBeVisible()
  const reqs = await captureNetwork(page, async () => {
    await page.getByRole('button', { name: /archive/i }).click()
    await expect(page.getByText('Archive Me')).toHaveCount(0, { timeout: 10000 })
  })
  const put = reqs.find((r) => r.method === 'PUT' && /\/api\/categories\//.test(r.url))
  expect(put?.status).toBeLessThan(300)
})

test('Empty state shows when no categories exist', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/categories')
  await expect(page.getByText(/no categories yet/i)).toBeVisible()
})
