import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/messages — Secure inbox', () => {
  test('Unauthenticated visit redirects to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/messages')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('Renders Messages heading + secure inbox eyebrow', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/messages')
    await expect(page.getByRole('heading', { level: 1, name: /^Messages$/i })).toBeVisible({
      timeout: 15000,
    })
    await expect(page.getByText(/secure inbox/i)).toBeVisible()
  })

  test('Calls GET /api/messages on initial load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/messages')
      await expect(page.getByRole('heading', { name: /^Messages$/i })).toBeVisible({
        timeout: 15000,
      })
    })
    const hit = reqs.find((r) => r.method === 'GET' && /\/api\/messages(\?|$)/.test(r.url))
    expect(hit, 'must call GET /api/messages on load').toBeTruthy()
    expect(hit!.status).toBeLessThan(400)
  })

  test('Empty-state composer: typing + Send creates a real message via POST /api/messages', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/messages')
    await expect(page.getByRole('heading', { name: /^Messages$/i })).toBeVisible({ timeout: 15000 })
    // Brand-new patient may have no thread; the composer textarea is the
    // empty-state form. Type, click Send, capture POST.
    const composer = page.getByPlaceholder(/Type your message|Type a reply/i).first()
    await expect(composer).toBeVisible()
    const sentinel = `hello-from-test-${Date.now()}`
    await composer.fill(sentinel)
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /(send|reply)/i })
        .first()
        .click()
      // After successful send, list refreshes; sentinel preview should appear.
      await expect(page.locator('body')).toContainText(sentinel.slice(0, 40), { timeout: 10000 })
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/messages(\?|$)/.test(r.url))
    expect(post, 'send must POST /api/messages').toBeTruthy()
    expect(post!.status).toBeLessThan(400)
  })

  test('After first send, the thread is selectable in the inbox sidebar', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/messages')
    const composer = page.getByPlaceholder(/Type your message|Type a reply/i).first()
    await expect(composer).toBeVisible({ timeout: 15000 })
    const sentinel = `note-${Date.now()}`
    await composer.fill(sentinel)
    await page
      .getByRole('button', { name: /(send|reply)/i })
      .first()
      .click()
    // The new thread shows up in the list with the sender ("You") and preview.
    await expect(page.getByText(/^You$/).first()).toBeVisible({ timeout: 15000 })
  })

  test('Send button stays disabled until composer has text', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/messages')
    const composer = page.getByPlaceholder(/Type your message|Type a reply/i).first()
    await expect(composer).toBeVisible({ timeout: 15000 })
    const sendBtn = page.getByRole('button', { name: /^Send/i }).first()
    await expect(sendBtn).toBeDisabled()
    await composer.fill('hi')
    await expect(sendBtn).toBeEnabled()
  })
})
