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
    // Arm the response wait BEFORE the click: the send POST must be awaited
    // by name, not by a fixed timeout — under parallel workers 1.5s is not
    // always enough, and waitForLoadState('networkidle') cannot be used
    // here because the /inbox document already reached networkidle before
    // the SPA click (that load state persists for the document's lifetime,
    // so the wait would resolve instantly and detach mid-flight).
    const sendPost = page.waitForResponse(
      (r) => r.request().method() === 'POST' && /\/api\/messages\b/.test(r.url()),
      { timeout: 20_000 },
    )
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('textbox', { name: /message/i }).fill(stamp)
      await page.getByRole('button', { name: /send/i }).click()
      await sendPost
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
    // Arm the response wait BEFORE the click. The read POST fires in the
    // fetch effect's .then(), AFTER both thread GETs — and React StrictMode
    // remounts the page once in dev, doubling that latency. A 500ms quiet
    // gap between the two mount rounds resolves
    // waitForLoadState('networkidle') (the state was already achieved while
    // the inbox form sat idle) and detaches the capture before the POST.
    // Awaiting the POST by name cannot be raced.
    const readPost = page.waitForResponse(
      (r) =>
        r.request().method() === 'POST' &&
        /\/api\/conversations\/[0-9a-f-]{36}\/read/.test(r.url()),
      { timeout: 20_000 },
    )
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('link', { name: convo.name, exact: false }).first().click()
      await readPost
    })
    expect(
      reqs.some(
        (r) => r.method === 'POST' && /\/api\/conversations\/[0-9a-f-]{36}\/read/.test(r.url),
      ),
    ).toBeTruthy()
  })
})
