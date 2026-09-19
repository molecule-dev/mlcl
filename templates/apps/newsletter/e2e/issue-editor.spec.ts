/**
 * /issues/new + /issues/:id/edit — the editor: subject + preview + markdown
 * body, save-draft, and publish (which fans delivery out server-side).
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authHeaders, seedIssue, signup, uniqueEmail } from './_helpers.js'

test.describe('issue editor', () => {
  test('saves a draft from the UI and it appears in the API', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('editor-draft'))
    const subject = `Editor draft ${Date.now()}`
    await page.goto(APP_BASE + '/issues/new')
    await page.locator('#issue-subject').fill(subject)
    await page.locator('#issue-preview').fill('Preview written in the editor spec.')
    await page.locator('#issue-body').fill('## Section\n\nBody written in the editor spec.')
    await page.locator('[data-mol-id="issue-editor-save-draft"]').click()
    // The saved indicator / status appears once the round-trip completes.
    await expect(page.locator('[data-mol-id="issue-editor-save-draft"]')).toBeEnabled({
      timeout: 15000,
    })
    const res = await page.request.get(`${API_BASE}/issues/mine/all?status=draft`, {
      headers: authHeaders(accessToken),
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as Array<{ subject: string; status: string }>
    expect(body.some((i) => i.subject === subject && i.status === 'draft')).toBe(true)
  })

  test('hydrates an existing draft via /issues/:id/edit', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('editor-hydrate'))
    const subject = `Hydrate me ${Date.now()}`
    const { id } = await seedIssue(page, accessToken, { subject, status: 'draft' })
    await page.goto(APP_BASE + `/issues/${id}/edit`)
    await expect(page.locator('#issue-subject')).toHaveValue(subject, { timeout: 15000 })
  })

  test('publish from the editor navigates back to the issues list as published', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('editor-publish'))
    const subject = `Publish me ${Date.now()}`
    await page.goto(APP_BASE + '/issues/new')
    await page.locator('#issue-subject').fill(subject)
    await page.locator('#issue-body').fill('Body for the publish spec.')
    await page.locator('[data-mol-id="issue-editor-publish"]').click()
    await page.waitForURL(/\/issues$/, { timeout: 20000 })
    const res = await page.request.get(`${API_BASE}/issues/mine/all?status=published`, {
      headers: authHeaders(accessToken),
    })
    const body = (await res.json()) as Array<{ subject: string; status: string }>
    expect(body.some((i) => i.subject === subject && i.status === 'published')).toBe(true)
  })
})
