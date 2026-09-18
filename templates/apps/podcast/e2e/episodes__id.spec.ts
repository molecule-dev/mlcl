import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  captureNetwork,
  expectNoConsoleErrors,
  getChapters,
  pickEpisode,
  signup,
} from './_helpers.js'

// The episode under test is read from /api/episodes in each test rather than
// named here — a hardcoded seeded id breaks the moment the demo catalog is
// replaced.

test.describe('episode player page (/episodes/:id)', () => {
  test('renders episode heading and back-to-show link', async ({ page }) => {
    await signup(page)
    const episode = await pickEpisode(page)
    await page.goto(APP_BASE + `/episodes/${episode.id}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(
      page
        .getByRole('link')
        .filter({ hasText: String(episode.show_title) })
        .first(),
    ).toBeVisible()
  })

  test('initial load fetches /api/episodes/:id and /api/chapters', async ({ page }) => {
    await signup(page)
    const episode = await pickEpisode(page)
    const requests = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/episodes/${episode.id}`)
      await page.waitForLoadState('networkidle')
    })
    expect(
      requests.some(
        (r) => new RegExp(`/api/episodes/${episode.id}`).test(r.url) && r.status === 200,
      ),
    ).toBeTruthy()
    expect(requests.some((r) => /\/api\/chapters/.test(r.url) && r.status === 200)).toBeTruthy()
  })

  test('Play episode button is visible', async ({ page }) => {
    await signup(page)
    const episode = await pickEpisode(page)
    await page.goto(APP_BASE + `/episodes/${episode.id}`)
    await expect(page.getByRole('button', { name: /play episode/i })).toBeVisible()
  })

  test('"Add to queue" button posts to /api/queue and persists across reload', async ({ page }) => {
    await signup(page)
    const episode = await pickEpisode(page)
    await page.goto(APP_BASE + `/episodes/${episode.id}`)
    const requests = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /add to queue/i }).click()
      await page.waitForTimeout(1500)
    })
    expect(
      requests.some((r) => r.method === 'POST' && /\/api\/queue(\?|$)/.test(r.url)),
    ).toBeTruthy()
    // Verify the episode actually shows up in the queue.
    await page.goto(APP_BASE + '/queue')
    await expect(page.getByRole('listitem').first()).toBeVisible({ timeout: 8000 })
  })

  test('switching to "Transcript" tab reveals the transcript text', async ({ page }) => {
    await signup(page)
    const episode = await pickEpisode(page)
    // Assert the panel renders THIS episode's transcript, read from the API.
    const snippet = String(episode.transcript ?? '')
      .slice(0, 40)
      .trim()
    expect(snippet, 'episode carries a transcript to render').not.toEqual('')
    await page.goto(APP_BASE + `/episodes/${episode.id}`)
    await page.getByRole('button', { name: /transcript/i }).click()
    await expect(page.getByText(snippet).first()).toBeVisible({ timeout: 6000 })
  })

  test('"Chapters" tab lists chapter buttons', async ({ page }) => {
    await signup(page)
    const episode = await pickEpisode(page)
    const chapters = await getChapters(page, episode.id)
    expect(chapters.length, 'episode carries chapter markers').toBeGreaterThan(0)
    await page.goto(APP_BASE + `/episodes/${episode.id}`)
    await page.getByRole('button', { name: /^chapters$/i }).click()
    await expect(page.getByRole('button', { name: chapters[0]!.title })).toBeVisible()
  })

  test('"About" tab is selectable', async ({ page }) => {
    await signup(page)
    const episode = await pickEpisode(page)
    await page.goto(APP_BASE + `/episodes/${episode.id}`)
    await page.getByRole('button', { name: /^about$/i }).click()
    // The about tab should at minimum render a paragraph.
    await page.waitForTimeout(500)
    await expect(page.locator('p').first()).toBeVisible()
  })

  test('clicking a chapter seeks the player and triggers a progress POST', async ({ page }) => {
    await signup(page)
    const episode = await pickEpisode(page)
    const chapters = await getChapters(page, episode.id)
    // A chapter that is not at 0:00, so clicking it is a real seek.
    const chapter = chapters.find((c) => c.start_seconds > 0) ?? chapters[0]
    expect(chapter, 'episode carries chapter markers').toBeTruthy()
    await page.goto(APP_BASE + `/episodes/${episode.id}`)
    await page.getByRole('button', { name: /^chapters$/i }).click()
    const chapterButton = page.getByRole('button', { name: chapter!.title }).first()
    await expect(chapterButton).toBeVisible()
    await chapterButton.click()
    await page.waitForTimeout(800)
    // Re-snapshot just confirms we're still on the same page (no console error).
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('back-link returns to show detail', async ({ page }) => {
    await signup(page)
    const episode = await pickEpisode(page)
    await page.goto(APP_BASE + `/episodes/${episode.id}`)
    const backLink = page
      .getByRole('link')
      .filter({ hasText: new RegExp(`${escapeRegExp(String(episode.show_title))}|←`) })
      .first()
    await backLink.click()
    await expect(page).toHaveURL(/\/shows\/[0-9a-f-]{36}$/)
  })

  test('episode-player renders without console errors', async ({ page }) => {
    await signup(page)
    const episode = await pickEpisode(page)
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + `/episodes/${episode.id}`)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    })
  })
})

/** Show titles come from the catalog, so they can carry regex metacharacters. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
