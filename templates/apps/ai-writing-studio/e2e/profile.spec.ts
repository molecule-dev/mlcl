/**
 * /profile — public-ish profile view sourced from /api/profile.
 *
 * Real outcomes: GET returns 200 with the expected shape; each stat tile
 * + the published-works empty-state render correctly for a fresh user.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedGet, authedPost, authedPut, captureNetwork, signup } from './_helpers.js'

interface ProfilePayload {
  name: string
  email: string
  stats: { published: number; drafts: number; total: number }
  published: any[]
}

test.describe('/profile', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
  })

  test('GET /api/profile returns 200 on initial render', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/profile')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    })
    const req = reqs.find((r) => /\/api\/profile(\?|$)/.test(r.url) && r.method === 'GET')
    expect(req?.status).toBe(200)
  })

  test('writer-name h1 reflects the signed-up user', async ({ page }) => {
    await page.goto(APP_BASE + '/profile')
    const h1 = page.getByRole('heading', { level: 1 })
    await expect(h1).toBeVisible()
    await expect(h1).toContainText(/Plume/)
  })

  test('Published stat tile renders', async ({ page }) => {
    await page.goto(APP_BASE + '/profile')
    // The empty-state in the published-works section uses a
    // material-symbols span with aria-hidden text "drafts". Use
    // <p>-role text-tile labels so we don't collide with that icon.
    await expect(
      page
        .getByRole('paragraph')
        .filter({ hasText: /^Published$/i })
        .first(),
    ).toBeVisible()
  })

  test('Drafts stat tile renders', async ({ page }) => {
    await page.goto(APP_BASE + '/profile')
    await expect(
      page
        .getByRole('paragraph')
        .filter({ hasText: /^Drafts$/i })
        .first(),
    ).toBeVisible()
  })

  test('Total stat tile renders', async ({ page }) => {
    await page.goto(APP_BASE + '/profile')
    await expect(
      page
        .getByRole('paragraph')
        .filter({ hasText: /^Total$/i })
        .first(),
    ).toBeVisible()
  })

  test('Published works section renders', async ({ page }) => {
    await page.goto(APP_BASE + '/profile')
    await expect(page.getByRole('heading', { name: /Published works/i, level: 2 })).toBeVisible()
  })

  test('Empty-state copy renders for a fresh user', async ({ page }) => {
    await page.goto(APP_BASE + '/profile')
    await expect(page.getByText(/No published documents yet/i)).toBeVisible()
  })

  test('Publishing a document increments stats.published on the next /api/profile read', async ({
    page,
  }) => {
    const created = await authedPost<{ id: string }>(page, '/documents', {
      title: 'Going Live',
      content: 'Publish me, please.',
      status: 'draft',
      tags: [],
      outline: [],
    })
    await authedPut(page, `/documents/${created.id}`, {
      status: 'published',
      content: 'Publish me, please.',
    })
    const after = await authedGet<ProfilePayload>(page, '/profile')
    expect(
      after.stats.published,
      'published stat must increment after publishing a doc',
    ).toBeGreaterThan(0)
  })
})
