import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

/** A past UTC day key — always older than today, never in the future. */
function pastDay(): string {
  const d = new Date(Date.now() - 86_400_000)
  return d.toISOString().slice(0, 10)
}

test.describe('/archive/:date (practice play)', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
    await page.goto(`${APP_BASE}/archive/${pastDay()}`)
  })

  test('loads the day’s state via GET /api/puzzles/:date', async ({ page }) => {
    const respPromise = page.waitForResponse((r) =>
      /\/api\/puzzles\/\d{4}-\d{2}-\d{2}$/.test(r.url()),
    )
    await page.goto(`${APP_BASE}/archive/${pastDay()}`)
    const resp = await respPromise
    expect(resp.status()).toBeLessThan(400)
    await expect(page.locator('[data-mol-id="board-active-row"]')).toBeVisible()
  })

  test('marks the game as practice', async ({ page }) => {
    await page.locator('[data-mol-id="practice-badge"]').waitFor()
    await expect(page.locator('[data-mol-id="practice-badge"]')).toContainText(/practice/i)
  })

  test('guessing on a past day still returns feedback', async ({ page }) => {
    await page.locator('[data-mol-id="board-active-row"]').waitFor()
    await page.keyboard.type('stone', { delay: 20 })
    const guessResp = page.waitForResponse(
      (r) => /\/guess$/.test(r.url()) && r.request().method() === 'POST',
    )
    await page.keyboard.press('Enter')
    const resp = await guessResp
    expect(resp.status()).toBe(201)
  })
})
