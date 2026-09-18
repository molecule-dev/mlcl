import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  captureNetwork,
  pickContact,
  pickDirectConversation,
  pickGroup,
  pickNotification,
  signup,
  uniqueEmail,
} from './_helpers.js'

/**
 * End-to-end "kitchen-sink" journey for a brand-new Hush user:
 *
 *   1. Sign up → land on /inbox with conversations + contacts
 *   2. Inbox → click the first DM → /conversations/:id with prior messages
 *   3. Conversation → send a message, verify POST /api/messages, persistence
 *   4. Inbox → /contacts → click a contact → /contacts/:id detail
 *   5. /groups → /groups/new → fill the form (we do not actually submit
 *      because the create button works from contacts; this just verifies
 *      the form renders and routes)
 *   6. /search → type a query → /api/search returns hits
 *   7. /notifications → mark all read, verify backend call
 *   8. /settings → toggle a privacy setting → verify PUT /preferences
 *   9. /profile → update status text → verify PATCH /api/profile/me + reload
 *  10. /pricing → confirm three tiers visible
 *
 * Touches every primary user-facing surface in one session and asserts
 * each action against the backend (read-after-write) instead of just the
 * UI mock. If any step regresses, we want this single test to scream.
 */
test('full hush journey: signup → message → contacts → groups → search → notifications → settings → profile → pricing', async ({
  page,
}) => {
  test.setTimeout(180_000)

  // 1. Signup.
  const { name } = await signup(page, uniqueEmail('journey'))
  await expect(page).toHaveURL(/\/inbox/, { timeout: 20000 })
  // Every row this journey drives is read from the API — the demo roster is
  // the first thing an app's owner replaces.
  const convo = await pickDirectConversation(page)
  await expect(page.getByText(convo.name).first()).toBeVisible({ timeout: 15000 })

  // 2. Click the first conversation.
  await page.getByRole('link', { name: convo.name, exact: false }).first().click()
  await expect(page).toHaveURL(/\/conversations\/[0-9a-f-]{36}$/)

  // 3. Send a message; verify backend POST and persistence on reload.
  const stamp = `journey-msg-${Date.now()}`
  const sendReqs = await captureNetwork(page, async () => {
    await page.getByRole('textbox', { name: /message/i }).fill(stamp)
    await page.getByRole('button', { name: /send/i }).click()
    await page.waitForTimeout(1500)
  })
  expect(
    sendReqs.some(
      (r) => r.method === 'POST' && /\/api\/messages\b/.test(r.url) && r.status === 201,
    ),
  ).toBeTruthy()
  await page.reload()
  await expect(page.getByText(stamp)).toBeVisible({ timeout: 15000 })

  // 4. Contacts.
  const contact = await pickContact(page)
  await page.goto(APP_BASE + '/contacts')
  await expect(page.getByText(contact.name).first()).toBeVisible({ timeout: 15000 })
  await page.getByRole('link', { name: contact.name, exact: false }).first().click()
  await expect(page).toHaveURL(/\/contacts\/[0-9a-f-]{36}$/)

  // 5. Groups.
  const group = await pickGroup(page)
  await page.goto(APP_BASE + '/groups')
  await expect(page.getByText(group.name).first()).toBeVisible({ timeout: 15000 })
  await page
    .getByRole('link', { name: /new group/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/groups\/new$/)

  // 6. Search — query a name the roster really holds.
  await page.goto(APP_BASE + '/search')
  const searchReqs = await captureNetwork(page, async () => {
    await page.getByRole('searchbox').fill(contact.name)
    await page.waitForTimeout(800)
  })
  expect(searchReqs.some((r) => r.method === 'GET' && /\/api\/search/.test(r.url))).toBeTruthy()

  // 7. Notifications.
  const notification = await pickNotification(page)
  await page.goto(APP_BASE + '/notifications')
  await expect(page.getByText(notification.title).first()).toBeVisible({ timeout: 15000 })
  const notifReqs = await captureNetwork(page, async () => {
    const btn = page.getByRole('button', { name: /mark all read/i }).first()
    if (await btn.count().catch(() => 0)) {
      await btn.click()
      await page.waitForTimeout(1500)
    }
  })
  expect(
    notifReqs.some((r) => r.method === 'POST' && /\/api\/notifications\/read-all/.test(r.url)),
  ).toBeTruthy()

  // 8. Settings.
  await page.goto(APP_BASE + '/settings')
  const prefReqs = await captureNetwork(page, async () => {
    const cb = page.getByRole('checkbox').first()
    if (await cb.isChecked()) await cb.uncheck()
    else await cb.check()
    await page.waitForTimeout(1500)
  })
  expect(
    prefReqs.some((r) => r.method === 'PUT' && /\/api\/profile\/preferences/.test(r.url)),
  ).toBeTruthy()

  // 9. Profile.
  await page.goto(APP_BASE + '/profile')
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 })
  const status = `Journey status ${Date.now()}`
  const profReqs = await captureNetwork(page, async () => {
    await page
      .getByLabel(/status/i)
      .first()
      .fill(status)
    await page.getByRole('button', { name: /save/i }).first().click()
    await page.waitForTimeout(1500)
  })
  expect(
    profReqs.some(
      (r) => r.method === 'PATCH' && /\/api\/profile\/me/.test(r.url) && r.status === 200,
    ),
  ).toBeTruthy()
  await page.reload()
  await expect(page.getByLabel(/status/i).first()).toHaveValue(status)

  // 10. Pricing.
  await page.goto(APP_BASE + '/pricing')
  await expect(page.getByText(/free/i).first()).toBeVisible({ timeout: 15000 })
  await expect(page.getByText(/pro/i).first()).toBeVisible()
  await expect(page.getByText(/team/i).first()).toBeVisible()
})
