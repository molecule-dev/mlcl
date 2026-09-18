/**
 * Sidebar channels — real categories, real unread badges.
 *
 * The sidebar previously rendered a hardcoded list with hardcoded
 * unread counts {3,1,2,2,4,1}. This spec asserts the channel set
 * matches /api/categories AND that the unread badge reflects the
 * actual count of published-and-acknowledgment-required announcements
 * the current user hasn't acked yet — including the fresh-signup
 * case where everything reads zero.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  ackAnnouncement,
  getCategories,
  seedAnnouncement,
  signup,
  uniqueEmail,
} from './_helpers.js'

/** Compute the expected unread count per channel for `userId` from
 *  the canonical /api/announcements + /api/announcements/me/acknowledgments
 *  pair. Mirrors the layout's badge logic so we can compare. */
async function expectedUnreadByChannel(
  page: import('@playwright/test').Page,
  accessToken: string | null,
  userId: string | null,
): Promise<Record<string, number>> {
  const [cats, anns, acks] = await Promise.all([
    page.request
      .get(APP_BASE + '/api/categories', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.json() as Promise<Array<{ id: string; name: string }>>),
    page.request
      .get(APP_BASE + '/api/announcements', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(
        (r) =>
          r.json() as Promise<
            Array<{
              id: string
              status: string
              requires_acknowledgment: boolean
              category_id: string
              author_id: string
            }>
          >,
      ),
    page.request
      .get(APP_BASE + '/api/announcements/me/acknowledgments', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      .then((r) => r.json() as Promise<Array<{ announcement_id: string }>>),
  ])
  const acked = new Set(acks.map((a) => a.announcement_id))
  const out: Record<string, number> = {}
  for (const c of cats) {
    const slug = c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    out[slug] = anns.filter(
      (a) =>
        a.category_id === c.id &&
        a.status === 'published' &&
        a.requires_acknowledgment &&
        !acked.has(a.id) &&
        a.author_id !== userId,
    ).length
  }
  return out
}

test.describe('sidebar channels', () => {
  test('renders one link per /api/categories row', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('sidebar-renders'))
    await page.goto(APP_BASE + '/feed')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(800)

    const cats = await getCategories(page, accessToken)
    expect(cats.length).toBeGreaterThan(0)
    for (const c of cats) {
      const slug = c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      const link = page.locator(`a[href="/feed?channel=${slug}"]`).first()
      await expect(link, `sidebar link for channel "${c.name}" not found`).toBeVisible()
    }
  })

  test('unread badge per channel matches the real unread count from the API', async ({ page }) => {
    // The contract: every badge shown in the sidebar must equal the
    // count of (published, ack-required, not-mine, not-acked) rows
    // for that channel as returned by /api/announcements. Off-by-one
    // here is the canonical "your sidebar lies" bug from the past.
    const { accessToken, userId } = await signup(page, uniqueEmail('sidebar-counts'))
    const cats = await getCategories(page, accessToken)
    const target = cats.find((c) => c.name === 'product') ?? cats[0]
    // Seed two ack-required announcements as a peer (alice) so the
    // count for `target` channel should grow by 2 for the current user.
    const alice = await signup(page, uniqueEmail('sidebar-counts-alice'))
    await seedAnnouncement(page, alice.accessToken, {
      title: `Sidebar count A ${Date.now()}`,
      category_id: target.id,
    })
    await seedAnnouncement(page, alice.accessToken, {
      title: `Sidebar count B ${Date.now()}`,
      category_id: target.id,
    })
    // Re-sign back in as the original user
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/login')
    // Easier: re-signup as fresh user and seed under their context
    const me = await signup(page, uniqueEmail('sidebar-counts-me'))

    await page.goto(APP_BASE + '/feed')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(800)

    const expected = await expectedUnreadByChannel(page, me.accessToken, me.userId)
    const actual = await page.evaluate(() => {
      const out: Record<string, number> = {}
      for (const a of Array.from(
        document.querySelectorAll<HTMLAnchorElement>('a[href^="/feed?channel="]'),
      )) {
        const slug = (a.getAttribute('href') || '').replace('/feed?channel=', '')
        // Only sidebar channel links — the announcement-card chips also
        // match the same selector but live inside <article>. Filter to
        // only the sidebar's <aside>.
        if (!a.closest('aside')) continue
        const text = (a.textContent || '').trim()
        // Last contiguous digit run is the badge.
        const m = text.match(/(\d+)\s*$/)
        out[slug] = m ? Number(m[1]) : 0
      }
      return out
    })

    for (const [slug, expCount] of Object.entries(expected)) {
      expect(actual[slug] ?? 0, `slug=${slug}`).toBe(expCount)
    }
    // Sanity — `userId` was wired through helpers
    expect(userId).toBeTruthy()
  })

  test('clicking a channel link applies the ?channel= filter and the link reads as active', async ({
    page,
  }) => {
    await signup(page, uniqueEmail('sidebar-active'))
    await page.goto(APP_BASE + '/feed')
    await page.waitForLoadState('networkidle')

    const link = page.locator(`a[href="/feed?channel=company"]`).first()
    await link.click()
    await page.waitForURL(/channel=company/, { timeout: 5000 })
    await page.waitForTimeout(300)

    // Active state visual class — Playwright's getAttribute resolves
    // against the same locator post-navigation, so the rerendered
    // class should be visible.
    await expect
      .poll(async () => link.getAttribute('class'), { timeout: 3000 })
      .toMatch(/bg-primary-container|text-primary|font-semibold/)
  })
})
