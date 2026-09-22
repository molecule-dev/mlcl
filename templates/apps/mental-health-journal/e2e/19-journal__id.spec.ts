import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, captureNetwork, createEntryViaApi, signup } from './_helpers'

async function signupAndCreateEntry(page: import('@playwright/test').Page) {
  const creds = await signup(page)
  // Get token via login (cookie-set on signup may not be visible in fetch).
  const loginRes = await fetch(API_BASE + '/users/log-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: creds.email, password: creds.password }),
  })
  const { accessToken } = (await loginRes.json()) as { accessToken: string }
  const entry = await createEntryViaApi(accessToken, {
    mood: 'good',
    title: `Detail test ${Date.now()}`,
    body: 'Detail body content for entry detail page test.',
    tags: ['gratitude', 'morning'],
  })
  return { creds, accessToken, entry }
}

test.describe('/journal/:id', () => {
  test('"Back to journal" link points to /journal', async ({ page }) => {
    const { entry } = await signupAndCreateEntry(page)
    await page.goto(APP_BASE + '/journal/' + entry.id)
    const link = page.getByRole('link', { name: /Back to journal/i })
    expect(await link.getAttribute('href')).toBe('/journal')
  })

  test('renders entry title from API (not demo)', async ({ page }) => {
    const { entry } = await signupAndCreateEntry(page)
    await page.goto(APP_BASE + '/journal/' + entry.id)
    await expect(page.getByRole('heading', { level: 1, name: entry.title })).toBeVisible({
      timeout: 10_000,
    })
    // demo titles must not appear
    await expect(page.getByText(/A quiet morning walk/)).toHaveCount(0)
  })

  test('shows "End-to-end encrypted" badge', async ({ page }) => {
    const { entry } = await signupAndCreateEntry(page)
    await page.goto(APP_BASE + '/journal/' + entry.id)
    await expect(page.getByText(/End-to-end encrypted/i)).toBeVisible()
  })

  test('shows word count from entry', async ({ page }) => {
    const { entry } = await signupAndCreateEntry(page)
    await page.goto(APP_BASE + '/journal/' + entry.id)
    await expect(page.getByText(/\d+ words/i)).toBeVisible()
  })

  test('shows tag chips that match the created tags', async ({ page }) => {
    const { entry } = await signupAndCreateEntry(page)
    await page.goto(APP_BASE + '/journal/' + entry.id)
    // We created tags: ['gratitude', 'morning'] — at least one chip should be visible.
    await expect(page.getByText(/#gratitude|#morning/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('GET /api/journal/entries/:id is called on page load', async ({ page }) => {
    const { entry } = await signupAndCreateEntry(page)
    // Arm BEFORE goto: the mount fetch can resolve before the window load
    // event, so a post-goto listener misses it and times out.
    const entryWait = page.waitForResponse(
      (r) => r.url().includes('/api/journal/entries/' + entry.id),
      { timeout: 15_000 },
    )
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/journal/' + entry.id)
      await entryWait
    })
    const get = reqs.find(
      (r) => r.method === 'GET' && r.url.includes('/api/journal/entries/' + entry.id),
    )
    expect(get).toBeDefined()
    expect(get!.status).toBeLessThan(300)
  })
})
