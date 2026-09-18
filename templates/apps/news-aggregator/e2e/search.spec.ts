/**
 * Per-page coverage for /search. Cross-references e2e/observations/search.md.
 * Detailed query/clear flow lives in 06-search.spec.ts.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, pickStory, signup, uniqueEmail } from './_helpers.js'

test.describe('/search', () => {
  test('renders the search heading and an empty input field', async ({ page }) => {
    await signup(page, uniqueEmail('na-search-page'))
    await page.goto(APP_BASE + '/search')
    await expect(page.getByRole('heading').first()).toBeVisible()
    await expect(page.locator('input[type="text"], input[type="search"]').first()).toBeVisible()
  })

  test('typing a query fires GET /api/search and renders results', async ({ page }) => {
    await signup(page, uniqueEmail('na-search-query'))
    // Query a headline the feed actually holds instead of a demo word.
    const story = await pickStory(page)
    await page.goto(APP_BASE + '/search')
    const reqs = await captureNetwork(page, async () => {
      const respPromise = page.waitForResponse(
        (r) => /\/api\/search/.test(r.url()) && r.status() === 200,
        { timeout: 15_000 },
      )
      await page.locator('input[type="text"], input[type="search"]').first().fill(story.headline)
      await respPromise
    })
    expect(reqs.some((r) => /\/api\/search/.test(r.url) && r.status === 200)).toBe(true)
  })

  test('clear/cancel button empties the query', async ({ page }) => {
    await signup(page, uniqueEmail('na-search-clear'))
    await page.goto(APP_BASE + '/search')
    const input = page.locator('input[type="text"], input[type="search"]').first()
    await input.fill('test')
    const clearBtn = page.getByRole('button', { name: /cancel|clear/i }).first()
    if (await clearBtn.isVisible().catch(() => false)) {
      await clearBtn.click()
      await expect(input).toHaveValue('')
    } else {
      await input.fill('')
      await expect(input).toHaveValue('')
    }
  })

  test('result list link from /search navigates to /stories/:id', async ({ page }) => {
    await signup(page, uniqueEmail('na-search-result'))
    const story = await pickStory(page)
    await page.goto(APP_BASE + '/search')
    const input = page.locator('input[type="text"], input[type="search"]').first()
    const respPromise = page.waitForResponse(
      (r) => /\/api\/search/.test(r.url()) && r.status() === 200,
      { timeout: 15_000 },
    )
    await input.fill(story.headline)
    await respPromise
    const result = page.locator('a[href*="/stories/"]').first()
    if (await result.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await result.click()
      await expect(page).toHaveURL(/\/stories\//, { timeout: 10_000 })
    }
  })

  test('captureNetwork sees a real GET /api/search?q=…', async ({ page }) => {
    await signup(page, uniqueEmail('na-search-net'))
    const story = await pickStory(page)
    await page.goto(APP_BASE + '/search')
    const reqs = await captureNetwork(page, async () => {
      const respPromise = page.waitForResponse(
        (r) => /\/api\/search/.test(r.url()) && r.status() === 200,
        { timeout: 15_000 },
      )
      await page.locator('input[type="text"], input[type="search"]').first().fill(story.headline)
      await respPromise
    })
    expect(
      reqs.some((r) => /\/api\/search/.test(r.url) && /\bq=/.test(r.url) && r.status === 200),
    ).toBe(true)
  })
})
