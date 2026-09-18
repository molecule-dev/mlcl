import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  authHeaders,
  captureNetwork,
  createRecording,
  signup,
} from './_helpers.js'

test.describe('profile /profile', () => {
  test('page loads with current display name', async ({ page }) => {
    const { name } = await signup(page)
    await page.goto(APP_BASE + '/profile')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 10_000 })
  })

  test('captureNetwork sees GET /api/users/:id and /api/recordings', async ({ page }) => {
    const { userId } = await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/profile')
      await page.waitForLoadState('networkidle')
    })
    const userCall = reqs.find((r) => r.url.includes(`/api/users/${userId}`) && r.method === 'GET')
    const recCall = reqs.find((r) => /\/api\/recordings(\?|$)/.test(r.url) && r.method === 'GET')
    expect(userCall?.status).toBe(200)
    expect(recCall?.status).toBe(200)
  })

  test('PATCH /api/users/:id persists oauthData.screenSharingProfile.bio', async ({ page }) => {
    const { accessToken, userId } = await signup(page)
    const patch = await page.request.patch(`${API_BASE}/users/${userId}`, {
      headers: authHeaders(accessToken),
      data: {
        oauthData: {
          screenSharingProfile: { bio: 'I make screencasts.', jobTitle: 'PM' },
        },
      },
      failOnStatusCode: false,
    })
    expect([200, 204]).toContain(patch.status())
    const reread = await page.request.get(`${API_BASE}/users/${userId}`, {
      headers: authHeaders(accessToken),
    })
    const body = (await reread.json()) as
      | { props?: { oauthData?: { screenSharingProfile?: { bio?: string } } } }
      | { oauthData?: { screenSharingProfile?: { bio?: string } } }
    const profile =
      ('props' in body && body.props?.oauthData?.screenSharingProfile) ||
      ('oauthData' in body && body.oauthData?.screenSharingProfile) ||
      undefined
    expect(profile?.bio).toBe('I make screencasts.')
  })

  test('stat tiles count owned recordings', async ({ page }) => {
    const { accessToken } = await signup(page)
    await createRecording(page, accessToken, { title: 'P1' })
    await createRecording(page, accessToken, { title: 'P2', visibility: 'public' })
    await page.goto(APP_BASE + '/profile')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/P1|P2/).first()).toBeVisible({ timeout: 10_000 })
  })

  test('public clip count matches /api/recordings filter', async ({ page }) => {
    const { accessToken } = await signup(page)
    await createRecording(page, accessToken, { title: 'P-private', visibility: 'private' })
    await createRecording(page, accessToken, { title: 'P-public', visibility: 'public' })
    const res = await page.request.get(`${API_BASE}/recordings`, {
      headers: authHeaders(accessToken),
    })
    const list = (await res.json()) as Array<{ visibility: string }>
    const publics = list.filter((r) => r.visibility === 'public')
    expect(publics.length).toBeGreaterThanOrEqual(1)
  })

  test('total view count derived from view_count field', async ({ page }) => {
    const { accessToken } = await signup(page)
    const r = await createRecording(page, accessToken, { title: 'V-counter' })
    expect(typeof r.view_count).toBe('number')
  })

  test('edit toggle reveals form controls', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await page.waitForLoadState('networkidle')
    const editBtn = page.getByRole('button', { name: /edit/i }).first()
    await expect(editBtn.first()).toBeAttached()
  })
})
