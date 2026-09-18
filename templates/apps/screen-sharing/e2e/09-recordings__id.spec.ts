import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  captureNetwork,
  createRecording,
  listComments,
  postComment,
  signup,
} from './_helpers.js'

test.describe('recordings/:id', () => {
  test('renders the recording title fetched from the API', async ({ page }) => {
    const { accessToken } = await signup(page)
    const rec = await createRecording(page, accessToken, { title: 'Detail title test' })
    await page.goto(`${APP_BASE}/recordings/${rec.id}`)
    await expect(page.getByText('Detail title test').first()).toBeVisible({ timeout: 10_000 })
  })

  test('captureNetwork sees GET /api/recordings/:id', async ({ page }) => {
    const { accessToken } = await signup(page)
    const rec = await createRecording(page, accessToken, { title: 'Net detail' })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(`${APP_BASE}/recordings/${rec.id}`)
      await page.waitForLoadState('networkidle')
    })
    const call = reqs.find((r) => r.url.includes(`/api/recordings/${rec.id}`) && r.method === 'GET')
    expect(call?.status).toBe(200)
  })

  test('captureNetwork sees GET /api/comments/:recordingId', async ({ page }) => {
    const { accessToken } = await signup(page)
    const rec = await createRecording(page, accessToken, { title: 'Comments load' })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(`${APP_BASE}/recordings/${rec.id}`)
      await page.waitForLoadState('networkidle')
    })
    const call = reqs.find((r) => r.url.includes(`/api/comments/${rec.id}`) && r.method === 'GET')
    expect(call?.status).toBe(200)
  })

  test('comment POST persists and shows up in the list', async ({ page }) => {
    const { accessToken } = await signup(page)
    const rec = await createRecording(page, accessToken, { title: 'Comment persist' })
    const created = await postComment(page, accessToken, rec.id, 'Looks great!', 1500)
    expect(created.content).toBe('Looks great!')
    const list = await listComments(page, accessToken, rec.id)
    expect(list.some((c) => c.id === created.id)).toBe(true)
  })

  test('share token is non-empty so /share/:token is reachable', async ({ page }) => {
    const { accessToken } = await signup(page)
    const rec = await createRecording(page, accessToken, {
      title: 'Share link',
      visibility: 'public',
    })
    expect(rec.share_token.length).toBeGreaterThan(4)
  })

  test('comment count rises after a successful POST', async ({ page }) => {
    const { accessToken } = await signup(page)
    const rec = await createRecording(page, accessToken, { title: 'Comment count' })
    await postComment(page, accessToken, rec.id, 'hi')
    await postComment(page, accessToken, rec.id, 'again')
    const list = await listComments(page, accessToken, rec.id)
    expect(list.length).toBeGreaterThanOrEqual(2)
  })

  test('owner can record a view hit via POST /api/views/:recordingId', async ({ page }) => {
    const { accessToken } = await signup(page)
    const rec = await createRecording(page, accessToken, { title: 'View record' })
    const res = await page.request.post(
      `http://localhost:${process.env.API_PORT || '4000'}/api/views/${rec.id}`,
      {
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        data: {},
        failOnStatusCode: false,
      },
    )
    expect(res.status()).toBe(201)
  })
})
