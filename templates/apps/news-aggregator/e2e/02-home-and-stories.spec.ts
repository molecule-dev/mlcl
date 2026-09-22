import { expect, test, type Page } from '@molecule/app-e2e-fixtures-default'

import {
  type AuthedFetchInit,
  getAccessTokenFromPage,
  gotoAwaitResponse,
  pickStory,
  pickTopic,
  pickTwoTopics,
  signup,
  uniqueEmail,
} from './_helpers.js'

/** Authenticated browser-side fetch using the JWT stored by @molecule/app-auth. */
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

test.describe('home + stories', () => {
  test('home renders top story headline + topic chips from real API', async ({ page }) => {
    await signup(page, uniqueEmail('na-home'))

    // The chips and headline under test are read from the same endpoints the
    // page reads — naming a seeded topic or headline breaks the spec the
    // moment the demo feed is replaced.
    const { target, other } = await pickTwoTopics(page)
    const story = await pickStory(page)

    // Topic chips and a real story headline must render — fed by the API.
    await expect(page.getByRole('link', { name: target.label }).first()).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByRole('link', { name: other.label }).first()).toBeVisible()

    // The hero/feed has at least one story headline from the live feed.
    await expect(page.getByText(story.headline).first()).toBeVisible({ timeout: 10_000 })

    // No "Loading" or empty state should remain.
    await expect(page.locator('h2').first()).toBeVisible()
  })

  test('clicking a topic chip navigates to /topics/:slug and renders coverage', async ({
    page,
  }) => {
    await signup(page, uniqueEmail('na-topic-click'))
    const topic = await pickTopic(page)
    await expect(page.getByRole('link', { name: topic.label }).first()).toBeVisible({
      timeout: 15_000,
    })

    await page.getByRole('link', { name: topic.label }).first().click()
    await expect(page).toHaveURL(new RegExp(`/topics/${topic.slug}`))

    // The Follow button on the topic header must be present.
    await expect(page.getByRole('button', { name: /^Follow$|^Following$/ }).first()).toBeVisible({
      timeout: 15_000,
    })
  })

  test('story detail loads coverage and Save toggles persist to /api/bookmarks', async ({
    page,
  }) => {
    await signup(page, uniqueEmail('na-story-save'))
    // List stories from API to grab a real id (via vite proxy on the
    // app dev server so we don't need to know the API port directly).
    const stories = await authedFetch<Array<{ id: string }>>(page, '/api/stories')
    expect(stories.length).toBeGreaterThan(0)
    const storyId = stories[0]!.id

    await gotoAwaitResponse(
      page,
      '/stories/' + storyId,
      (r) => r.url().includes(`/api/stories/${storyId}`) && r.status() === 200,
    )

    // Save the story.
    const saveBtn = page.getByRole('button', { name: /^Save$|^Saved$/ }).first()
    await expect(saveBtn).toBeVisible()
    const before = await saveBtn.getAttribute('aria-pressed')

    const [bookmarkPost] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().endsWith('/api/bookmarks') && r.request().method() === 'POST',
      ),
      saveBtn.click(),
    ])
    expect(bookmarkPost.status()).toBe(201)
    await expect(saveBtn).toHaveAttribute('aria-pressed', 'true')

    // Read-after-write: GET /api/bookmarks must return this story id.
    const ts = await authedFetch<Array<{ id?: string; story_id?: string; storyId?: string }>>(
      page,
      '/api/bookmarks',
    )
    expect(
      ts.some((b) => b.id === storyId || b.story_id === storyId || b.storyId === storyId),
    ).toBe(true)

    // Reload preserves saved state from the server (saved=true comes from API).
    await gotoAwaitResponse(
      page,
      '/stories/' + storyId,
      (r) => r.url().includes(`/api/stories/${storyId}`) && r.status() === 200,
    )
    const reloadBtn = page.getByRole('button', { name: /^Save$|^Saved$/ }).first()
    await expect(reloadBtn).toHaveAttribute('aria-pressed', 'true')

    // Unsave — read-after-write: GET /api/bookmarks must NOT contain it.
    const [bookmarkDelete] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes(`/api/bookmarks/by-story/${storyId}`) &&
          r.request().method() === 'DELETE',
      ),
      reloadBtn.click(),
    ])
    expect([200, 204]).toContain(bookmarkDelete.status())

    const ts2 = await authedFetch<Array<{ id?: string; story_id?: string; storyId?: string }>>(
      page,
      '/api/bookmarks',
    )
    expect(
      ts2.some((b) => b.id === storyId || b.story_id === storyId || b.storyId === storyId),
    ).toBe(false)
    expect(before).toBe('false')
  })
})
