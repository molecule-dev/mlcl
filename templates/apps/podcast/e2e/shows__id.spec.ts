import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  captureNetwork,
  expectNoConsoleErrors,
  pickShow,
  pickUnsubscribedShow,
  signup,
} from './_helpers.js'

// The show under test is read from /api/shows in each test rather than named
// here — a hardcoded seeded id breaks the moment the demo catalog is replaced.

test.describe('show detail page (/shows/:id)', () => {
  test('renders show heading, publisher line and description', async ({ page }) => {
    await signup(page)
    const show = await pickShow(page)
    await page.goto(APP_BASE + `/shows/${show.id}`)
    await expect(page.getByRole('heading', { name: show.title, level: 1 })).toBeVisible()
    await expect(page.getByText(String(show.publisher ?? '')).first()).toBeVisible()
  })

  test('initial load fetches /api/shows/:id and /api/episodes', async ({ page }) => {
    await signup(page)
    const show = await pickShow(page)
    const requests = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/shows/${show.id}`)
      await page.waitForLoadState('networkidle')
    })
    expect(
      requests.some((r) => new RegExp(`/api/shows/${show.id}`).test(r.url) && r.status === 200),
    ).toBeTruthy()
    expect(requests.some((r) => /\/api\/episodes/.test(r.url) && r.status === 200)).toBeTruthy()
  })

  test('renders the episode list with at least one episode link', async ({ page }) => {
    await signup(page)
    const show = await pickShow(page)
    await page.goto(APP_BASE + `/shows/${show.id}`)
    await expect(page.locator('a[href^="/episodes/"]').first()).toBeVisible({ timeout: 8000 })
  })

  test('clicking an episode routes to the player at /episodes/:id', async ({ page }) => {
    await signup(page)
    const show = await pickShow(page)
    await page.goto(APP_BASE + `/shows/${show.id}`)
    const ep = page.locator('a[href^="/episodes/"]').first()
    await ep.click()
    await expect(page).toHaveURL(/\/episodes\/[0-9a-f-]{36}$/)
  })

  test('"Play latest" button is visible and clickable', async ({ page }) => {
    await signup(page)
    const show = await pickShow(page)
    await page.goto(APP_BASE + `/shows/${show.id}`)
    const play = page.getByRole('button', { name: /play.*latest/i }).first()
    await expect(play).toBeVisible()
  })

  test('subscribe/unsubscribe toggle issues POST/DELETE /api/subscriptions/:showId and persists', async ({
    page,
  }) => {
    await signup(page)
    // A show the listener is not subscribed to yet, so the first click is a
    // subscribe regardless of what the catalog/seed happens to hold.
    const show = await pickUnsubscribedShow(page)
    await page.goto(APP_BASE + `/shows/${show.id}`)
    const btn = page.getByRole('button', { name: /subscrib/i }).first()
    await expect(btn).toBeVisible()
    const before = (await btn.textContent()) ?? ''
    const requests = await captureNetwork(page, async () => {
      await btn.click()
      await page.waitForTimeout(1500)
    })
    expect(
      requests.some(
        (r) =>
          (r.method === 'POST' || r.method === 'DELETE') &&
          new RegExp(`/api/subscriptions/${show.id}`).test(r.url),
      ),
    ).toBeTruthy()
    // Reload and verify the subscription state persists.
    await page.reload()
    const after =
      (await page
        .getByRole('button', { name: /subscrib/i })
        .first()
        .textContent()) ?? ''
    expect(after).not.toEqual(before)
  })

  test('show-detail page renders without console errors', async ({ page }) => {
    await signup(page)
    const show = await pickShow(page)
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + `/shows/${show.id}`)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    })
  })
})
