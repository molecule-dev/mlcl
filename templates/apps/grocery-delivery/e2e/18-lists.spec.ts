import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, gotoAndWait, signup } from './_helpers'

// /lists — authenticated. Loads /api/lists which returns
// { lists, staples, smart_reorder_due }. Create-list form, add-all CTA,
// and per-item Add CTA in the smart reorder sidebar.

test.describe('/lists', () => {
  test('redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto(APP_BASE + '/lists')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('loads lists data from /api/lists', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await gotoAndWait(
        page,
        APP_BASE + '/lists',
        (r) => r.url().includes('/api/lists') && r.status() === 200,
      )
    })
    const get = reqs.find((r) => r.method === 'GET' && /\/api\/lists(\?|$|\/$)/.test(r.url))
    expect(get).toBeDefined()
    expect(get!.status).toBe(200)
  })

  test('"New list" toggles a creation form', async ({ page }) => {
    await signup(page)
    await gotoAndWait(page, APP_BASE + '/lists', (r) => /\/api\/lists/.test(r.url()))
    await page.locator('[data-test="lists-new-cta"]').click()
    await expect(page.locator('[data-test="lists-name-input"]')).toBeVisible()
  })

  test('creating a list calls POST /api/lists and shows the new list in the grid', async ({
    page,
  }) => {
    await signup(page)
    await gotoAndWait(page, APP_BASE + '/lists', (r) => /\/api\/lists/.test(r.url()))
    await page.locator('[data-test="lists-new-cta"]').click()
    await expect(page.locator('[data-test="lists-name-input"]')).toBeVisible()
    await page.locator('[data-test="lists-name-input"]').fill('Weekly staples')
    // Wait for the submit button to become enabled (handler gates on
    // trimmed-name length and !creating).
    const submit = page.locator('[data-test="lists-create-submit"]')
    await expect(submit).toBeEnabled()

    // Arm the POST response waiter BEFORE clicking — clicking first and
    // then awaiting allows the request to complete before the listener is
    // attached, which is the previous flake mode (10s timeout).
    const postResp = page.waitForResponse(
      (r) => r.request().method() === 'POST' && /\/api\/lists(\b|\/$)/.test(r.url()),
      { timeout: 15_000 },
    )
    await submit.click()
    const resp = await postResp
    expect(resp.status()).toBeLessThan(300)

    // Read-after-write: the new list appears in the grid. The auto-retrying
    // assertion handles the post-create reload() round-trip.
    await expect(
      page.locator('[data-test="list-card"]', { hasText: 'Weekly staples' }),
    ).toBeVisible({ timeout: 15_000 })
  })

  test('list creation persists across reload', async ({ page }) => {
    await signup(page)
    await gotoAndWait(page, APP_BASE + '/lists', (r) => /\/api\/lists/.test(r.url()))
    await page.locator('[data-test="lists-new-cta"]').click()
    await expect(page.locator('[data-test="lists-name-input"]')).toBeVisible()
    await page.locator('[data-test="lists-name-input"]').fill('Persistent list')
    const submit = page.locator('[data-test="lists-create-submit"]')
    await expect(submit).toBeEnabled()

    // Arm the response listener before the click to avoid a race where the
    // POST completes before the listener attaches.
    const postResp = page.waitForResponse(
      (r) => r.request().method() === 'POST' && /\/api\/lists(\b|\/$)/.test(r.url()),
      { timeout: 15_000 },
    )
    await submit.click()
    await postResp
    // Wait until the new row is visible (so we know the post-create reload()
    // resolved) before we trigger a navigation reload.
    await expect(
      page.locator('[data-test="list-card"]', { hasText: 'Persistent list' }),
    ).toBeVisible({ timeout: 15_000 })

    // Arm the listener BEFORE the reload — the reload's data fetch can
    // complete before a post-reload waitForResponse arms.
    const reloadP = page.waitForResponse(
      (r) => /\/api\/lists/.test(r.url()) && r.request().method() === 'GET',
      { timeout: 15_000 },
    )
    await page.reload()
    await reloadP
    await expect(
      page.locator('[data-test="list-card"]', { hasText: 'Persistent list' }),
    ).toBeVisible({ timeout: 15_000 })
  })

  test('empty state renders when no lists exist and offers Create your first list CTA', async ({
    page,
  }) => {
    await signup(page)
    await gotoAndWait(page, APP_BASE + '/lists', (r) => /\/api\/lists/.test(r.url()))
    // Fresh user has no lists yet → empty state visible. (After we create
    // one in earlier tests it disappears, but each test gets a fresh
    // signup.)
    await expect(page.getByText(/no saved lists yet/i)).toBeVisible({ timeout: 5_000 })
    await page.getByRole('button', { name: /create your first list/i }).click()
    await expect(page.locator('[data-test="lists-name-input"]')).toBeVisible()
  })
})
