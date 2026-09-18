/**
 * /channels/:id — channel renders, messages persist, send button does
 * not double-fire, and the channel feed shows the real sender's name.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  apiSignupAndPrime,
  authHeaders,
  seedChannel,
  uniqueEmail,
} from './_helpers.js'

test.describe('channel page', () => {
  test('renders channel header + empty-state when no messages exist', async ({ page }) => {
    const { accessToken } = await apiSignupAndPrime(page, uniqueEmail('ch-empty'))
    const ch = await seedChannel(page, accessToken, { name: 'qa-empty' })
    await page.goto(APP_BASE + `/channels/${ch.id}`)
    await expect(page.locator('[data-mol-id="page-channel"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="message-feed"]')).toContainText(
      /Welcome to|first message/i,
    )
  })

  test('sending a message persists exactly once (no double-fire on submit)', async ({ page }) => {
    const { accessToken } = await apiSignupAndPrime(page, uniqueEmail('ch-send'))
    const ch = await seedChannel(page, accessToken, { name: 'qa-send' })
    await page.goto(APP_BASE + `/channels/${ch.id}`)
    const ta = page.locator('[data-mol-id="input-message"]')
    await ta.fill('hello world from spec')
    await page.locator('[data-mol-id="button-send"]').click()
    await page.waitForTimeout(800)
    const list = await page.request.get(`${API_BASE}/messages?channel_id=${ch.id}`, {
      headers: authHeaders(accessToken),
    })
    const messages = (await list.json()) as { content: string }[]
    expect(messages.filter((m) => m.content === 'hello world from spec')).toHaveLength(1)
  })

  test('messages render with the actual sender name (not "Unknown")', async ({ page }) => {
    const { accessToken, name } = await apiSignupAndPrime(
      page,
      uniqueEmail('ch-author'),
      'TestPass123!',
      'Author Persona',
    )
    const ch = await seedChannel(page, accessToken, { name: 'qa-author' })
    await page.request.post(`${API_BASE}/messages`, {
      headers: authHeaders(accessToken),
      data: { channel_id: ch.id, content: 'a message from author persona' },
    })
    await page.goto(APP_BASE + `/channels/${ch.id}`)
    await expect(page.locator('[data-mol-id="message-feed"]')).toContainText(name)
    await expect(page.locator('[data-mol-id="message-feed"]')).not.toContainText('Unknown')
  })

  test('clicking a sidebar channel navigates to /channels/:id', async ({ page }) => {
    const { accessToken } = await apiSignupAndPrime(page, uniqueEmail('ch-nav'))
    const ch = await seedChannel(page, accessToken, { name: 'qa-nav' })
    await page.goto(APP_BASE + '/')
    await page.locator(`[data-mol-id="side-nav-channel-${ch.id}"]`).click()
    await expect(page).toHaveURL(new RegExp(`/channels/${ch.id}`))
  })

  test('search input filters the message feed in-page', async ({ page }) => {
    const { accessToken } = await apiSignupAndPrime(page, uniqueEmail('ch-search'))
    const ch = await seedChannel(page, accessToken, { name: 'qa-search' })
    await page.request.post(`${API_BASE}/messages`, {
      headers: authHeaders(accessToken),
      data: { channel_id: ch.id, content: 'apple goes first' },
    })
    await page.request.post(`${API_BASE}/messages`, {
      headers: authHeaders(accessToken),
      data: { channel_id: ch.id, content: 'banana goes second' },
    })
    await page.goto(APP_BASE + `/channels/${ch.id}`)
    await page.locator('[data-mol-id="input-search-messages"]').fill('apple')
    const feed = page.locator('[data-mol-id="message-feed"]')
    await expect(feed).toContainText('apple')
    await expect(feed).not.toContainText('banana goes second')
  })

  test('toggle-theme button persists "dark" via localStorage[molecule-theme]', async ({ page }) => {
    const { accessToken } = await apiSignupAndPrime(page, uniqueEmail('ch-theme'))
    const ch = await seedChannel(page, accessToken, { name: 'qa-real-channel' })
    await page.goto(APP_BASE + `/channels/${ch.id}`)
    await page.locator('[data-mol-id="button-toggle-theme"]').click()
    await expect
      .poll(async () => await page.evaluate(() => window.localStorage.getItem('molecule-theme')))
      .toBe('dark')
  })

  test('formatting toolbar wraps selected text in markdown (bold/italic/code)', async ({
    page,
  }) => {
    const { accessToken } = await apiSignupAndPrime(page, uniqueEmail('ch-toolbar'))
    const ch = await seedChannel(page, accessToken, { name: 'qa-toolbar' })
    await page.goto(APP_BASE + `/channels/${ch.id}`)
    const ta = page.locator('[data-mol-id="input-message"]')
    await ta.fill('hello')
    await ta.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(0, 5))
    await page.locator('[data-mol-id="toolbar-bold"]').click()
    await expect(ta).toHaveValue('**hello**')
    await ta.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(2, 7))
    await page.locator('[data-mol-id="toolbar-italic"]').click()
    await expect(ta).toHaveValue('**_hello_**')
  })

  test('formatting toolbar buttons do not submit the form', async ({ page }) => {
    const { accessToken } = await apiSignupAndPrime(page, uniqueEmail('ch-toolbar-no-submit'))
    const ch = await seedChannel(page, accessToken, { name: 'qa-toolbar-nosubmit' })
    await page.goto(APP_BASE + `/channels/${ch.id}`)
    const ta = page.locator('[data-mol-id="input-message"]')
    await ta.fill('do not send me')
    await ta.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(0, 14))
    await page.locator('[data-mol-id="toolbar-bold"]').click()
    await page.waitForTimeout(400)
    const list = await page.request.get(`${API_BASE}/messages?channel_id=${ch.id}`, {
      headers: authHeaders(accessToken),
    })
    const messages = (await list.json()) as { content: string }[]
    // The toolbar button must NOT have submitted the form. The textarea should
    // still hold its content with markdown wrapping, and no message should
    // have been persisted.
    expect(messages.filter((m) => m.content.includes('do not send me'))).toHaveLength(0)
    await expect(ta).toHaveValue('**do not send me**')
  })

  test('pinned messages panel only shows pinned messages (not every message)', async ({ page }) => {
    const { accessToken } = await apiSignupAndPrime(page, uniqueEmail('ch-pinned'))
    const ch = await seedChannel(page, accessToken, { name: 'qa-pinned' })
    const m1 = await page.request.post(`${API_BASE}/messages`, {
      headers: authHeaders(accessToken),
      data: { channel_id: ch.id, content: 'this is unpinned' },
    })
    const m2 = await page.request.post(`${API_BASE}/messages`, {
      headers: authHeaders(accessToken),
      data: { channel_id: ch.id, content: 'pin me please' },
    })
    const pinTarget = (await m2.json()) as { id: string }
    await page.request.post(`${API_BASE}/messages/${pinTarget.id}/pin`, {
      headers: authHeaders(accessToken),
      data: { user_id: 'spec' },
    })
    const res = await page.request.get(`${API_BASE}/messages?channel_id=${ch.id}&pinned=true`, {
      headers: authHeaders(accessToken),
    })
    const pinned = (await res.json()) as { id: string; content: string }[]
    expect(pinned).toHaveLength(1)
    expect(pinned[0].content).toBe('pin me please')
  })
})
