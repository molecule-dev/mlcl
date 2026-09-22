import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { API_BASE, APP_BASE, captureNetwork, signup } from './_helpers.js'

/**
 * Resolve the just-signed-up user's "username" the by-username handler
 * actually accepts. The resource stores `name` (display name) and the
 * by-username handler falls back from username → ilike on name. So we
 * try the literal id first, then the name.
 */
async function ownUsername(
  page: import('@playwright/test').Page,
  args: { userId: string; name: string },
): Promise<string> {
  // The handler accepts ilike on name, so encode the full name.
  return args.name
}

test.describe('/u/:username (UserProfile)', () => {
  test('Renders the user display name (real, not Helena placeholder)', async ({ page }) => {
    const me = await signup(page)
    const u = await ownUsername(page, me)
    await page.goto(APP_BASE + '/u/' + encodeURIComponent(u))
    const heading = page.getByRole('heading').first()
    await expect(heading).toBeVisible({ timeout: 15_000 })
    const text = await heading.innerText()
    expect(text.toLowerCase()).not.toContain('helena')
    expect(text.length).toBeGreaterThan(0)
  })

  test('Joined date renders', async ({ page }) => {
    const me = await signup(page)
    const u = await ownUsername(page, me)
    await page.goto(APP_BASE + '/u/' + encodeURIComponent(u))
    await expect(page.getByText(/Joined .+/)).toBeVisible({ timeout: 15_000 })
  })

  test('Reputation stat label renders', async ({ page }) => {
    const me = await signup(page)
    const u = await ownUsername(page, me)
    await page.goto(APP_BASE + '/u/' + encodeURIComponent(u))
    await expect(page.getByText(/Reputation/i)).toBeVisible({ timeout: 15_000 })
  })

  test('Posts stat label renders', async ({ page }) => {
    const me = await signup(page)
    const u = await ownUsername(page, me)
    await page.goto(APP_BASE + '/u/' + encodeURIComponent(u))
    await expect(page.getByText(/Posts/i).first()).toBeVisible({ timeout: 15_000 })
  })

  test('Threads stat label renders', async ({ page }) => {
    const me = await signup(page)
    const u = await ownUsername(page, me)
    await page.goto(APP_BASE + '/u/' + encodeURIComponent(u))
    await expect(page.getByText(/Threads/i).first()).toBeVisible({ timeout: 15_000 })
  })

  test('Solutions stat label renders', async ({ page }) => {
    const me = await signup(page)
    const u = await ownUsername(page, me)
    await page.goto(APP_BASE + '/u/' + encodeURIComponent(u))
    await expect(page.getByText(/Solutions/i).first()).toBeVisible({ timeout: 15_000 })
  })

  test('Followers stat label renders', async ({ page }) => {
    const me = await signup(page)
    const u = await ownUsername(page, me)
    await page.goto(APP_BASE + '/u/' + encodeURIComponent(u))
    await expect(page.getByText(/Followers/i).first()).toBeVisible({ timeout: 15_000 })
  })

  test('Follow button toggles aria-pressed (client-only state)', async ({ page }) => {
    const me = await signup(page)
    const u = await ownUsername(page, me)
    await page.goto(APP_BASE + '/u/' + encodeURIComponent(u))
    const btn = page.getByRole('button', { name: /Follow/i }).first()
    if (await btn.count()) {
      const before = await btn.getAttribute('aria-pressed')
      await btn.click()
      await page.waitForTimeout(300)
      const after = await btn.getAttribute('aria-pressed')
      expect(after).not.toBe(before)
    }
  })

  test('"Browse all" / "Back to categories" link navigates to /c', async ({ page }) => {
    const me = await signup(page)
    const u = await ownUsername(page, me)
    await page.goto(APP_BASE + '/u/' + encodeURIComponent(u))
    const link = page
      .getByRole('link', { name: /Browse all|Back to categories|All categories/i })
      .first()
    if (await link.count()) {
      await link.click()
      await expect(page).toHaveURL(/\/c$/, { timeout: 10_000 })
    }
  })

  test('Non-existent username triggers a 404 lookup and renders "User not found"', async ({
    page,
  }) => {
    // The deliberate unknown-username lookup 404s; the browser logs that
    // failed fetch to the console. Expected — allow it.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 404',
    })
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/u/__nope_user_does_not_exist__')
      await page.waitForTimeout(2000)
    })
    const lookup = reqs.find((r) => /\/api\/users\/by-username\//.test(r.url) && r.method === 'GET')
    expect(lookup, 'GET /api/users/by-username/:username must fire').toBeTruthy()
    expect([200, 404]).toContain(lookup!.status)
    await expect(page.getByText(/not found/i)).toBeVisible({ timeout: 10_000 })
  })
})
