/**
 * Topics — CRUD + materials. Asserts on backend invariants
 * (read-after-write), not just UI side-effects.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, apiHeaders, seedTopic, signup } from './_helpers.js'

test('POST /topics persists row and GET /topics returns it', async ({ page }) => {
  const { accessToken } = await signup(page)
  const seeded = await seedTopic(page, accessToken, { title: 'Quantum mechanics' })

  const list = await page.request.get(`${API_BASE}/topics`, {
    headers: apiHeaders(accessToken),
  })
  expect(list.status()).toBe(200)
  const rows = (await list.json()) as Array<{ id: string; title: string }>
  expect(rows.find((r) => r.id === seeded.id)?.title).toBe('Quantum mechanics')
})

test('GET /topics/:id returns the topic for its owner', async ({ page }) => {
  const { accessToken } = await signup(page)
  const seeded = await seedTopic(page, accessToken)
  const res = await page.request.get(`${API_BASE}/topics/${seeded.id}`, {
    headers: apiHeaders(accessToken),
  })
  expect(res.status()).toBe(200)
  const body = (await res.json()) as { id: string }
  expect(body.id).toBe(seeded.id)
})

test('topics scoped by user_id (no IDOR)', async ({ page, browser }) => {
  const ownerCtx = await browser.newContext()
  const ownerPage = await ownerCtx.newPage()
  const owner = await signup(ownerPage)
  const seeded = await seedTopic(ownerPage, owner.accessToken)

  const intruderCtx = await browser.newContext()
  const intruderPage = await intruderCtx.newPage()
  const intruder = await signup(intruderPage)

  const res = await intruderPage.request.get(`${API_BASE}/topics/${seeded.id}`, {
    headers: apiHeaders(intruder.accessToken),
  })
  expect(res.status()).toBe(404)

  await ownerCtx.close()
  await intruderCtx.close()
})

test('PATCH /topics/:id updates fields', async ({ page }) => {
  const { accessToken } = await signup(page)
  const seeded = await seedTopic(page, accessToken)
  const res = await page.request.patch(`${API_BASE}/topics/${seeded.id}`, {
    headers: apiHeaders(accessToken),
    data: { title: 'Updated Title', subject: 'physics' },
    failOnStatusCode: false,
  })
  expect(res.status()).toBe(200)

  const reread = await page.request.get(`${API_BASE}/topics/${seeded.id}`, {
    headers: apiHeaders(accessToken),
  })
  const body = (await reread.json()) as { title: string; subject?: string }
  expect(body.title).toBe('Updated Title')
  expect(body.subject).toBe('physics')
})

test('DELETE /topics/:id removes the row', async ({ page }) => {
  const { accessToken } = await signup(page)
  const seeded = await seedTopic(page, accessToken)
  const del = await page.request.delete(`${API_BASE}/topics/${seeded.id}`, {
    headers: apiHeaders(accessToken),
  })
  expect(del.status()).toBe(204)

  const reread = await page.request.get(`${API_BASE}/topics/${seeded.id}`, {
    headers: apiHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(reread.status()).toBe(404)
})

test('POST /topics/:id/materials persists material and bumps material_count', async ({ page }) => {
  const { accessToken } = await signup(page)
  const seeded = await seedTopic(page, accessToken)

  const create = await page.request.post(`${API_BASE}/topics/${seeded.id}/materials`, {
    headers: apiHeaders(accessToken),
    data: {
      title: 'Lecture notes',
      content: 'Photosynthesis converts light to chemical energy via chlorophyll.',
    },
    failOnStatusCode: false,
  })
  expect(create.status(), await create.text()).toBe(201)

  const list = await page.request.get(`${API_BASE}/topics/${seeded.id}/materials`, {
    headers: apiHeaders(accessToken),
  })
  expect(list.status()).toBe(200)
  const items = (await list.json()) as Array<{ title: string }>
  expect(items.find((i) => i.title === 'Lecture notes')).toBeTruthy()

  const reread = await page.request.get(`${API_BASE}/topics/${seeded.id}`, {
    headers: apiHeaders(accessToken),
  })
  const topic = (await reread.json()) as { material_count: number }
  expect(topic.material_count).toBeGreaterThanOrEqual(1)
})

test('Topics page lists newly-created topic in the UI', async ({ page }) => {
  const { accessToken } = await signup(page)
  const seeded = await seedTopic(page, accessToken, { title: `UITopic ${Date.now()}` })
  await page.goto(`${APP_BASE}/courses`)
  await expect(page.getByText(seeded.title)).toBeVisible()
})
