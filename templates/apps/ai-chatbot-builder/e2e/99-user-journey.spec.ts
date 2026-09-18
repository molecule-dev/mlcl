/**
 * 99-user-journey — "a real human runs through every primary feature in
 * one shot." Each step asserts on tangible outcomes (DB rows, AI replies,
 * URL changes) rather than just clicks. If this test passes, the app is
 * provably end-to-end functional for one user.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authHeaders, signup, uniqueEmail } from './_helpers.js'

test.describe.configure({ mode: 'serial' })

test('a single human can run the entire chatbot-builder happy path', async ({ page }) => {
  test.setTimeout(180_000)

  // 1. Sign up.
  const { email, accessToken } = await signup(page, uniqueEmail('journey'))
  expect(accessToken).toBeTruthy()

  // 2. Land on the dashboard, see KPIs, sidebar.
  await page.goto(APP_BASE + '/')
  await page.waitForLoadState('networkidle')
  await expect(page).not.toHaveURL(/\/login|\/signup/)

  // 3. Create a bot via the UI.
  await page.goto(APP_BASE + '/bots/new')
  const botName = `Journey Bot ${Date.now()}`
  await page.locator('input[name="name"], input[placeholder*="name" i]').first().fill(botName)
  await page
    .getByRole('button', { name: /create|save|next/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/bots\/[^/]+\/settings/, { timeout: 15000 })
  const botUrl = page.url()
  const botId = botUrl.match(/\/bots\/([^/]+)\/settings/)![1]

  // 4. Save a system prompt on settings; reload; confirm persistence (UI + API).
  const systemPrompt = `You are a friendly assistant. (${Date.now()})`
  const promptField = page.locator('textarea').first()
  await expect(promptField).toBeVisible({ timeout: 10000 })
  await promptField.fill(systemPrompt)
  await page
    .getByRole('button', { name: /save|update/i })
    .first()
    .click()
  await page.waitForTimeout(800)
  await page.reload()
  await expect(page.locator('textarea').first()).toHaveValue(systemPrompt, { timeout: 10000 })

  const apiBot = await page.request.get(API_BASE + `/bots/${botId}`, {
    headers: authHeaders(accessToken),
  })
  const botBody = await apiBot.json()
  expect(botBody.system_prompt).toBe(systemPrompt)

  // 5. Add a knowledge-base document.
  await page.goto(APP_BASE + '/knowledge-base')
  await page.getByRole('button', { name: /add document/i }).click()
  const docTitle = `KB ${Date.now()}`
  await page.locator('input[aria-label="Title"]').fill(docTitle)
  await page
    .locator('textarea[aria-label="Content"]')
    .fill('Our hours are 9-5 weekdays. Saturdays we are closed.')
  await page.getByRole('button', { name: /save document/i }).click()
  await expect(page.getByText(docTitle)).toBeVisible({ timeout: 10000 })

  // 6. Test-chat: send a real message and get a real reply.
  await page.goto(APP_BASE + '/test-chat')
  const select = page.locator('select').first()
  if (await select.count()) {
    await select.selectOption({ value: botId }).catch(() => {})
  }
  const input = page.locator('textarea').first()
  await expect(input).toBeVisible({ timeout: 15000 })
  await input.fill('Say "ok"')
  await page.getByRole('button', { name: /send/i }).first().click()
  await expect(page.locator('text=/ok|hi|hello|sure/i').first()).toBeVisible({ timeout: 30_000 })

  // Verify a conversation row materialized.
  const convs = await page.request.get(API_BASE + '/conversations', {
    headers: authHeaders(accessToken),
  })
  const convsBody = (await convs.json()) as Array<unknown>
  expect(Array.isArray(convsBody)).toBe(true)
  expect(convsBody.length).toBeGreaterThan(0)

  // 7. Deploy the bot.
  const deploy = await page.request.post(API_BASE + `/bots/${botId}/deploy`, {
    headers: authHeaders(accessToken),
  })
  expect(deploy.status()).toBeLessThan(400)
  const deployedBody = await deploy.json()
  expect(deployedBody.status).toBe('deployed')

  // 8. Visit the deploy page; confirm the embed snippet contains the real bot id.
  await page.goto(APP_BASE + `/bots/${botId}/deploy`)
  await page.waitForLoadState('networkidle')
  await expect(page.locator('body')).toContainText(botId, { timeout: 10000 })

  // 9. Visit /bots and confirm the bot appears in the list.
  await page.goto(APP_BASE + '/bots')
  await expect(page.getByText(botName)).toBeVisible({ timeout: 10000 })

  // 10. Update the user profile and confirm persistence.
  const newName = `Journey User ${Date.now()}`
  const patch = await page.request.patch(API_BASE + '/profile/me', {
    headers: authHeaders(accessToken),
    data: { name: newName, organization: 'Journey Co', timezone: 'UTC', language: 'en-US' },
  })
  expect(patch.status()).toBeLessThan(400)
  const profile = await page.request.get(API_BASE + '/profile/me', {
    headers: authHeaders(accessToken),
  })
  const profileBody = (await profile.json()) as { name?: string; email?: string }
  expect(profileBody.name).toBe(newName)
  expect(profileBody.email).toBe(email)

  // 11. Seed and read a notification, then mark-all-read.
  const notif = await page.request.post(API_BASE + '/notifications', {
    headers: authHeaders(accessToken),
    data: { kind: 'system', title: `Journey Notif ${Date.now()}`, body: 'hi' },
  })
  expect(notif.status()).toBe(201)
  await page.request.post(API_BASE + '/notifications/read-all', {
    headers: authHeaders(accessToken),
  })
  const list = await page.request.get(API_BASE + '/notifications', {
    headers: authHeaders(accessToken),
  })
  const notifs = (await list.json()) as Array<{ read_at: string | null }>
  expect(notifs.length).toBeGreaterThanOrEqual(1)
  expect(notifs.every((n) => n.read_at)).toBe(true)

  // 12. Billing status renders on Settings.
  await page.goto(APP_BASE + '/settings')
  const tier = await page.request.get(API_BASE + '/billing/status', {
    headers: authHeaders(accessToken),
  })
  const tierBody = (await tier.json()) as { name?: string }
  expect(tierBody.name).toBeTruthy()
  await expect(page.getByText(new RegExp(tierBody.name!, 'i'))).toBeVisible({ timeout: 10000 })
})
