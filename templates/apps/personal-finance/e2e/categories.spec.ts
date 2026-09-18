import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedCategory, signup } from './_helpers.js'

test('Categories page loads for new user and fires GET /api/categories', async ({ page }) => {
  const { accessToken } = await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/categories')
    await page.waitForLoadState('networkidle')
  })
  const get = reqs.find((r) => r.method === 'GET' && /\/api\/categories/.test(r.url))
  expect(get, 'expected GET /api/categories on page load').toBeDefined()
  expect(get?.status).toBe(200)
  const list = await page.request.get('/api/categories', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  expect(list.status()).toBe(200)
  const body = (await list.json()) as Array<unknown>
  expect(Array.isArray(body)).toBe(true)
})

test('POST /api/categories creates a category visible via GET (read-after-write)', async ({
  page,
}) => {
  const { accessToken } = await signup(page)
  const c = await seedCategory(page, accessToken, { name: 'Coffee', type: 'expense' })

  const list = await page.request.get('/api/categories', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  expect(list.status()).toBe(200)
  const body = (await list.json()) as Array<{ id: string; name: string; type: string }>
  expect(body.find((cat) => cat.id === c.id)).toBeTruthy()
})

test('PUT /api/categories/:id updates a category (read-after-write)', async ({ page }) => {
  const { accessToken } = await signup(page)
  const c = await seedCategory(page, accessToken, { name: 'Original', type: 'expense' })
  const put = await page.request.put(`/api/categories/${c.id}`, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    data: { name: 'Renamed', color: '#ff00aa' },
  })
  expect(put.status()).toBe(200)

  const list = await page.request.get('/api/categories', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const body = (await list.json()) as Array<{ id: string; name: string; color: string }>
  const updated = body.find((cat) => cat.id === c.id)
  expect(updated?.name).toBe('Renamed')
  expect(updated?.color).toBe('#ff00aa')
})

test('DELETE /api/categories/:id removes the category (read-after-write)', async ({ page }) => {
  const { accessToken } = await signup(page)
  const c = await seedCategory(page, accessToken, { name: 'Doomed', type: 'expense' })
  const del = await page.request.delete(`/api/categories/${c.id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  expect(del.status()).toBeLessThan(300)

  const list = await page.request.get('/api/categories', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const body = (await list.json()) as Array<{ id: string }>
  expect(body.find((cat) => cat.id === c.id)).toBeFalsy()
})
