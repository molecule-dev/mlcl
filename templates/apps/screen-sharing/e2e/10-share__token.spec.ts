import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, createRecording, signup } from './_helpers.js'

test.describe('public share /share/:token', () => {
  test('valid public share renders the recording title', async ({ page }) => {
    const { accessToken } = await signup(page)
    const rec = await createRecording(page, accessToken, {
      title: 'Public share title',
      visibility: 'public',
    })
    await page.goto(APP_BASE + '/share/' + rec.share_token)
    await expect(page.getByText('Public share title').first()).toBeVisible({ timeout: 10_000 })
  })

  test('GET /api/recordings/shared/:token returns the recording without auth', async ({ page }) => {
    const { accessToken } = await signup(page)
    const rec = await createRecording(page, accessToken, {
      title: 'Public token fetch',
      visibility: 'public',
    })
    const res = await page.request.get(`${API_BASE}/recordings/shared/${rec.share_token}`)
    expect(res.status()).toBe(200)
    const body = (await res.json()) as { id: string; title: string }
    expect(body.id).toBe(rec.id)
  })

  test('invalid share token returns 404', async ({ page }) => {
    const res = await page.request.get(`${API_BASE}/recordings/shared/this-is-not-a-real-token`)
    expect(res.status()).toBe(404)
  })

  test('public share page renders even when un-authenticated', async ({ page }) => {
    const { accessToken } = await signup(page)
    const rec = await createRecording(page, accessToken, {
      title: 'Anon viewable',
      visibility: 'public',
    })
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/share/' + rec.share_token)
    await expect(page.getByText('Anon viewable').first()).toBeVisible({ timeout: 10_000 })
  })

  test('captureNetwork sees the public-shared call on page load', async ({ page }) => {
    const { accessToken } = await signup(page)
    const rec = await createRecording(page, accessToken, {
      title: 'Net public',
      visibility: 'public',
    })
    await page.evaluate(() => window.localStorage.clear())
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/share/' + rec.share_token)
      await page.waitForLoadState('networkidle')
    })
    const call = reqs.find(
      (r) => r.url.includes(`/api/recordings/shared/${rec.share_token}`) && r.method === 'GET',
    )
    expect(call?.status).toBe(200)
  })
})
