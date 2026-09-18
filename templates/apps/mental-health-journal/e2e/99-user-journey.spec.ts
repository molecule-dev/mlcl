import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, signup, captureNetwork } from './_helpers'

test.describe('User journey — full mental-health-journal flow', () => {
  test('signup → home → create entry → list/calendar/profile/insights → settings persist', async ({
    page,
  }) => {
    test.setTimeout(120_000)

    // Sign up — drops us into /home
    const creds = await signup(page)
    await expect(page).toHaveURL(/\/home/)

    // /home renders empty-state hero (no entries yet)
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()

    // Navigate to /journal/new and create an entry via UI
    await page.goto(APP_BASE + '/journal/new')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Pick a mood — Good
    await page.getByRole('button', { name: /^Good$/i }).click()
    await page.getByPlaceholder(/Give this reflection a name/i).fill('Journey title ' + Date.now())
    await page
      .getByPlaceholder(/Write whatever feels honest/i)
      .fill(
        'A meaningful reflection about how grateful I feel today, with sufficient body text to look real.',
      )

    // Save — set up waitForResponse BEFORE click to avoid the race where
    // a fast POST + post-save navigation completes before the listener attaches.
    const reqs = await captureNetwork(page, async () => {
      const postWait = page.waitForResponse(
        (r) => r.url().includes('/api/journal/entries') && r.request().method() === 'POST',
        { timeout: 15_000 },
      )
      await page.getByRole('button', { name: /Save reflection/i }).click()
      await postWait
    })
    const post = reqs.find((r) => r.method === 'POST' && r.url.includes('/api/journal/entries'))
    expect(post, 'POST /api/journal/entries fired').toBeDefined()
    expect(post!.status, 'entry created (2xx)').toBeLessThan(300)

    // Read-after-write: GET /journal/entries via API confirms the new entry exists
    const loginRes = await fetch(API_BASE + '/users/log-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: creds.email, password: creds.password }),
    })
    const { accessToken } = (await loginRes.json()) as { accessToken: string }
    const listRes = await fetch(API_BASE + '/journal/entries', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    expect(listRes.status).toBe(200)
    const list = (await listRes.json()) as
      | Array<{ title: string }>
      | { items?: Array<{ title: string }>; data?: Array<{ title: string }> }
    const items = Array.isArray(list) ? list : (list.items ?? list.data ?? [])
    expect(items.length, 'entry persisted in DB').toBeGreaterThanOrEqual(1)

    // Walk the rest of the app
    await page.goto(APP_BASE + '/journal')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText(/Journey title/).first()).toBeVisible({ timeout: 10_000 })

    await page.goto(APP_BASE + '/calendar')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    await page.goto(APP_BASE + '/insights')
    await expect(page.getByRole('heading', { level: 1, name: /^Insights$/i })).toBeVisible()

    await page.goto(APP_BASE + '/profile')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    await page.goto(APP_BASE + '/prompts')
    await expect(page.getByRole('heading', { level: 1, name: /Prompt library/i })).toBeVisible()

    // Settings: flip theme to dark and verify persistence via direct API
    await page.goto(APP_BASE + '/settings')
    await page.waitForResponse((r) => r.url().includes('/api/journal/preferences'), {
      timeout: 15_000,
    })
    const themeDark = page.getByTestId('theme-dark')
    await expect(themeDark).toBeEnabled({ timeout: 10_000 })
    const putWait = page.waitForResponse(
      (r) => r.url().includes('/api/journal/preferences') && r.request().method() === 'PUT',
      { timeout: 15_000 },
    )
    await themeDark.click()
    await putWait
    const prefsRes = await fetch(API_BASE + '/journal/preferences', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const prefs = (await prefsRes.json()) as { theme: string }
    expect(prefs.theme, 'theme persisted as dark').toBe('dark')

    // Reload — entry still in journal
    await page.goto(APP_BASE + '/journal')
    await expect(page.getByText(/Journey title/).first()).toBeVisible({ timeout: 10_000 })
  })
})
