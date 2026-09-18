import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test.describe('Feed → link detail → vote / comment / save', () => {
  // Posting through the API directly so the test can assert on the user
  // *interaction* with that link rather than re-driving the submit form.
  async function seedLink(page: import('@playwright/test').Page) {
    const subs = await (await page.request.get(APP_BASE + '/api/subs')).json()
    const sub = (subs.data ?? [])[0]
    expect(sub, 'seed sub must exist').toBeDefined()
    const title = `Seed ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const url = `https://example.com/seed-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const create = await page.request.post(APP_BASE + '/api/links', {
      data: { title, url, sub_id: sub.id, sub_slug: sub.slug, tags: [] },
    })
    expect(create.ok(), 'seed link must POST 2xx').toBeTruthy()
    const link = await create.json()
    return { link, sub }
  }

  test('Feed renders the freshly-submitted link; clicking comments link opens its detail page', async ({
    page,
  }) => {
    await signup(page)
    const { link } = await seedLink(page)

    await page.goto(APP_BASE + '/feed')
    // Sort by new so the most-recent submission ranks first regardless of votes.
    await page.getByRole('button', { name: /^new$/i }).click()
    await expect(page.getByText(link.title)).toBeVisible()

    // Title is an external link; the "comments" affordance is what opens
    // the discussion page (standard reddit-like UX).
    const card = page.getByRole('article').filter({ hasText: link.title }).first()
    await card
      .getByRole('link', { name: /comments?/i })
      .first()
      .click()
    await expect(page).toHaveURL(new RegExp(`/links/${link.id}`))
    await expect(page.getByRole('heading', { name: link.title })).toBeVisible()
  })

  test('Comment posted on /links/:id appears in the thread + bumps comment_count', async ({
    page,
  }) => {
    await signup(page)
    const { link } = await seedLink(page)

    await page.goto(APP_BASE + `/links/${link.id}`)
    const beforeRes = await page.request.get(APP_BASE + `/api/links/${link.id}`)
    const before = await beforeRes.json()
    const beforeCount = Number(before.comment_count ?? 0)

    const body = `e2e-comment-${Date.now()}`
    // Find the comment composer textarea + submit button. Use accessible-name
    // hints rather than CSS selectors.
    const composer = page.getByRole('textbox', { name: /comment|reply|leave|say/i }).first()
    await composer.waitFor({ state: 'visible', timeout: 10_000 })
    await composer.fill(body)
    const send = page.getByRole('button', { name: /post|comment|reply|send|submit/i }).first()
    await send.click()

    // Backend invariant — the comment must show up via the public list.
    await page.waitForTimeout(800)
    const listRes = await page.request.get(APP_BASE + `/api/comments/by-link/${link.id}`)
    expect(listRes.ok()).toBeTruthy()
    const list = await listRes.json()
    const found = (list.data ?? []).find((c: { body?: string }) => c.body === body)
    expect(found, 'posted comment must appear in /api/comments/by-link').toBeDefined()

    // And the link's denormalised comment_count must have incremented.
    const afterRes = await page.request.get(APP_BASE + `/api/links/${link.id}`)
    const after = await afterRes.json()
    expect(Number(after.comment_count ?? 0)).toBeGreaterThan(beforeCount)

    // The comment body should also be visible on-page (UI re-fetched).
    await expect(page.getByText(body)).toBeVisible()
  })

  test('Save button toggles a bookmark; row appears on /saved + persists across reload', async ({
    page,
  }) => {
    await signup(page)
    const { link } = await seedLink(page)

    await page.goto(APP_BASE + '/feed?sort=new')
    const card = page.getByRole('article').filter({ hasText: link.title }).first()
    // The save button has accessible name including "save" / "saved" / "bookmark".
    const save = card.getByRole('button', { name: /save|bookmark/i }).first()
    await save.click()

    // Backend invariant — bookmarks list must contain this link.
    await page.waitForTimeout(500)
    const bmRes = await page.request.get(APP_BASE + '/api/bookmarks')
    const bm = await bmRes.json()
    const found = (bm.data ?? []).find((row: { id?: string }) => row.id === link.id)
    expect(found, 'saved link must appear in /api/bookmarks').toBeDefined()

    // /saved page should show it
    await page.goto(APP_BASE + '/saved')
    await expect(page.getByText(link.title)).toBeVisible({ timeout: 10_000 })

    // Persists across reload.
    await page.reload()
    await expect(page.getByText(link.title)).toBeVisible({ timeout: 10_000 })
  })

  test('Upvoting a link increases its points (read-back from /api/links/:id)', async ({
    page,
    browser,
  }) => {
    // Need two sessions: one to author the link, one to vote (your own
    // submissions are auto-upvoted, so a same-user upvote toggles back to 0).
    const author = await browser.newContext()
    const authorPage = await author.newPage()
    await signup(authorPage)
    const { link } = await seedLink(authorPage)
    await author.close()

    await signup(page)
    await page.goto(APP_BASE + '/feed?sort=new')
    const card = page.getByRole('article').filter({ hasText: link.title }).first()
    await expect(card).toBeVisible({ timeout: 10_000 })
    // Find the up-arrow vote button by accessible label.
    const upBtn = card.getByRole('button', { name: /up\s*vote|upvote|^up$|arrow_upward/i }).first()
    await upBtn.click()

    await page.waitForTimeout(400)
    const after = await (await page.request.get(APP_BASE + `/api/links/${link.id}`)).json()
    expect(Number(after.points ?? 0)).toBe(2)
  })
})
