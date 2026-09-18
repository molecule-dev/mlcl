import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  captureNetwork,
  pickDirectConversation,
  pickLatestMessage,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('conversation page', () => {
  test('opening a conversation shows its messages and a composer', async ({ page }) => {
    await signup(page, uniqueEmail('conv'))
    await page.waitForURL(/\/inbox/, { timeout: 20000 })
    // Read the thread under test from the API — the demo roster and its
    // dialogue are the first thing an app's owner replaces.
    const convo = await pickDirectConversation(page)
    const message = await pickLatestMessage(page, convo.id)
    await page.getByRole('link', { name: convo.name, exact: false }).first().click()
    await expect(page).toHaveURL(/\/conversations\/[0-9a-f-]{36}$/)
    // The thread's own dialogue renders.
    await expect(page.getByText(message.body).first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('textbox', { name: /message/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /send/i })).toBeVisible()
  })

  test('sending a message POSTs /api/messages and the message persists across reload', async ({
    page,
  }) => {
    await signup(page, uniqueEmail('send'))
    await page.waitForURL(/\/inbox/, { timeout: 20000 })
    const convo = await pickDirectConversation(page)
    await page.getByRole('link', { name: convo.name, exact: false }).first().click()
    await expect(page).toHaveURL(/\/conversations\/[0-9a-f-]{36}$/)

    const stamp = `e2e-msg-${Date.now()}`
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('textbox', { name: /message/i }).fill(stamp)
      await page.getByRole('button', { name: /send/i }).click()
      await page.waitForTimeout(1500)
    })
    expect(
      reqs.some((r) => r.method === 'POST' && /\/api\/messages\b/.test(r.url) && r.status === 201),
    ).toBeTruthy()
    await expect(page.getByText(stamp)).toBeVisible()

    // Read-after-write: reload and confirm the message is still there.
    await page.reload()
    await expect(page.getByText(stamp)).toBeVisible({ timeout: 15000 })
  })

  test('back button returns to /inbox', async ({ page }) => {
    await signup(page, uniqueEmail('conv-back'))
    await page.waitForURL(/\/inbox/, { timeout: 20000 })
    const convo = await pickDirectConversation(page)
    await page.getByRole('link', { name: convo.name, exact: false }).first().click()
    await expect(page).toHaveURL(/\/conversations\/[0-9a-f-]{36}$/)
    await page
      .getByRole('link', { name: /back to inbox|inbox/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/inbox/)
  })

  test('opening a conversation marks it read (POST /conversations/:id/read)', async ({ page }) => {
    await signup(page, uniqueEmail('conv-read'))
    await page.waitForURL(/\/inbox/, { timeout: 20000 })
    const convo = await pickDirectConversation(page)
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('link', { name: convo.name, exact: false }).first().click()
      await page.waitForLoadState('networkidle')
    })
    expect(
      reqs.some(
        (r) => r.method === 'POST' && /\/api\/conversations\/[0-9a-f-]{36}\/read/.test(r.url),
      ),
    ).toBeTruthy()
  })
})
