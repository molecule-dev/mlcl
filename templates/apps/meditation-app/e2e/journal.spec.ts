/**
 * /journal — reflections. Asserts empty-state, compose-and-save round-trip
 * (POST /api/journal then read-after-write), and list refresh.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, apiHeaders, captureNetwork, signup } from './_helpers.js'

test.describe('journal (/journal)', () => {
  test('shows the journal empty state for a fresh account', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/journal')
    await expect(page.getByTestId('journal-empty')).toBeVisible({ timeout: 10000 })
  })

  test('compose form (textarea + mood + save) is rendered', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/journal')
    await expect(page.getByTestId('journal-textarea')).toBeVisible()
    await expect(page.getByTestId('journal-mood-5')).toBeVisible()
    await expect(page.getByTestId('journal-save')).toBeVisible()
  })

  test('saving a reflection POSTs /api/journal and the entry shows in the list', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/journal')

    const body = `Spec reflection ${Date.now()}`
    const reqs = await captureNetwork(page, async () => {
      await page.getByTestId('journal-textarea').fill(body)
      await page.getByTestId('journal-mood-5').click()
      await page.getByTestId('journal-save').click()
      // Scope the read-after-write assertion to the LIST. An unscoped
      // page.getByText(body) also matches the <textarea> we just filled —
      // Playwright's text engine reads a textarea's value — so it was already
      // satisfied the moment fill() returned, before save was even clicked.
      // captureNetwork then closed while POST /api/journal was still in flight,
      // making the `posts.length > 0` check below a race (observed flake), and
      // the assertion would have passed even if saving were a complete no-op.
      // Waiting on the list entry proves the POST landed AND the refetch
      // rendered it — strictly stronger, and deterministic.
      await expect(page.getByTestId('journal-list').getByText(body)).toBeVisible({
        timeout: 10000,
      })
    })

    const posts = reqs.filter(
      (r) => r.method === 'POST' && r.url.includes('/api/journal') && r.status < 400,
    )
    expect(
      posts.length,
      JSON.stringify(reqs.map((r) => `${r.method} ${r.url} ${r.status}`)),
    ).toBeGreaterThan(0)

    const r = await page.request.get(`${API_BASE}/journal`, { headers: apiHeaders(accessToken) })
    expect(r.status()).toBe(200)
    const rows = (await r.json()) as Array<{ body: string; mood: number }>
    expect(rows.some((row) => row.body === body && row.mood === 5)).toBe(true)
  })
})
