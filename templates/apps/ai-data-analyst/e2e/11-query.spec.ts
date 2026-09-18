import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup } from './_helpers'

// /query — natural-language query: POST /api/queries returns chart +
// SQL + insight. Result hero + data table + SQL pane render.

test.describe('/query', () => {
  test('asking a question POSTs /api/queries and renders chart + SQL', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/query')
    const reqs = await captureNetwork(page, async () => {
      // AskClarionBar exposes its textbox + submit button
      const input = page.locator('input[type="text"], textarea').first()
      await input.fill('Show top customers by revenue this quarter')
      // Pre-register the response listener so a fast POST can't race past
      // before waitForResponse is hooked up.
      const respPromise = page.waitForResponse(
        (r) => /\/api\/queries/.test(r.url()) && r.request().method() === 'POST',
        { timeout: 15_000 },
      )
      await page
        .getByRole('button', { name: /^ask|submit|run|send/i })
        .first()
        .click()
      await respPromise
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/queries/.test(r.url))
    expect(post, 'POST /api/queries should fire').toBeDefined()
    expect(post!.status).toBe(200)
    // SQL pane (pre + font-mono) rendered
    await expect(page.locator('pre').first()).toBeVisible()
  })

  test('input field accepts typed input', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/query')
    const input = page.locator('input[type="text"]').first()
    await input.fill('what is the average revenue per user?')
    await expect(input).toHaveValue('what is the average revenue per user?')
  })

  test('clicking a suggestion chip submits the prompt', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/query')
    const reqs = await captureNetwork(page, async () => {
      const chip = page
        .getByRole('button')
        .filter({ hasText: /top accounts|month-over-month|anomalies|correlation/i })
        .first()
      const respPromise = page.waitForResponse(
        (r) => /\/api\/queries/.test(r.url()) && r.request().method() === 'POST',
        { timeout: 15_000 },
      )
      await chip.click()
      await respPromise
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/queries/.test(r.url))
    expect(post).toBeDefined()
    expect(post!.status).toBe(200)
  })
})
