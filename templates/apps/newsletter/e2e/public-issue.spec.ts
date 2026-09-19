/**
 * /issues/:id (public) + /unsubscribe/:token — the subscriber-facing side:
 * the rendered issue, the tokened open tracking, and the unsubscribe flip.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  authHeaders,
  seedIssue,
  seedSubscriber,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('public issue page', () => {
  test('renders a published issue for an anonymous reader', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('pub-read'))
    const { id, subject } = await seedIssue(page, accessToken, { status: 'published' })
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + `/issues/${id}`)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(subject, {
      timeout: 15000,
    })
    await expect(page.locator('[data-mol-id="public-issue"]')).toBeVisible()
  })

  test('a draft issue is NOT publicly readable', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('pub-draft'))
    const { id } = await seedIssue(page, accessToken, { status: 'draft' })
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + `/issues/${id}`)
    await expect(page.getByText(/does not exist|still a draft/i)).toBeVisible({ timeout: 15000 })
  })

  test('without a token the footer offers subscribe, not unsubscribe', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('pub-footer'))
    const { id } = await seedIssue(page, accessToken, { status: 'published' })
    await page.goto(APP_BASE + `/issues/${id}`)
    await expect(page.getByRole('link', { name: /subscribe/i }).first()).toBeVisible({
      timeout: 15000,
    })
  })

  test('with a token the footer carries the unsubscribe link and it unsubscribes', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('pub-unsub'))
    const reader = await seedSubscriber(page, accessToken)
    const { id } = await seedIssue(page, accessToken, { status: 'published' })
    await page.goto(APP_BASE + `/issues/${id}?t=${encodeURIComponent(reader.token)}`)
    const unsubscribe = page.getByRole('link', { name: /unsubscribe/i }).first()
    await expect(unsubscribe).toBeVisible({ timeout: 15000 })
    await unsubscribe.click()
    await expect(page.getByText(/you're unsubscribed/i)).toBeVisible({ timeout: 15000 })
    // The flip is real: read the subscriber back through the API.
    const res = await page.request.get(
      `${API_BASE}/subscribers?q=${encodeURIComponent(reader.email)}`,
      { headers: authHeaders(accessToken) },
    )
    const body = (await res.json()) as { data: Array<{ email: string; status: string }> }
    const row = body.data.find((s) => s.email === reader.email)
    expect(row!.status).toBe('unsubscribed')
  })

  test('an unknown unsubscribe token shows the invalid-link state', async ({ page }) => {
    await page.goto(APP_BASE + '/unsubscribe/definitely-not-a-token')
    await expect(page.getByText(/not valid/i)).toBeVisible({ timeout: 15000 })
  })
})
