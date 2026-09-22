import { expect, test, type Page } from '@molecule/app-e2e-fixtures-default'

import {
  type AuthedFetchInit,
  getAccessTokenFromPage,
  gotoAwaitResponse,
  signup,
  uniqueEmail,
} from './_helpers.js'

async function authedFetch<T>(page: Page, url: string, init: AuthedFetchInit = {}): Promise<T> {
  const token = await getAccessTokenFromPage(page)
  return page.evaluate(
    async (args) => {
      const headers = { ...(args.init.headers || {}), Authorization: `Bearer ${args.token}` }
      const resp = await fetch(args.url, { ...args.init, headers })
      return (await resp.json()) as unknown
    },
    { url, init, token },
  ) as Promise<T>
}

test.describe('saved page', () => {
  test('a fresh user sees the empty state, NOT placeholder stories', async ({ page }) => {
    await signup(page, uniqueEmail('na-saved-empty'))
    await gotoAwaitResponse(
      page,
      '/saved',
      (r) => r.url().endsWith('/api/bookmarks') && r.status() === 200,
    )

    // The empty-state copy must appear — fresh user has 0 bookmarks.
    await expect(page.getByText(/Nothing saved yet|No saved/i).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('saving a story appears on the Saved page after navigation', async ({ page }) => {
    await signup(page, uniqueEmail('na-saved-navigate'))

    // Bookmark via API. Stories are fetched through the vite proxy so we
    // don't need to know the API port directly. authedFetch attaches the
    // signup JWT.
    const stories = await authedFetch<Array<{ id: string; headline: string }>>(page, '/api/stories')
    expect(stories.length).toBeGreaterThan(0)
    const target = stories[0]!

    await authedFetch<unknown>(page, '/api/bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ article_id: target.id }),
    })

    await gotoAwaitResponse(
      page,
      '/saved',
      (r) => r.url().endsWith('/api/bookmarks') && r.status() === 200,
    )
    // Headline text from the bookmarked story is visible — no SAMPLE leak.
    await expect(page.getByText(target.headline.slice(0, 30)).first()).toBeVisible({
      timeout: 10_000,
    })
  })
})
