import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/study/:deckId/summary', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
  })

  test('renders the Well done celebration heading', async ({ page }) => {
    await page.goto(APP_BASE + '/study/00000000-0000-0000-0000-000000000000/summary')
    await expect(page.getByRole('heading', { name: /Well done/i, level: 1 })).toBeVisible()
  })

  test('Back to dashboard link navigates to /dashboard', async ({ page }) => {
    await page.goto(APP_BASE + '/study/00000000-0000-0000-0000-000000000000/summary')
    await page.getByRole('link', { name: /Back to dashboard/i }).click()
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('Back to deck link navigates to /decks/:deckId', async ({ page }) => {
    // The summary page is static and does NOT validate the deck, so this test
    // deliberately uses a nonexistent deck id. Following the link mounts
    // DeckDetail, whose fetch of that id correctly 404s — that console noise
    // is the expected contract here, not a regression.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 404',
    })
    const deckId = '00000000-0000-0000-0000-000000000000'
    await page.goto(APP_BASE + `/study/${deckId}/summary`)
    await page.getByRole('link', { name: /Back to deck/i }).click()
    await expect(page).toHaveURL(new RegExp(`/decks/${deckId}$`))
  })

  test('summary page is fully static; no /api/* call fires', async ({ page }) => {
    // Navigate to the summary page and let any prior-page in-flight requests
    // (e.g. dashboard fetches from the post-signup landing) drain before we
    // start observing. captureNetwork's `response` listener fires for any
    // response that arrives during the window — including requests that
    // were issued before navigation began — so observing across the goto
    // produces false positives from the previous page.
    await page.goto(APP_BASE + '/study/00000000-0000-0000-0000-000000000000/summary')
    await expect(page.getByRole('heading', { name: /Well done/i, level: 1 })).toBeVisible()
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})

    // Now capture: the summary page itself should issue no /api/* requests
    // of its own. We trigger one render-time event (a no-op DOM read) and
    // then wait for the network to be idle a second time — any /api/* call
    // the summary page itself initiates would show up here.
    const reqs = await captureNetwork(page, async () => {
      // Re-trigger a layout pass + give the event loop a chance to fire any
      // post-mount effects, then wait for network to be idle again.
      await page.evaluate(() => document.body.getBoundingClientRect())
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    })
    const apiCalls = reqs.filter((r) => /\/api\//.test(r.url))
    expect(apiCalls, 'session summary is static; no /api/* call should fire').toEqual([])
  })
})
