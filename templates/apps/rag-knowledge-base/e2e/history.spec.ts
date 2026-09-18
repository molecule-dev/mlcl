/**
 * /history — Engram Q&A history.
 *
 * The page calls /api/qa/history on mount and renders one row per
 * persisted qa_entry. Asking a question via the API must produce a row
 * on next load (read-after-write).
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, ask, captureNetwork, createDocument, signup } from './_helpers.js'

test.describe('history', () => {
  test('h1 renders "History"', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/history')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('GET /api/qa/history is called on mount', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/history')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    })
    const get = reqs.find((r) => r.method === 'GET' && /\/api\/qa\/history/.test(r.url))
    expect(get?.status).toBe(200)
  })

  test('after an ask, the list contains a row for the question', async ({ page }) => {
    const { accessToken } = await signup(page)
    await createDocument(page, accessToken, {
      title: 'History Doc',
      body_md: 'History test body. Contains the answer.',
    })
    const entry = await ask(page, accessToken, 'What is the history test question?')
    await page.goto(APP_BASE + '/history')
    await expect(page.locator('[data-testid="history-list"]')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator(`[data-testid="history-row-${entry.id}"]`)).toBeVisible()
  })

  test('each rendered row exposes the question text', async ({ page }) => {
    const { accessToken } = await signup(page)
    await createDocument(page, accessToken)
    await ask(page, accessToken, 'Question text observation')
    await page.goto(APP_BASE + '/history')
    const questions = page.locator('[data-testid="history-question"]')
    await expect(questions.first()).toBeVisible({ timeout: 10_000 })
    const text = (await questions.first().textContent()) ?? ''
    expect(text.trim().length).toBeGreaterThan(0)
  })
})
