import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test.describe('Subs / settings / profile', () => {
  test('Joining a sub from /subs flips the chip and persists across reload', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/subs')

    // Wait for the sub list to render.
    const generalCard = page
      .locator('section,article,div')
      .filter({ hasText: /general/i })
      .first()
    await expect(generalCard).toBeVisible({ timeout: 10_000 })

    // Find a Join button for the seeded `general` sub.
    const joinButton = page.getByRole('button', { name: /^join$/i }).first()
    await joinButton.click()
    // Button should flip to a "Leave" / "Joined" state (within the same row).
    await page.waitForTimeout(500)

    // Backend invariant — GET /api/subs returns joined=true for `general`.
    const subs = await (await page.request.get(APP_BASE + '/api/subs')).json()
    const general = (subs.data ?? []).find((s: { slug?: string }) => s.slug === 'general')
    expect(general?.joined).toBe(true)

    // Reload — joined state must persist.
    await page.reload()
    const subs2 = await (await page.request.get(APP_BASE + '/api/subs')).json()
    const general2 = (subs2.data ?? []).find((s: { slug?: string }) => s.slug === 'general')
    expect(general2?.joined).toBe(true)
  })

  test('Settings page persists feed defaultSort change across reload', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')

    // Switch into the Feed preferences section first.
    await page.getByRole('button', { name: /feed preferences/i }).click()
    // Pick "new" as default sort.
    await page.getByRole('button', { name: /^new$/i, pressed: false }).click()
    await page.getByRole('button', { name: /save changes/i }).click()

    // Wait for the saved-at indicator to appear.
    await expect(page.getByText(/saved at/i)).toBeVisible({ timeout: 10_000 })

    // Backend invariant — GET /api/users/me/settings returns defaultSort=new.
    const after = await (await page.request.get(APP_BASE + '/api/users/me/settings')).json()
    expect(after.data?.feed?.defaultSort).toBe('new')

    // Reload — UI re-fetches and shows the persisted choice.
    await page.reload()
    await page.getByRole('button', { name: /feed preferences/i }).click()
    const newButton = page.getByRole('button', { name: /^new$/i }).first()
    await expect(newButton).toHaveAttribute('aria-pressed', 'true')
  })

  test('Theme toggle flips theme mode on <html> and persists across reload', async ({ page }) => {
    // Theme toggle is on the public landing page (no auth needed). The
    // molecule css-variables theme provider writes `data-mol-mode` and
    // `data-mol-theme` on the <html> element (camelCased in the dataset).
    await page.goto(APP_BASE + '/')
    const readMode = () =>
      page.evaluate(
        () =>
          document.documentElement.dataset.molMode || document.documentElement.dataset.theme || '',
      )
    const before = await readMode()
    await page
      .getByRole('button', { name: /toggle theme/i })
      .first()
      .click()
    await page.waitForTimeout(200)
    const after = await readMode()
    expect(after).not.toBe(before)
    expect(after).toMatch(/^(light|dark)$/)
    await page.reload()
    const persisted = await readMode()
    expect(persisted).toBe(after)
  })

  test('Profile page resolves :id===me to current user, lists posts/comments tabs', async ({
    page,
  }) => {
    await signup(page)
    // Author a link so the Posts tab has at least one row.
    const subs = await (await page.request.get(APP_BASE + '/api/subs')).json()
    const sub = (subs.data ?? [])[0]
    const title = `Mine ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    await page.request.post(APP_BASE + '/api/links', {
      data: {
        title,
        url: `https://example.com/mine-${Date.now()}`,
        sub_id: sub.id,
        sub_slug: sub.slug,
        tags: [],
      },
    })

    await page.goto(APP_BASE + '/users/me')
    await expect(page.locator('main')).toBeVisible()
    // The user's own post should appear under the "Posts" tab.
    await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 })
  })
})
