/**
 * 99-user-journey — kitchen-sink end-to-end happy path covering the
 * whole product:
 *   1. Sign up
 *   2. Create a document from a template
 *   3. Edit + save the document
 *   4. Post a comment on it
 *   5. Trash it, restore it
 *   6. Share it with another fresh user
 *   7. Verify recipient sees it on /shared
 *   8. Update profile in /profile
 *   9. Toggle a settings preference
 *  10. Verify notifications page renders
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authHeaders, signup, uniqueEmail } from './_helpers.js'

test.describe('99 — full user journey', () => {
  test('signup → template → edit → comment → trash/restore → share → recipient sees it', async ({
    page,
    browser,
  }) => {
    test.setTimeout(180_000)

    const ownerEmail = uniqueEmail('uj-owner')
    const recipientEmail = uniqueEmail('uj-recipient')

    const recipientCtx = await browser.newContext()
    const recipientPage = await recipientCtx.newPage()
    const recipient = await signup(recipientPage, recipientEmail)
    await recipientCtx.close()

    const owner = await signup(page, ownerEmail)
    await expect(page).toHaveURL(/\/dashboard/)

    // 1. Pick a template and create a doc from it
    await page.goto(APP_BASE + '/templates')
    await page.waitForSelector('[data-testid="templates-grid"]', { timeout: 15_000 })
    const firstUseBtn = page.locator('[data-testid^="templates-use-"]').first()
    await firstUseBtn.click()
    await page.waitForURL(/\/doc\/[0-9a-f-]{36}/, { timeout: 15_000 })
    const docUrl = page.url()
    const docId = docUrl.split('/doc/')[1]!.split('/')[0]!

    // 2. Edit title + body, autosave persists
    await page.waitForSelector('[data-testid="editor-title"]')
    await page.getByTestId('editor-title').fill('Journey doc')
    await page.getByTestId('editor-body').fill('Journey body content for testing.')
    await page.waitForTimeout(1500)
    const afterEdit = await page.request.get(`${API_BASE}/documents/${docId}`, {
      headers: authHeaders(owner.accessToken),
    })
    const afterEditBody = (await afterEdit.json()) as { title: string }
    expect(afterEditBody.title).toBe('Journey doc')

    // 3. Post a comment
    await page.goto(APP_BASE + `/doc/${docId}/comments`)
    await page.waitForSelector('[data-testid="comments-new-form"]')
    const sentinel = `Journey comment ${Date.now()}`
    await page.getByTestId('comments-new-body').fill(sentinel)
    await page.getByTestId('comments-new-submit').click()
    await page.waitForTimeout(700)
    const comments = await page.request.get(`${API_BASE}/comments/${docId}`, {
      headers: authHeaders(owner.accessToken),
    })
    const items = (await comments.json()) as Array<{ body: string }>
    expect(items.find((c) => c.body === sentinel)).toBeDefined()

    // 4. Trash it then restore
    await page.goto(APP_BASE + `/doc/${docId}`)
    await page.waitForSelector('[data-testid="editor-trash"]')
    page.once('dialog', (d) => d.accept())
    await page.getByTestId('editor-trash').click()
    await page.waitForTimeout(700)
    const trashedResp = await page.request.get(`${API_BASE}/documents/${docId}`, {
      headers: authHeaders(owner.accessToken),
    })
    expect(((await trashedResp.json()) as { trashed_at: string | null }).trashed_at).toBeTruthy()

    await page.request.post(`${API_BASE}/documents/${docId}/restore`, {
      headers: authHeaders(owner.accessToken),
      data: {},
    })
    const restoredResp = await page.request.get(`${API_BASE}/documents/${docId}`, {
      headers: authHeaders(owner.accessToken),
    })
    expect(((await restoredResp.json()) as { trashed_at: string | null }).trashed_at).toBeNull()

    // 5. Share it with the recipient
    const shareResp = await page.request.post(`${API_BASE}/sharing/${docId}`, {
      headers: authHeaders(owner.accessToken),
      data: { email: recipientEmail, role: 'editor' },
    })
    expect(shareResp.status()).toBe(201)

    const sharedList = await page.request.get(`${API_BASE}/documents/shared`, {
      headers: authHeaders(recipient.accessToken),
    })
    const sharedItems = (await sharedList.json()) as Array<{ id: string }>
    expect(sharedItems.find((d) => d.id === docId)).toBeDefined()

    // 6. Update profile
    await page.goto(APP_BASE + '/profile')
    await page.waitForSelector('[data-testid="profile-input-display-name"]', { timeout: 15_000 })
    await page.getByTestId('profile-input-display-name').fill('Journey User')
    await page.getByTestId('profile-save').click()
    await expect(page.getByTestId('profile-saved-banner')).toBeVisible({ timeout: 10_000 })

    // 7. Settings — toggle a notification pref
    await page.goto(APP_BASE + '/settings')
    await page.waitForSelector('[data-testid="settings-notif-comments"]', { timeout: 15_000 })
    await page.getByTestId('settings-notif-comments').click()
    await expect(page.getByTestId('settings-saved-indicator')).toBeVisible({ timeout: 10_000 })

    // 8. Notifications renders (seeded notifs + live ones)
    await page.goto(APP_BASE + '/notifications')
    await page.waitForSelector('[data-testid="notifications-list"]', { timeout: 15_000 })
    const notifCount = await page.locator('[data-testid="notifications-list"] > li').count()
    expect(notifCount).toBeGreaterThan(0)
  })
})
